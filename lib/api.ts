// Use Next.js API proxy to avoid CORS issues.
// IMPORTANT: even if NEXT_PUBLIC_API_URL is set to a full backend URL (cross-origin),
// we will automatically fall back to same-origin '/api/proxy' to prevent browser CORS failures.
const DEFAULT_PROXY_BASE = '/api/proxy'

const resolveApiBaseUrl = (): string => {
  const env = process.env.NEXT_PUBLIC_API_URL
  if (!env) return DEFAULT_PROXY_BASE

  // On the server, relative URLs are safest and always work.
  if (typeof window === 'undefined') return env.startsWith('/') ? env : DEFAULT_PROXY_BASE

  // In the browser, if env is absolute and points to a different origin, force proxy.
  try {
    if (/^https?:\/\//i.test(env)) {
      const u = new URL(env)
      if (u.origin !== window.location.origin) return DEFAULT_PROXY_BASE
    }
  } catch {
    // If parsing fails, fall back to proxy.
    return DEFAULT_PROXY_BASE
  }

  return env
}

const API_BASE_URL = resolveApiBaseUrl()

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  [key: string]: any
}

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    if (typeof window !== 'undefined') {
      // #region agent log
      const storedToken = localStorage.getItem('agentToken')
      fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:43',message:'ApiClient constructor - token loaded',data:{hasToken:!!storedToken,tokenLength:storedToken?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      this.token = storedToken
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      // #region agent log
      localStorage.setItem('agentToken', token)
      fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:50',message:'setToken called - token saved',data:{tokenLength:token.length,tokenPrefix:token.substring(0,10)+'...'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('agentToken')
    }
  }

  // Reload token from localStorage (useful when token might have been updated)
  private reloadToken() {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('agentToken')
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:reloadToken',message:'Reloading token from localStorage',data:{hadToken:!!this.token,hasStoredToken:!!storedToken,tokenChanged:this.token!==storedToken},timestamp:Date.now(),sessionId:'debug-session',runId:'token-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      this.token = storedToken
    }
  }

  // Handle 403/401 responses by clearing token and redirecting
  private handleAuthError() {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:handleAuthError',message:'Handling authentication error',data:{hadToken:!!this.token},timestamp:Date.now(),sessionId:'debug-session',runId:'token-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    this.clearToken()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('agentUser')
      // Redirect to login page
      window.location.href = '/'
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Reload token from localStorage before each request to ensure we have the latest token
    this.reloadToken()
    
    // Ensure endpoint starts with / if baseUrl doesn't end with /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const url = `${this.baseUrl}${cleanEndpoint}`
    
    // Debug: log the URL being called (remove in production)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('[API Client] Requesting:', url)
    }
    
    const headers = new Headers(options.headers)
    // Ensure JSON by default, but never force it for FormData (multipart)
    const isFormData =
      typeof FormData !== 'undefined' && options.body instanceof FormData
    if (!isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    if (this.token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.token}`)
    }

    // #region agent log
    const hasAuthHeader = headers.has('Authorization')
    const tokenInInstance = !!this.token
    const tokenInStorage = typeof window !== 'undefined' ? !!localStorage.getItem('agentToken') : false
    const tokenValue = this.token ? `${this.token.substring(0, 10)}...` : null
    fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:request',message:'Request about to be sent',data:{endpoint,hasAuthHeader,tokenInInstance,tokenInStorage,tokenPrefix:tokenValue,method:options.method||'GET'},timestamp:Date.now(),sessionId:'debug-session',runId:'token-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:request',message:'Response received',data:{endpoint,status:response.status,statusText:response.statusText,hasAuthHeader},timestamp:Date.now(),sessionId:'debug-session',runId:'token-fix',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      // Handle 401/403 authentication errors
      if (response.status === 401 || response.status === 403) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:request',message:'Received 401/403 - handling auth error',data:{endpoint,status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'token-fix',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        this.handleAuthError()
        const data = await response.json().catch(() => ({}))
        return {
          success: false,
          message: data.message || 'Authentication failed. Please login again.',
        }
      }

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          message: data.message || `HTTP error! status: ${response.status}`,
        }
      }

      return {
        success: true,
        ...data,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
      }
    }
  }

  // Agent authentication
  async agentLogin(email: string, password: string) {
    const response = await this.request<{ token: string; user: any }>(
      '/users/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    )

    if (response.success && response.token) {
      this.setToken(response.token)
    }

    return response
  }

  // Wallet search by mobile
  async searchWalletByMobile(mobile: string) {
    return this.request(`/wallets/search?mobile=${encodeURIComponent(mobile)}`)
  }

  // Get wallet details
  async getWallet(id: string | number, depth: number = 2) {
    return this.request(`/wallets/${id}?depth=${depth}`)
  }

  // Activate/deactivate wallet
  async updateWallet(id: string | number, data: { active?: boolean; [key: string]: any }) {
    return this.request(`/wallets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // Deposit to wallet
  async depositToWallet(mobile: string, amount: number, currency: string | number, notes?: string) {
    return this.request('/wallets/transaction', {
      method: 'POST',
      body: JSON.stringify({
        actionKey: 'deposit',
        payload: {
          mobile,
          amount,
          currency,
          notes,
        },
      }),
    })
  }

  // Cashout codes
  async searchCashoutCode(code: string) {
    return this.request(`/cashout-codes/search?code=${encodeURIComponent(code)}`)
  }

  async payCashoutCode(code: string, notes?: string) {
    return this.request('/cashout-codes/pay', {
      method: 'POST',
      body: JSON.stringify({ code, notes }),
    })
  }

  async createCashoutCode(mobile: string, amount: number, currency: string | number) {
    return this.request('/cashout-codes/agent-create', {
      method: 'POST',
      body: JSON.stringify({ mobile, amount, currency }),
    })
  }

  async listCashoutCodes(status?: string, page = 1, limit = 50) {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    params.append('page', page.toString())
    params.append('limit', limit.toString())
    // #region agent log
    const endpoint = `/cashout-codes/agent-list?${params.toString()}`
    fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:188',message:'Using agent-list endpoint',data:{endpoint,status},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
    // #endregion
    // Use agent-list endpoint for agents (authenticated as users collection)
    return this.request(endpoint)
  }

  // Transactions
  async getWalletTransactions(walletId: string | number) {
    return this.request(`/wallets/${walletId}/transactions`)
  }

  async getTransactions(filters?: {
    walletId?: string | number
    accountId?: string | number
    page?: number
    limit?: number
  }) {
    const params = new URLSearchParams()
    if (filters?.walletId) params.append('walletId', String(filters.walletId))
    if (filters?.accountId) params.append('accountId', String(filters.accountId))
    if (filters?.page) params.append('page', String(filters.page))
    if (filters?.limit) params.append('limit', String(filters.limit))
    // Request with depth=2 to populate account relationships with names
    params.append('depth', '2')
    return this.request(`/transactions?${params.toString()}`)
  }

  // Agent account
  async getAgentAccount() {
    return this.request('/accounts?owner=agent')
  }

  async getAgentInfo() {
    return this.request('/users/me')
  }

  // Get currencies
  async getCurrencies() {
    return this.request('/currencies')
  }

  // Get account by ID
  async getAccount(accountId: string | number) {
    return this.request(`/accounts/${accountId}`)
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

export const apiClient = new ApiClient(API_BASE_URL)

