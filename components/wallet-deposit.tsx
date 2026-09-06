"use client"

import { useState, useEffect } from "react"
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
import {   CheckCircle2, Wallet, Smartphone, Coins, Loader2, Banknote, Send, FileText, Printer, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api"
import { formatDate, formatTime } from "@/lib/utils"

interface WalletDepositProps {
  mobile?: string
  onSuccess?: () => void
}

type DepositSuccess = {
  amount: string
  currencyCode: string
  mobile: string
  notes?: string
  txId?: string
  agentName: string
  paidAt: Date
}

// ─── Compact one-column cashier deposit receipt ───────────────────────

function DepositReceipt({ success, onDismiss }: { success: DepositSuccess; onDismiss: () => void }) {
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
        </div>
      </div>

      {/* Printable slip — compact cashier invoice */}
      <div className="print-area max-w-sm mx-auto">
        <div className="print-slip rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
          {/* Boxed header: brand + wallet | logo */}
          <div className="border-b-2 border-dashed border-border/40 bg-muted/30 px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-extrabold text-primary leading-tight">شمول كاش — وكيل</p>
              <p className="text-[11px] font-bold text-muted-foreground mt-0.5">
                المحفظة:{" "}
                <span className="font-mono font-semibold text-foreground" dir="ltr">
                  {success.mobile}
                </span>
              </p>
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
            <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Coins className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-bold text-primary">المبلغ المُودع</span>
              </div>
              <p className="whitespace-nowrap font-mono text-lg font-extrabold text-foreground mt-1" dir="ltr">
                {success.amount}{" "}
                <span className="text-[10px] font-bold text-muted-foreground">{success.currencyCode}</span>
              </p>
            </div>

            {/* Rows */}
            <div className="rounded-lg border border-border/40 bg-card px-3 divide-y divide-border/40">
              <div className="flex items-center justify-between gap-4 py-2">
                <span className="text-[11px] font-bold text-muted-foreground">المحفظة</span>
                <span className="text-sm font-mono font-semibold text-foreground" dir="ltr">{success.mobile}</span>
              </div>
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
          <div className="border-t-2 border-dashed border-border/40 px-4 py-2 space-y-0.5 text-center text-[10px] text-muted-foreground">
            <p>
              تم الإيداع بواسطة: <span className="font-semibold text-foreground">{success.agentName}</span>
            </p>
            <p>هذا الإيصال سند إثبات لعملية الإيداع</p>
            <p className="font-mono font-semibold text-foreground whitespace-nowrap" dir="ltr">
              {formatDate(success.paidAt)} · {formatTime(success.paidAt)}
            </p>
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
    const clean = mob.replace(/^\+?966/, "").replace(/^0/, "")
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

  const handleSubmit = (e: React.FormEvent) => {
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

    setShowConfirmDialog(true)
  }

  const handleConfirmDeposit = async () => {
    setIsLoading(true)
    try {
      const amountNum = parseFloat(amount)
      const normMobile = normalizeMobile(propMobile || mobile)

      const response = await apiClient.depositToWallet(
        normMobile,
        amountNum,
        currency,
        notes || undefined
      )

      const results = (response as any).data?.results
      const depositResult = results?.[0]
      const depositSuccess = depositResult ? depositResult.success : response.success

      if (depositSuccess) {
        const currencyCode = getCurrencyCode()
        const raw: any = depositResult || {}
        const rawTxId = raw.transactionId ?? raw.txId ?? raw.id ?? raw.reference

        setSuccess({
          amount: amountNum.toFixed(2),
          currencyCode,
          mobile: normMobile,
          notes: notes || undefined,
          txId: rawTxId != null && rawTxId !== "" ? String(rawTxId) : undefined,
          agentName,
          paidAt: new Date(),
        })

        if (!propMobile) setMobile("")
        setAmount("")
        setCurrency("")
        setNotes("")

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

      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Recipient */}
          <div className="form-section">
            <div className="form-section-title">
              <Smartphone className="h-4 w-4" />
              1. بيانات المستلم
            </div>
            {!propMobile && (
              <div className="form-field">
                <Label htmlFor="mobile" className="text-sm font-medium">رقم الجوال</Label>
                <div className="flex rounded-lg overflow-hidden border border-input">
                  
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
                    className="rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  
                </div>
                {mobileError && (
                  <p className="text-xs text-destructive mt-1">{mobileError}</p>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Amount */}
          <div className="form-section">
            <div className="form-section-title">
              <Banknote className="h-4 w-4" />
              2. تفاصيل المبلغ
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="form-field">
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

              <div className="form-field">
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
                  <p className="text-xs text-amber-600 mt-1">تعذر تحميل العملات. يرجى تحديث الصفحة.</p>
                )}
              </div>
            </div>
            {currency && amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  سيتم إيداع {parseFloat(amount).toFixed(2)} {getCurrencyCode()}
                </Badge>
              </div>
            )}
          </div>

          {/* Section 3: Notes */}
          <div className="form-section">
            <div className="form-section-title">
              <FileText className="h-4 w-4" />
              3. ملاحظات (اختياري)
            </div>
            <div className="form-field">
              <Label htmlFor="notes" className="text-sm font-medium">ملاحظات (اختياري)</Label>
              <textarea
                id="notes"
                rows={2}
                placeholder="اكتب ملاحظة..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>


          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 font-semibold"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري التنفيذ...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span>إيداع</span>
              </div>
            )}
          </Button>
        </form>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد الإيداع</DialogTitle>
              <DialogDescription>
                سيتم إضافة {amount} {getCurrencyCode()} إلى محفظة  {normalizeMobile(propMobile || mobile)}. هل تريد المتابعة؟
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">المبلغ</span>
                <span className="font-semibold">{parseFloat(amount).toFixed(2)} {getCurrencyCode()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">رقم الجوال</span>
                <span dir="ltr"> {normalizeMobile(propMobile || mobile)}</span>
              </div>
              {notes && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">ملاحظات</span>
                  <span className="text-muted-foreground">{notes}</span>
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
