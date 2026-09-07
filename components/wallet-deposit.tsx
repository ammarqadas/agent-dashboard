"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { CheckCircle2, Wallet, Smartphone, Coins, Loader2, Banknote, Send, FileText, Printer, RotateCcw, Receipt } from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api"
import { SharePdfButton } from "@/components/receipt/share-pdf-button"
import { formatReceiptTimestamp } from "@/lib/utils"

interface WalletDepositProps {
  mobile?: string
  onSuccess?: () => void
}

type DepositQuote = {
  totalCommission: number
  totalAmount: number
  searchToken: string
}

type DepositConfirmData = {
  mobile: string
  walletName?: string
  amount: number
  currencyId: string
  currencyCode: string
  notes?: string
  quote: DepositQuote
}

type DepositSuccess = {
  amount: string
  currencyCode: string
  mobile: string
  walletName?: string
  notes?: string
  txId?: string
  commission?: number
  totalAmount?: number
  agentName: string
  paidAt: Date
}

// ─── Compact one-column cashier deposit receipt ───────────────────────

function DepositReceipt({ success, onDismiss }: { success: DepositSuccess; onDismiss: () => void }) {
  const receiptSlipRef = useRef<HTMLDivElement>(null)
  return (
    <div className="space-y-4">
      {/* Toolbar — hidden when printing */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="icon-container bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">تم الإيداع بنجاح</h2>
            <p className="text-sm text-muted-foreground">يمكنك طباعة الإيصال أو إيداع جديد</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onDismiss} className="h-10">
            <RotateCcw className="h-4 w-4" />
            إيداع جديد
          </Button>
          <Button
            onClick={() => window.print()}
            className="h-10 font-semibold bg-gradient-to-r from-primary to-emerald-600 hover:to-emerald-700"
          >
            <Printer className="h-4 w-4" />
            طباعة الإيصال
          </Button>
          <SharePdfButton
            slipRef={receiptSlipRef}
            filename={`deposit-${success.txId || success.mobile || "receipt"}`}
          />
        </div>
      </div>

      {/* Printable slip — compact cashier invoice */}
      <div className="print-area max-w-sm mx-auto">
        <div ref={receiptSlipRef} className="print-slip rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
          {/* Boxed header: brand only */}
          <div className="border-b-2 border-dashed border-border/40 bg-muted/30 px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-extrabold text-primary leading-tight">شمول كاش — وكيل</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">إيصال عملية مالية</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="شمول كاش" className="h-10 w-10 object-contain shrink-0" />
          </div>

          {/* Body — one column */}
          <div className="p-4 space-y-3">
            {/* Banner divider */}
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 bg-primary rounded-full" />
              <span className="text-[11px] font-extrabold text-primary">إيصال إيداع نقدي</span>
              <div className="h-1 flex-1 bg-primary rounded-full" />
            </div>

            {/* Amount — compact tinted box */}
            <div className="mx-auto flex min-h-[42px] w-full max-w-[180px] items-center justify-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Coins className="h-4 w-4" />
              </span>
              <div className="text-center">
                <p className="whitespace-nowrap font-mono text-lg font-extrabold leading-none text-foreground" dir="ltr">
                  {success.amount}{" "}
                  <span className="text-[10px] font-bold text-muted-foreground">{success.currencyCode}</span>
                </p>
              </div>
            </div>

            {/* Rows */}
            <div className="rounded-lg border border-border/40 bg-card px-3 divide-y divide-border/40">
              {success.walletName && (
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-[11px] font-bold text-muted-foreground">صاحب المحفظة</span>
                  <span className="text-sm font-semibold text-foreground">{success.walletName}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 py-2">
                <span className="text-[11px] font-bold text-muted-foreground">رقم المحفظة</span>
                <span className="text-sm font-mono font-semibold text-foreground" dir="ltr">{success.mobile}</span>
              </div>
              {success.commission != null && success.commission > 0 && (
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-[11px] font-bold text-muted-foreground">العمولة</span>
                  <span className="text-sm font-mono font-semibold text-foreground" dir="ltr">
                    {success.commission.toLocaleString()} {success.currencyCode}
                  </span>
                </div>
              )}
              {success.totalAmount != null && (
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-[11px] font-bold text-muted-foreground">الإجمالي المخصوم</span>
                  <span className="text-sm font-mono font-semibold text-foreground" dir="ltr">
                    {success.totalAmount.toLocaleString()} {success.currencyCode}
                  </span>
                </div>
              )}
              {success.txId && (
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-[11px] font-bold text-muted-foreground">رقم العملية</span>
                  <span className="text-sm font-mono font-semibold text-foreground" dir="ltr">{success.txId}</span>
                </div>
              )}
              {success.notes && (
                <div className="flex items-start justify-between gap-4 py-2">
                  <span className="text-[11px] font-bold text-muted-foreground shrink-0">ملاحظات</span>
                  <span className="text-xs font-semibold text-foreground text-left">{success.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-dashed border-border/40 bg-muted/20 px-4 py-2.5 text-[10px] text-muted-foreground">
            <div className="flex items-center justify-between gap-2 whitespace-nowrap">
              <p>
                تم الإيداع عبر الوكيل: <span className="font-semibold text-foreground">{success.agentName}</span>
              </p>
              <p className="font-mono font-semibold text-foreground whitespace-nowrap" dir="ltr">
                {formatReceiptTimestamp(success.paidAt)}
              </p>
            </div>
            <div className="mt-2 border-t border-border/40 pt-2 text-center">
              <p className="font-medium text-muted-foreground">هذا الإيصال سند إثبات لعملية الإيداع</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function WalletDeposit({ mobile: propMobile, onSuccess }: WalletDepositProps) {
  const [mobile, setMobile] = useState(propMobile || "")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState<DepositSuccess | null>(null)
  const [agentName, setAgentName] = useState("وكيل")
  const [currencies, setCurrencies] = useState<any[]>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [mobileError, setMobileError] = useState("")
  const [isCurrenciesLoading, setIsCurrenciesLoading] = useState(true)
  const [isChecking, setIsChecking] = useState(false)
  const [confirmData, setConfirmData] = useState<DepositConfirmData | null>(null)

  useEffect(() => {
    try {
      const agentUser = JSON.parse(sessionStorage.getItem("agentUser") || "{}")
      setAgentName(agentUser.name || "وكيل")
    } catch {
      setAgentName("وكيل")
    }
  }, [])

  useEffect(() => {
    const fetchCurrencies = async () => {
      setIsCurrenciesLoading(true)
      try {
        const response = await apiClient.getCurrencies()
        if (response.success && response.docs) {
          setCurrencies(response.docs)
        }
      } catch (err) {
        console.error("Failed to fetch currencies:", err)
      } finally {
        setIsCurrenciesLoading(false)
      }
    }
    fetchCurrencies()
  }, [])

  const normalizeMobile = (mob: string) => {
    if (!mob) return mob
    const clean = mob.replace(/^\+?967/, "").replace(/^0/, "")
    if (/^7\d{8}$/.test(clean)) return clean
    return mob
  }

  const validateMobile = (mob: string) => {
    if (!propMobile && !mob) return "رقم الجوال مطلوب"
    const norm = normalizeMobile(mob)
    if (!/^7\d{8}$/.test(norm)) return "رقم الجوال غير صحيح. يجب أن يبدأ بـ 7 ويتكون من 9 أرقام"
    return null
  }

  const getCurrencyCode = () => {
    if (!currency) return ""
    const found = currencies.find(c => String(c.id) === currency)
    return found?.code || currency
  }

  // Request the server quote before confirmation is allowed. The presubmit
  // action validates the wallet and returns the one-time search token.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMobileError("")

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("الرجاء إدخال مبلغ صحيح")
      return
    }

    const mobErr = validateMobile(propMobile || mobile)
    if (mobErr) {
      setMobileError(mobErr)
      return
    }

    if (!currency) {
      toast.error("الرجاء اختيار العملة")
      return
    }

    const normMobile = normalizeMobile(propMobile || mobile)
    setIsChecking(true)

    try {
      // Server commission quote and wallet validation (pre-submit).
      const presubRes: any = await apiClient.agentDepositPresubmit({
        mobile: normMobile,
        amount: amountNum,
        currency,
      })
      const presubData = presubRes?.data || presubRes || {}
      const searchToken = presubData.searchToken
      if (!presubRes?.success || !searchToken) {
        toast.error(presubRes?.message || "تعذر احتساب العمولة — حاول من جديد")
        return
      }
      const totalCommission = Number(presubData.totalCommission ?? presubData.commission ?? 0)
      const totalAmount = Number(presubData.totalAmount ?? presubData.total ?? amountNum)
      const walletName = typeof presubData.walletName === "string" ? presubData.walletName : undefined

      setConfirmData({
        mobile: normMobile,
        walletName,
        amount: amountNum,
        currencyId: currency,
        currencyCode: getCurrencyCode(),
        notes: notes || undefined,
        quote: { totalCommission, totalAmount, searchToken },
      })
      setShowConfirmDialog(true)
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ أثناء تجهيز الإيداع — حاول من جديد")
    } finally {
      setIsChecking(false)
    }
  }

  const handleConfirmDeposit = async () => {
    if (!confirmData) return
    setIsLoading(true)
    try {
      const response = await apiClient.depositToWallet(
        confirmData.mobile,
        confirmData.amount,
        confirmData.currencyId,
        confirmData.notes,
        {
          commission: confirmData.quote.totalCommission,
          totalAmount: confirmData.quote.totalAmount,
          searchToken: confirmData.quote.searchToken,
        }
      )

      const results = (response as any).data?.results
      const depositResult = results?.[0]
      const depositSuccess = depositResult ? depositResult.success : response.success

      if (depositSuccess) {
        const raw: any = depositResult || {}
        const rawTxId = raw.transactionId ?? raw.txId ?? raw.id ?? raw.reference

        setSuccess({
          amount: confirmData.amount.toFixed(2),
          currencyCode: confirmData.currencyCode,
          mobile: confirmData.mobile,
          walletName: confirmData.walletName,
          notes: confirmData.notes,
          txId: rawTxId != null && rawTxId !== "" ? String(rawTxId) : undefined,
          commission: confirmData.quote.totalCommission,
          totalAmount: confirmData.quote.totalAmount,
          agentName,
          paidAt: new Date(),
        })

        if (!propMobile) setMobile("")
        setAmount("")
        setCurrency("")
        setNotes("")
        setMobileError("")
        setConfirmData(null)

        if (onSuccess) onSuccess()
      } else {
        toast.error(depositResult?.message || response.message || "فشل في معالجة الإيداع")
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء معالجة الإيداع. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsLoading(false)
      setShowConfirmDialog(false)
    }
  }

  if (success) {
    return <DepositReceipt success={success} onDismiss={() => setSuccess(null)} />
  }

  return (
    <>
      <Card className="rounded-xl border border-border/60">
      <CardHeader className="pb-6 border-b border-border/40 bg-gradient-to-br from-primary/5 via-primary/[0.08] to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="icon-container">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">إيداع نقدي</CardTitle>
                <Badge variant="secondary" className="text-xs">نقدي</Badge>
              </div>
              <CardDescription>
                إضافة رصيد إلى محفظة العميل
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recipient and amount are reviewed together before deposit. */}
          <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Banknote className="h-4 w-4 text-primary" />
              بيانات الإيداع
            </div>
            <div className={`grid gap-3 ${propMobile ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
              {!propMobile && (
                <div className="space-y-1.5">
                  <Label htmlFor="mobile" className="text-sm font-medium">رقم الجوال</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="7xxxxxxxx"
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value)
                      if (mobileError) setMobileError("")
                    }}
                    required
                    dir="ltr"
                  />
                  {mobileError && <p className="text-xs text-destructive">{mobileError}</p>}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-sm font-medium">المبلغ</Label>
                <div className="input-icon-wrapper">
                  <Coins className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    dir="ltr"
                    className="pr-10 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currency" className="text-sm font-medium">العملة</Label>
                <Select value={currency} onValueChange={setCurrency} required>
                  <SelectTrigger className="text-right [&>span]:text-right">
                    {isCurrenciesLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>جاري التحميل...</span>
                      </div>
                    ) : (
                      <SelectValue placeholder="اختر العملة" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((curr) => (
                      <SelectItem key={curr.id} value={String(curr.id)} className="text-right">
                        {curr.code} - {curr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isCurrenciesLoading && currencies.length === 0 && (
                  <p className="text-xs text-amber-600">تعذر تحميل العملات. يرجى تحديث الصفحة.</p>
                )}
              </div>
            </div>
            {currency && amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
              <p className="text-xs font-medium text-primary">
                سيتم إيداع {parseFloat(amount).toFixed(2)} {getCurrencyCode()}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              ملاحظات (اختياري)
            </Label>
            <textarea
              id="notes"
              rows={1}
              placeholder="اكتب ملاحظة..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>


          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || isChecking}
            className="w-full h-11 font-semibold"
          >
            {isChecking || isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{isChecking ? "جاري احتساب العمولة..." : "جاري التنفيذ..."}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span>إيداع</span>
              </div>
            )}
          </Button>
        </form>

        {/* Confirmation Dialog — frozen presubmit snapshot */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد الإيداع</DialogTitle>
              <DialogDescription>
                راجع بيانات الإيداع قبل التأكيد
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg bg-muted/30 p-4 space-y-2">
             
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5" /> المحفظة
                </span>
                <span className="font-mono font-semibold" dir="ltr">
                  {confirmData?.mobile}
                </span>
              </div>
               {confirmData?.walletName && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground"> الاسم </span>
                  <span className="font-semibold">{confirmData.walletName}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">المبلغ</span>
                <span className="font-mono font-semibold" dir="ltr">
                  {confirmData?.amount.toFixed(2)} {confirmData?.currencyCode}
                </span>
              </div>
              {confirmData && confirmData.quote.totalCommission > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5" /> العمولة
                  </span>
                  <span className="font-mono font-semibold" dir="ltr">
                    {confirmData.quote.totalCommission.toLocaleString()} {confirmData.currencyCode}
                  </span>
                </div>
              )}
              {confirmData && (
                <div className="flex justify-between items-center text-sm border-t border-border/40 pt-2">
                  <span className="font-semibold">الإجمالي المخصوم</span>
                  <span className="font-mono font-bold text-primary" dir="ltr">
                    {confirmData.quote.totalAmount.toLocaleString()} {confirmData.currencyCode}
                  </span>
                </div>
              )}
              {confirmData?.notes && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">ملاحظات</span>
                  <span className="text-muted-foreground">{confirmData.notes}</span>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">إلغاء</Button>
              </DialogClose>
              <Button onClick={handleConfirmDeposit} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإيداع...
                  </>
                ) : (
                  <>
                    <Send className="ml-2 h-4 w-4" />
                    تأكيد الإيداع
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
    </>
  )
}
