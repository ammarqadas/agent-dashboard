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
import {   CheckCircle2, Wallet, Smartphone, Coins, Loader2, Banknote, Send, FileText, ArrowLeft, X } from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api"

interface WalletDepositProps {
  mobile?: string
  onSuccess?: () => void
}

export function WalletDeposit({ mobile: propMobile, onSuccess }: WalletDepositProps) {
  const [mobile, setMobile] = useState(propMobile || "")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState<{ amount: string; currencyCode: string; mobile: string } | null>(null)
  const [currencies, setCurrencies] = useState<any[]>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [mobileError, setMobileError] = useState("")
  const [isCurrenciesLoading, setIsCurrenciesLoading] = useState(true)

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

        setSuccess({
          amount: amountNum.toFixed(2),
          currencyCode,
          mobile: normMobile,
        })

        if (!propMobile) setMobile("")
        setAmount("")
        setCurrency("")
        setNotes("")

        setTimeout(() => setSuccess(null), 8000)

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

  return (
    <>
      {success && (
        <div className="relative text-center mb-4 rounded-xl border border-emerald-500/40 bg-emerald-50 p-5">
          <button
            onClick={() => setSuccess(null)}
            className="absolute left-2 top-2 text-emerald-600 hover:text-emerald-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-600" />
          <div className="mt-2">
            <p className="font-semibold text-emerald-700">تم الإيداع بنجاح</p>
            <p className="text-emerald-600 text-sm mt-1">
              {success.amount} {success.currencyCode}
              <ArrowLeft className="h-3 w-3 inline mx-1" />
              <span dir="ltr">{success.mobile}</span>
            </p>
          </div>
        </div>
      )}
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
