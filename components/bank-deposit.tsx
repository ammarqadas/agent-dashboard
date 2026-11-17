"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Landmark, Loader2, CheckCircle2, Printer, Coins } from "lucide-react"
import { apiClient } from "@/lib/api"
import { BrandLogo, BrandName } from "@/components/brand-provider"
import { SharePdfButton } from "@/components/receipt/share-pdf-button"
import { formatReceiptTimestamp } from "@/lib/utils"
import { getPresubmitConfirmationRows, type PresubmitConfirmationRow } from "@/lib/presubmit-confirmation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

type Account = { id: string | number; code: string; name?: string; active: boolean; balance: string | number; currency: any }
type Confirmation = {
  sourceAccount: string
  bankAccount: string
  amount: number
  currency: string
  total: number
  commission: number | null
  presubmitRows: PresubmitConfirmationRow[]
  searchToken?: string
  requestKey: string
}
type BankDepositReceiptData = Confirmation & { reference?: string; paidAt: Date; agentName: string }

export function BankDeposit() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [currencies, setCurrencies] = useState<Record<string, string>>({})
  const [sourceAccount, setSourceAccount] = useState("")
  const [bankAccount, setBankAccount] = useState("")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [uncertain, setUncertain] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [receipt, setReceipt] = useState<BankDepositReceiptData | null>(null)
  const submitting = useRef(false)

  const loadAccounts = async () => {
    const response = await apiClient.getAgentAccount()
    if (!response.success) throw new Error(response.message || "تعذر تحميل حسابات الوكيل")
    const list = response.docs || response.data || []
    if (!Array.isArray(list)) throw new Error("تعذر قراءة حسابات الوكيل")
    const active = list.filter((account: Account) => account.active === true && account.code != null && String(account.code) !== "")
      .map((account: Account) => ({ ...account, code: String(account.code) }))
    setAccounts(active)
    return active as Account[]
  }

  useEffect(() => {
    loadAccounts().catch((err) => setError(err.message)).finally(() => setLoading(false))
    apiClient.getCurrencies().then((response) => {
      const list = response.docs || response.data || response.currencies || []
      if (response.success && Array.isArray(list)) setCurrencies(Object.fromEntries(list.map((currency: any) => [String(currency.id), currency.code || currency.symbol || currency.name])))
    }).catch(() => {})
  }, [])

  const currencyLabel = (account: Account) => typeof account.currency === "object" && account.currency
    ? account.currency.code || currencies[String(account.currency.id)] || account.currency.name || ""
    : currencies[String(account.currency)] || String(account.currency ?? "")
  const selected = accounts.find((account) => account.code === sourceAccount)

  const prepare = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting.current || uncertain) return
    setError("")
    const value = Number(amount)
    if (!selected) { setError("يرجى اختيار حساب المصدر"); return }
    if (!Number.isFinite(value) || value < 0.01) { setError("الحد الأدنى للمبلغ هو 0.01"); return }
    if (!/^\d{8,15}$/.test(bankAccount)) { setError("الحساب البنكي يجب أن يتكون من 8 إلى 15 رقماً"); return }
    submitting.current = true
    setBusy(true)
    try {
      const current = (await loadAccounts()).find((account) => account.code === sourceAccount)
      if (!current) throw new Error("الحساب غير متاح")
      const response = await apiClient.bankDepositPresubmit({ sourceAccount, bankAccount, amount: value })
      if (!response.success) throw new Error(response.message || "تعذر التحقق من بيانات الإيداع")
      const data = response.data || response
      const commission = data.totalCommission ?? data.commission
      const total = Number(data.totalAmount ?? data.total ?? (value + Number(commission ?? 0)))
      if (!Number.isFinite(total) || total < value || (commission != null && (!Number.isFinite(Number(commission)) || Number(commission) < 0))) throw new Error("تعذر التحقق من إجمالي المبلغ")
      setConfirmation({ sourceAccount, bankAccount, amount: value, currency: currencyLabel(current), total,
        commission: commission == null ? null : Number(commission),
        presubmitRows: getPresubmitConfirmationRows(data, data._mappedFields ?? response._mappedFields),
        searchToken: typeof data.searchToken === "string" ? data.searchToken : undefined,
        requestKey: crypto.randomUUID(),
      })
    } catch (err) { setError(err instanceof Error ? err.message : "تعذر إعداد الإيداع") }
    finally { submitting.current = false; setBusy(false) }
  }

  const execute = async () => {
    if (!confirmation || submitting.current || uncertain) return
    submitting.current = true
    setBusy(true)
    setError("")
    let receivedResponse = false
    try {
      const response = await apiClient.bankDeposit({ sourceAccount: confirmation.sourceAccount, bankAccount: confirmation.bankAccount,
        amount: confirmation.amount, ...(confirmation.searchToken ? { searchToken: confirmation.searchToken } : {}),
      }, confirmation.requestKey)
      receivedResponse = true
      const data = response.data || response
      const result = data.results?.[0] || data
      if (!response.success || result.success === false) {
        if (response.code === "CLIENT_TIMEOUT" || response.code === "NETWORK_ERROR" || response.httpStatus >= 500) setUncertain(true)
        throw new Error(result.message || response.message || "تعذر إتمام الإيداع")
      }
      const reference = result.transactionId ?? result.txId ?? result.reference
      let agentName = "وكيل"
      try { agentName = JSON.parse(sessionStorage.getItem("agentUser") || "{}").name || agentName } catch {}
      setReceipt({ ...confirmation, reference: reference == null ? undefined : String(reference), paidAt: new Date(), agentName })
      setConfirmation(null)
      setAmount("")
      setBankAccount("")
      try { await loadAccounts() } catch { setError("تم الإيداع بنجاح، لكن تعذر تحديث الرصيد. يرجى تحديث الصفحة.") }
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر التحقق من نتيجة الإيداع")
      // A thrown transport error may occur after the backend has committed the debit.
      if (!receivedResponse) setUncertain(true)
      setConfirmation(null)
    } finally { submitting.current = false; setBusy(false) }
  }

  if (receipt) return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-sm text-destructive print:hidden">{error}</p>}
      <BankDepositReceipt receipt={receipt} onNewDeposit={() => setReceipt(null)} disableNewDeposit={!!error} />
    </div>
  )

  return (
    <Card className="rounded-xl border-border/60">
      <CardHeader className="p-4">
        <CardTitle className="flex items-center gap-2 text-lg"><Landmark className="h-5 w-5 text-primary" />إيداع بنكي</CardTitle>
        <CardDescription>إيداع إلى حساب بنكي من حساب الوكيل بنفس عملة الحساب المحدد.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {uncertain && <p role="alert" className="rounded-lg bg-muted p-3 text-sm">تعذر تأكيد نتيجة العملية. تحقق من <Link href="/dashboard/transactions" className="text-primary underline">كشف الحساب</Link> قبل إجراء إيداع آخر.</p>}
          <form onSubmit={prepare} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bank-source">من حساب</Label>
              <Select value={sourceAccount} onValueChange={setSourceAccount} disabled={loading || busy || uncertain}>
                <SelectTrigger id="bank-source"><SelectValue placeholder={loading ? "جاري تحميل الحسابات..." : "اختر الحساب"} /></SelectTrigger>
                <SelectContent>{accounts.map((account) => <SelectItem key={account.id} value={account.code}>{account.name || account.code} — {currencyLabel(account)} — {account.code}</SelectItem>)}</SelectContent>
              </Select>
              {selected && <p className="text-xs text-muted-foreground">الرصيد الحالي: <span dir="ltr">{selected.balance} {currencyLabel(selected)}</span></p>}
              {!loading && !accounts.length && <p className="text-xs text-muted-foreground">لا توجد حسابات نشطة متاحة للإيداع البنكي.</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="bank-amount">المبلغ</Label><Input id="bank-amount" type="number" min="0.01" step="any" required value={amount} onChange={(event) => setAmount(event.target.value)} disabled={busy || uncertain} dir="ltr" /></div>
              <div className="space-y-1.5"><Label htmlFor="bank-account">الحساب البنكي</Label><Input id="bank-account" inputMode="numeric" pattern="[0-9]{8,15}" maxLength={15} required value={bankAccount} onChange={(event) => setBankAccount(event.target.value)} disabled={busy || uncertain} dir="ltr" /><p className="text-xs text-muted-foreground">من 8 إلى 15 رقماً</p></div>
            </div>
            <Button type="submit" className="w-full" disabled={loading || busy || uncertain || !accounts.length}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}مراجعة الإيداع</Button>
          </form>
        <Dialog open={confirmation !== null} onOpenChange={(open) => { if (!open && !submitting.current) setConfirmation(null) }}>
          <DialogContent dir="rtl" onEscapeKeyDown={(event) => { if (submitting.current) event.preventDefault() }} onPointerDownOutside={(event) => { if (submitting.current) event.preventDefault() }}>
            <DialogHeader><DialogTitle>تأكيد الإيداع البنكي</DialogTitle><DialogDescription>راجع الحساب والمبلغ قبل تأكيد الخصم من رصيد الوكيل.</DialogDescription></DialogHeader>
            {confirmation && <DepositDetails details={confirmation} />}
            <DialogFooter className="gap-2"><Button variant="outline" disabled={busy} onClick={() => setConfirmation(null)}>إلغاء</Button><Button disabled={busy || uncertain} onClick={() => void execute()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}تأكيد الإيداع</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

function BankDepositReceipt({ receipt, onNewDeposit, disableNewDeposit }: {
  receipt: BankDepositReceiptData
  onNewDeposit: () => void
  disableNewDeposit: boolean
}) {
  const receiptSlipRef = useRef<HTMLDivElement>(null)
  const formatAmount = (value: number) => value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 })
  const beneficiaryKeys = ["receiverName", "accountName", "bankAccountName"]
  const beneficiaryRows = receipt.presubmitRows.filter((row) => beneficiaryKeys.includes(row.key))
  const otherRows = receipt.presubmitRows.filter((row) => !beneficiaryKeys.includes(row.key))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-bold">تم الإيداع بنجاح</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-10 gap-1.5" onClick={onNewDeposit} disabled={disableNewDeposit}>إيداع جديد</Button>
          <Button className="h-10 gap-1.5" onClick={() => window.print()}><Printer className="h-4 w-4" />طباعة الإيصال</Button>
          <SharePdfButton slipRef={receiptSlipRef} filename={`bank-deposit-${receipt.reference || receipt.requestKey}`} />
        </div>
      </div>

      <div className="print-area mx-auto max-w-sm">
        <div ref={receiptSlipRef} dir="rtl" className="print-slip overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b-2 border-dashed border-border/40 bg-muted/30 px-4 py-3">
            <div>
              <p data-brand-component="receipt-header" className="text-sm font-extrabold text-primary leading-tight"><BrandName /> — وكيل</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">إيصال عملية مالية</p>
            </div>
            <BrandLogo className="h-10 w-10 shrink-0 object-contain" />
          </div>
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 rounded-full bg-primary" />
              <h3 className="text-[11px] font-extrabold text-primary">إيصال إيداع بنكي</h3>
              <div className="h-1 flex-1 rounded-full bg-primary" />
            </div>
            <div className="mx-auto flex min-h-[42px] w-full max-w-[180px] items-center justify-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Coins className="h-4 w-4" /></span>
              <div className="text-center">
                <p className="whitespace-nowrap font-mono text-lg font-extrabold leading-none text-foreground" dir="ltr">
                  {formatAmount(receipt.amount)}{" "}
                  <span className="text-[10px] font-bold text-muted-foreground">{receipt.currency}</span>
                </p>
              </div>
            </div>
            <dl className="divide-y divide-border/40 rounded-lg border border-border/40 bg-card px-3">
              {beneficiaryRows.map((row) => <ReceiptRow key={row.key} label={row.label} value={row.value} />)}
              <ReceiptRow label="الحساب البنكي" value={receipt.bankAccount} numeric />
              <ReceiptRow label="حساب المصدر" value={receipt.sourceAccount} numeric />
              {otherRows.map((row) => <ReceiptRow key={row.key} label={row.label} value={row.value} />)}
              {receipt.commission !== null && receipt.commission > 0 && <ReceiptRow label="العمولة" value={`${formatAmount(receipt.commission)} ${receipt.currency}`} numeric />}
              <ReceiptRow label="الإجمالي المخصوم" value={`${formatAmount(receipt.total)} ${receipt.currency}`} numeric />
              {receipt.reference && <ReceiptRow label="رقم العملية" value={receipt.reference} numeric />}
            </dl>
          </div>
          <div className="border-t-2 border-dashed border-border/40 bg-muted/20 px-4 py-2.5 text-[10px] text-muted-foreground">
            <div className="flex items-center justify-between gap-2 whitespace-nowrap">
              <p>تم الإيداع عبر الوكيل: <span className="font-semibold text-foreground">{receipt.agentName}</span></p>
              <p className="whitespace-nowrap font-mono font-semibold text-foreground" dir="ltr">{formatReceiptTimestamp(receipt.paidAt)}</p>
            </div>
            <div className="mt-2 border-t border-border/40 pt-2 text-center"><p className="font-medium text-muted-foreground">هذا الإيصال سند إثبات لعملية الإيداع البنكي</p></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReceiptRow({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return <div className="flex items-center justify-between gap-4 py-2">
    <dt className="shrink-0 text-[11px] font-bold text-muted-foreground">{label}</dt>
    <dd className={`min-w-0 text-sm font-semibold text-foreground [overflow-wrap:anywhere] ${numeric ? "font-mono" : ""}`} dir={numeric ? "ltr" : "auto"}>{value}</dd>
  </div>
}

function DepositDetails({ details }: { details: Confirmation }) {
  return <dl className="space-y-2 text-sm">
    <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">حساب المصدر</dt><dd dir="ltr">{details.sourceAccount}</dd></div>
    <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">الحساب البنكي</dt><dd dir="ltr">{details.bankAccount}</dd></div>
    {details.presubmitRows.length > 0 && <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/10 p-3">
      {details.presubmitRows.map((row) => <div key={row.key} className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">{row.label}</dt><dd className="min-w-0 break-words [overflow-wrap:anywhere]" dir="auto">{row.value}</dd></div>)}
    </div>}
    <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">المبلغ</dt><dd dir="ltr">{details.amount} {details.currency}</dd></div>
    {details.commission !== null && <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">الرسوم</dt><dd dir="ltr">{details.commission} {details.currency}</dd></div>}
    <div className="flex flex-wrap justify-between gap-2 border-t pt-2 font-bold"><dt>الإجمالي المخصوم</dt><dd dir="ltr">{details.total} {details.currency}</dd></div>
  </dl>
}
