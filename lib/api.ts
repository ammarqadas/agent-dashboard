// All API calls go through the same-origin Next.js proxy (/api/proxy).
// The browser never holds credentials: the session lives in an HttpOnly
// cookie managed by the server; this client only handles the CSRF token.

const API_BASE_URL = '/api/proxy'
const REQUEST_TIMEOUT_MS = 30_000
// Identity upload validates and re-encodes two images upstream; give it
// more headroom than the default request window.
const IDENTITY_UPLOAD_TIMEOUT_MS = 95_000
const CSRF_COOKIE = 'agent_csrf'
const CSRF_HEADER = 'X-CSRF-Token'

type ApiRequestInit = RequestInit & {
  redirectOnUnauthorized?: boolean
  timeoutMs?: number
}

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  [key: string]: any
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const readCsrfToken = (): string | null => {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

// Migration hygiene: remove credentials previously kept in localStorage.
const clearLegacyStorage = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('agentToken')
  localStorage.removeItem('isAuthenticated')
  localStorage.removeItem('agentUser')
}

let redirectingToLogin = false
const redirectToLogin = () => {
  if (typeof window === 'undefined' || redirectingToLogin) return
  redirectingToLogin = true
  window.location.replace('/')
}

const encodeId = (id: string | number): string => encodeURIComponent(String(id))

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: ApiRequestInit = {}
  ): Promise<ApiResponse<T>> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    // Defense-in-depth: reject traversal and absolute-URL injection.
    if (cleanEndpoint.includes('..') || /^[a-z][a-z0-9+.-]*:/i.test(cleanEndpoint)) {
      return { success: false, message: 'Invalid request endpoint.' }
    }
    const url = `${API_BASE_URL}${cleanEndpoint}`

    const {
      redirectOnUnauthorized = true,
      timeoutMs = REQUEST_TIMEOUT_MS,
      ...requestOptions
    } = options
    const method = (requestOptions.method || 'GET').toUpperCase()
    const headers = new Headers(requestOptions.headers)
    const isFormData =
      typeof FormData !== 'undefined' && requestOptions.body instanceof FormData
    if (!isFormData && requestOptions.body != null && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    if (UNSAFE_METHODS.has(method)) {
      const csrf = readCsrfToken()
      if (csrf) headers.set(CSRF_HEADER, csrf)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const externalSignal = requestOptions.signal
    const onExternalAbort = () => controller.abort()
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort()
      else externalSignal.addEventListener('abort', onExternalAbort)
    }

    try {
      const response = await fetch(url, {
        ...requestOptions,
        method,
        headers,
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
      })

      // 401: session expired/invalid → clear state and redirect once.
      if (response.status === 401 && redirectOnUnauthorized) {
        clearLegacyStorage()
        if (typeof window !== 'undefined' && window.location.pathname !== '/') {
          redirectToLogin()
        }
        return { success: false, message: 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.' }
      }
      // 403: permission denied — keep the session, surface the message only.
      if (response.status === 403) {
        const data = await response.json().catch(() => ({}))
        return { success: false, message: data?.message || 'ليس لديك صلاحية للقيام بهذا الإجراء.' }
      }
      if (response.status === 413) {
        return { success: false, message: 'حجم البيانات المرسلة كبير جداً.' }
      }
      if (response.status === 429) {
        return { success: false, message: 'عدد كبير من المحاولات. يرجى المحاولة لاحقاً.' }
      }

      const contentType = response.headers.get('content-type') || ''
      let data: any = {}
      if (response.status !== 204 && response.status !== 304) {
        if (contentType.includes('application/json')) {
          data = await response.json().catch(() => ({}))
        } else {
          await response.text().catch(() => '')
        }
      }

      if (!response.ok) {
        return {
          ...data,
          success: false,
          message: data?.message || `HTTP error! status: ${response.status}`,
        }
      }

      return { success: true, ...data }
    } catch {
      // Never expose raw exception details (may contain internal URLs).
      return controller.signal.aborted
        ? {
            success: false,
            code: 'CLIENT_TIMEOUT',
            message: 'انتهت مهلة انتظار الخادم. قد تكون العملية ما زالت قيد التنفيذ.',
          }
        : { success: false, message: 'تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.' }
    } finally {
      clearTimeout(timer)
      externalSignal?.removeEventListener('abort', onExternalAbort)
    }
  }

  // ---- Session management (server-managed HttpOnly cookie) ----

  async getSession(): Promise<{ authenticated: boolean; expiresAt?: number }> {
    if (typeof window === 'undefined') return { authenticated: false }
    try {
      const res = await fetch('/api/auth/session', {
        credentials: 'same-origin',
        cache: 'no-store',
      })
      if (!res.ok) return { authenticated: false }
      return await res.json()
    } catch {
      return { authenticated: false }
    }
  }

  async logout() {
    if (typeof window !== 'undefined') {
      try {
        const csrf = readCsrfToken()
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: csrf ? { [CSRF_HEADER]: csrf } : undefined,
        })
      } catch {
        // Ignore — local state is cleared regardless.
      }
      sessionStorage.removeItem('agentUser')
      clearLegacyStorage()
    }
    return { success: true as const }
  }

  // ---- Agent authentication ----

  async agentLogin(email: string, password: string) {
    const response = await this.request<{ user?: any }>('/agent/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    // The HttpOnly session cookie is set by the server. Only non-sensitive
    // display info is kept locally.
    if (response.success && typeof window !== 'undefined') {
      const user = response.user || response.data
      if (user) {
        try {
          sessionStorage.setItem('agentUser', JSON.stringify(user))
        } catch {
          // Non-fatal: display name falls back to default.
        }
      }
      clearLegacyStorage()
    }

    return response
  }

  // Create wallet (agent)
  async createWallet(data: { name: string; mobile: string; password?: string; address?: string }) {
    return this.request('/agent/create-wallet', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Wallet search by mobile
  async searchWalletByMobile(mobile: string) {
    return this.request(`/agent/wallet-search?mobile=${encodeURIComponent(mobile)}`)
  }

  // Get wallet details
  async getWallet(id: string | number, depth: number = 2) {
    const d = Math.min(5, Math.max(0, Math.floor(Number(depth) || 0)))
    return this.request(`/wallets/${encodeId(id)}?depth=${d}`)
  }

  // Activate/deactivate wallet
  async updateWallet(id: string | number, data: { active?: boolean;[key: string]: any }) {
    return this.request(`/wallets/${encodeId(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // Deposit to wallet
  async depositToWallet(
    mobile: string,
    amount: number,
    currency: string | number,
    notes?: string,
    quote?: { commission: number; totalAmount: number; searchToken: string }
  ) {
    return this.request('/action/execute-generic', {
      method: 'POST',
      body: JSON.stringify({
        actionKey: 'agent_deposit',
        payload: {
          mobile,
          amount,
          currency,
          notes,
          ...(quote
            ? {
                commission: quote.commission,
                totalAmount: quote.totalAmount,
                searchToken: quote.searchToken,
              }
            : {}),
        },
      }),
    })
  }

  // Deposit pre-submit: wallet lookup confirmation + server commission quote
  async agentDepositPresubmit(payload: {
    mobile: string
    amount: number
    currency: string | number
  }) {
    return this.request('/presubmit/execute', {
      method: 'POST',
      body: JSON.stringify({
        actionKey: 'agent_deposit',
        payload,
      }),
    })
  }

  // Cashout codes
  async searchCashoutCode(code: string) {
    return this.request(`/cashout-codes/search?code=${encodeURIComponent(code)}`)
  }

  async payCashoutCodeGeneric(code: string, notes?: string) {
    return this.request('/action/execute-generic', {
      method: 'POST',
      body: JSON.stringify({
        actionKey: 'agent_cashout_code_pay',
        code,
        notes,
      }),
    })
  }

  async createCashoutCodeGeneric(data: { mobile: string; amount: number; currency: string | number }) {
    return this.request('/action/execute-generic', {
      method: 'POST',
      body: JSON.stringify({
        actionKey: 'agent_cashout_code_create',
        mobile: data.mobile,
        amount: data.amount,
        currency: data.currency,
      }),
    })
  }

  async listCashoutCodes(status?: string, page = 1, limit = 50) {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    params.append('page', page.toString())
    params.append('limit', limit.toString())
    const endpoint = `/cashout-codes/agent-list?${params.toString()}`
    // Use agent-list endpoint for agents (authenticated as users collection)
    return this.request(endpoint)
  }

  // Agent Bulk Deposit
  async agentBulkDeposit(deposits: { mobile: string; amount: number; currency: string | number; notes?: string }[]) {
    return this.request('/agent/deposit', {
      method: 'POST',
      body: JSON.stringify({ deposits }),
    })
  }

  // Search Remittance — POST /agent/remittance/search
  async agentRemittanceSearch(networkKey: string, remittanceId: string) {
    return this.request('/agent/remittance/search', {
      method: 'POST',
      body: JSON.stringify({ networkKey, inputRemittanceId: remittanceId }),
    })
  }

  // Commission (preSubmit) — POST /api/presubmit/execute
  async agentRemittanceCommission(data: {
    amount: number
    networkKey: string
    currencyCode: string
  }) {
    return this.request('/presubmit/execute', {
      method: 'POST',
      body: JSON.stringify({ configType: 'preSubmit', ...data }),
    })
  }

  // Send Remittance — POST /api/agent/action/execute-generic
  async agentRemittanceSend(networkKey: string, payload: {
    senderName: string
    senderMobile: string
    receiverName: string
    receiverMobile: string
    amount: number
    currency: string | number
    notes?: string
    commission?: number
    totalAmount?: number
    searchToken?: string
  }) {
    return this.request('/agent/action/execute-generic', {
      method: 'POST',
      body: JSON.stringify({ networkKey, configType: 'send', ...payload }),
    })
  }

  // Identity upload — POST /agent/remittance/identity/upload (multipart/form-data)
  // One request carries identity metadata + front/back images.
  // The backend stores images internally and returns only a payout
  // authorization token — storage URLs never reach the browser.
  async agentRemittanceIdentityUpload(args: {
    searchToken: string
    type: 'national' | 'passport'
    idNumber: string
    issueDate: string
    expiryDate: string
    issuePlace: string
    front: File
    back: File
  }) {
    const fd = new FormData()
    fd.set('searchToken', args.searchToken)
    fd.set('type', args.type)
    fd.set('idNumber', args.idNumber)
    fd.set('issueDate', args.issueDate)
    fd.set('expiryDate', args.expiryDate)
    fd.set('issuePlace', args.issuePlace)
    fd.set('front', args.front)
    fd.set('back', args.back)

    // IMPORTANT: don't set Content-Type; browser will set multipart boundary
    // Completion re-encodes both images server-side, so allow a longer window.
    return this.request('/agent/remittance/identity/upload', {
      method: 'POST',
      body: fd,
      headers: {}, // avoid JSON content-type
      timeoutMs: IDENTITY_UPLOAD_TIMEOUT_MS,
    })
  }

  async agentRemittanceIdentityOtpSend(searchToken: string, candidateToken: string) {
    return this.request<{
      destinationMasked: string
      expiresInSeconds: number
      resendAfterSeconds: number
    }>('/agent/remittance/identity/otp/send', {
      method: 'POST',
      body: JSON.stringify({ searchToken, candidateToken }),
      redirectOnUnauthorized: false,
    })
  }

  async agentRemittanceIdentityOtpVerify(searchToken: string, otp: string) {
    return this.request<{ identityAuthorizationToken: string; nextAction: 'pay' }>(
      '/agent/remittance/identity/otp/verify',
      {
        method: 'POST',
        body: JSON.stringify({ searchToken, otp }),
        redirectOnUnauthorized: false,
      }
    )
  }

  // Pay Remittance — POST /agent/action/execute-generic (JSON, no images)
  // Requires an Idempotency-Key; the same key must be reused for retries of
  // the same payout (the authorization token is consumed on first attempt).
  async agentRemittancePay(
    networkKey: string,
    payload: {
      searchToken: string
      inputRemittanceId: string
      identityAuthorizationToken: string
    },
    idempotencyKey: string
  ) {
    return this.request('/agent/action/execute-generic', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ networkKey, configType: 'pay', ...payload }),
      timeoutMs: 80_000,
    })
  }

  // Agent Bulk Remittance
  async agentBulkRemittance(data: {
    senderName: string
    senderMobile: string
    currency: string | number
    distWallet: string | number
    remittances: {
      amount: number
      receiverName: string
      receiverMobile: string
    }[]
    notes?: string
    commission?: number
  }) {
    return this.request('/agent/bulk-remittance', {
      method: 'POST',
      body: JSON.stringify({ payload: data }),
    })
  }

  // Transactions
  async getWalletTransactions(walletId: string | number) {
    return this.request(`/wallets/${encodeId(walletId)}/transactions`)
  }

  async getTransactions(filters?: {
    page?: number
    limit?: number
    sort?: string
    currencyId?: string | number
    from?: string
    to?: string
    operation?: string
  }) {
    const params = new URLSearchParams()
    if (filters?.page) params.append('page', String(filters.page))
    if (filters?.limit) params.append('limit', String(filters.limit))
    if (filters?.sort) params.append('sort', filters.sort)
    if (filters?.currencyId != null && String(filters.currencyId) !== '')
      params.append('currencyId', String(filters.currencyId))
    if (filters?.from) params.append('from', filters.from)
    if (filters?.to) params.append('to', filters.to)
    if (filters?.operation) params.append('operation', filters.operation)
    const qs = params.toString()
    return this.request(`/agent/transactions${qs ? `?${qs}` : ''}`)
  }

  // Agent account
  async getAgentAccount() {
    return this.request('/accounts?owner=agent')
  }

  // Get currencies
  async getCurrencies() {
    return this.request('/currencies')
  }

  // Get distribution wallets (system wallets for transfer network)
  async getDistWallets() {
    const response = await this.request('/agent/dist-wallets')
    if (response.success && response.networks && !response.docs) {
      response.docs = response.networks
    }
    return response
  }

  // Get account by ID
  async getAccount(accountId: string | number) {
    return this.request(`/accounts/${encodeId(accountId)}`)
  }

  // Agent: upsert wallet identity (multipart/form-data)
  async agentUpsertWalletIdentity(args: {
    walletId: string | number
    fullName?: string
    idNumber?: string
    type?: 'national' | 'passport'
    expdate?: string
    idImageFront?: File | null
    idImageBack?: File | null
    idImageSelfi?: File | null
  }) {
    const fd = new FormData()
    fd.set('walletId', String(args.walletId))
    if (args.fullName) fd.set('fullName', args.fullName)
    if (args.idNumber) fd.set('idNumber', args.idNumber)
    if (args.type) fd.set('type', args.type)
    if (args.expdate) fd.set('expdate', args.expdate)
    if (args.idImageFront) fd.set('idImageFront', args.idImageFront)
    if (args.idImageBack) fd.set('idImageBack', args.idImageBack)
    if (args.idImageSelfi) fd.set('idImageSelfi', args.idImageSelfi)

    // IMPORTANT: don't set Content-Type; browser will set multipart boundary
    return this.request('/wallet-cards/with-upload', {
      method: 'POST',
      body: fd,
      headers: {}, // avoid JSON content-type
    })
  }
}

export const apiClient = new ApiClient()
