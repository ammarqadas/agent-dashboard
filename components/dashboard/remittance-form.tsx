"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
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
import { CheckCircle2, XCircle, ArrowRightLeft, User, Phone, Coins, Loader2, AlertTriangle } from "lucide-react"
import { apiClient } from "@/lib/api"

export function RemittanceForm() {
  const [formData, setFormData] = useState({
    senderName: '',
    senderMobile: '',
    receiverName: '',
    receiverMobile: '',
    amount: '',
    currency: '',
    distWallet: '',
    notes: ''
  })

  const [currencies, setCurrencies] = useState<any[]>([])
  const [distWallets, setDistWallets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<any>(null)
  const [isFetchingCommission, setIsFetchingCommission] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [confirmData, setConfirmData] = useState<{
    senderName: string
    senderMobile: string
    receiverName: string
    receiverMobile: string
    amount: number
    currencyCode: string
    notes?: string
    distWallet?: string | number
    commission?: {
      totalCommission: number
      totalAmount: number
      searchToken: string
    }
  } | null>(null)

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await apiClient.getCurrencies()
        if (response.success && response.docs) {
          setCurrencies(response.docs)
        }
      } catch (err) {
        console.error("Failed to fetch currencies:", err)
      }
    }
    fetchCurrencies()
  }, [])

  useEffect(() => {
    const fetchDistWallets = async () => {
      try {
        const response = await apiClient.getDistWallets()
        if (response.success && response.docs) {
          setDistWallets(response.docs)
        }
      } catch (err) {
        console.error("Failed to fetch distribution wallets:", err)
      }
    }
    fetchDistWallets()
  }, [])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const requiresCommission = !!formData.distWallet

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(null)
    setIsLoading(true)

    try {
      const amountNum = parseFloat(formData.amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        setError("الرجاء إدخال مبلغ صحيح")
        setIsLoading(false)
        return
      }

      if (!formData.currency) {
        setError("الرجاء اختيار العملة")
        setIsLoading(false)
        return
      }

      const selectedCurrency = currencies.find(c => String(c.id) === formData.currency)
      const currencyCode = selectedCurrency?.code || 'YER'

      let commissionData: {
        totalCommission: number
        totalAmount: number
        searchToken: string
      } | undefined

      if (requiresCommission) {
        setIsFetchingCommission(true)
        try {
          const response = await apiClient.agentRemittanceCommission({
            networkKey: formData.distWallet!,
            currencyCode,
            amount: amountNum,
          })
          if (response.success) {
            commissionData = {
              totalCommission: response.totalCommission ?? response.CenterCommission ?? 0,
              totalAmount: response.totalAmount ?? amountNum,
              searchToken: response.searchToken,
            }
          } else {
            setError(response.message || 'فشل احتساب العمولة')
            setIsLoading(false)
            setIsFetchingCommission(false)
            return
          }
        } catch (err: any) {
          setError(err.message || 'حدث خطأ أثناء احتساب العمولة')
          setIsLoading(false)
          setIsFetchingCommission(false)
          return
        } finally {
          setIsFetchingCommission(false)
        }
      }

      setConfirmData({
        senderName: formData.senderName,
        senderMobile: formData.senderMobile,
        receiverName: formData.receiverName,
        receiverMobile: formData.receiverMobile,
        amount: amountNum,
        currencyCode,
        notes: formData.notes || undefined,
        distWallet: formData.distWallet || undefined,
        commission: commissionData || undefined,
      })
      setShowDialog(true)
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmSend = async () => {
    if (!confirmData) return
    setError("")
    setSuccess(null)
    setIsLoading(true)

    try {
      const response = await apiClient.agentRemittanceSend(String(confirmData.distWallet || "unified-network"), {
        senderName: confirmData.senderName,
        senderMobile: confirmData.senderMobile,
        receiverName: confirmData.receiverName,
        receiverMobile: confirmData.receiverMobile,
        amount: confirmData.amount,
        currency: confirmData.currencyCode,
        notes: confirmData.notes,
        ...(confirmData.commission ? {
          commission: confirmData.commission.totalCommission,
          totalAmount: confirmData.commission.totalAmount,
          searchToken: confirmData.commission.searchToken,
        } : {}),
      })

      if (response.success) {
        setSuccess(response.data)
        setFormData({
          senderName: '',
          senderMobile: '',
          receiverName: '',
          receiverMobile: '',
          amount: '',
          currency: '',
          distWallet: '',
          notes: ''
        })
        setConfirmData(null)
        setShowDialog(false)
      } else {
        setError(response.message || "فشل في إرسال الحوالة")
        setShowDialog(false)
      }

    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع")
      setShowDialog(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
    <Card className="rounded-xl border border-border/60">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="icon-container">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">حوالة الى حساب </CardTitle>
            <CardDescription>
              حوالة الى حساب  مالية من خلال حساب الوكيل
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Sender Details - minimal */}
          <div className="form-section space-y-4">
            <Label className="form-section-title">
              <User className="h-4 w-4" />
              بيانات المرسل
            </Label>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="form-field">
                <Label htmlFor="senderName" className="text-sm font-medium">اسم المرسل</Label>
                <Input
                  id="senderName"
                  placeholder="الاسم الثلاثي"
                  value={formData.senderName}
                  onChange={(e) => handleChange('senderName', e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <Label htmlFor="senderMobile" className="text-sm font-medium">جوال المرسل</Label>
                <div className="input-icon-wrapper">
                  <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    id="senderMobile"
                    type="tel"
                    dir="ltr"
                    placeholder="7xxxxxxxx"
                    value={formData.senderMobile}
                    onChange={(e) => handleChange('senderMobile', e.target.value)}
                    required
                    className="pr-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Receiver Details - minimal */}
          <div className="form-section space-y-4">
            <Label className="form-section-title">
              <User className="h-4 w-4" />
              بيانات المستلم
            </Label>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="form-field">
                <Label htmlFor="receiverName" className="text-sm font-medium">اسم المستلم</Label>
                <Input
                  id="receiverName"
                  placeholder="الاسم الثلاثي"
                  value={formData.receiverName}
                  onChange={(e) => handleChange('receiverName', e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <Label htmlFor="receiverMobile" className="text-sm font-medium">جوال المستلم</Label>
                <div className="input-icon-wrapper">
                  <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    id="receiverMobile"
                    type="tel"
                    dir="ltr"
                    placeholder="7xxxxxxxx"
                    value={formData.receiverMobile}
                    onChange={(e) => handleChange('receiverMobile', e.target.value)}
                    required
                    className="pr-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Amount Details - minimal */}
          <div className="form-section space-y-4">
            <Label className="form-section-title">
              <Coins className="h-4 w-4" />
              بيانات الحوالة
            </Label>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="form-field">
                <Label htmlFor="amount" className="text-sm font-medium">المبلغ</Label>
                <div className="input-icon-wrapper">
                  <Coins className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    dir="ltr"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => handleChange('amount', e.target.value)}
                    required
                    className="pr-10 font-semibold"
                  />
                </div>
              </div>
              <div className="form-field">
                <Label htmlFor="currency" className="text-sm font-medium">العملة</Label>
                <Select value={formData.currency} onValueChange={(v) => handleChange('currency', v)} required>
                  <SelectTrigger className="text-right [&>span]:text-right">
                    <SelectValue placeholder="اختر العملة" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((curr) => (
                      <SelectItem key={curr.id} value={String(curr.id)} className="text-right">
                        {curr.code} - {curr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="form-field">
                <Label htmlFor="distWallet" className="text-sm font-medium">تحويل عبر شبكة</Label>
                <Select value={formData.distWallet} onValueChange={(v) => handleChange('distWallet', v)}>
                  <SelectTrigger className="text-right [&>span]:text-right">
                    <SelectValue placeholder="اختر الشبكة" />
                  </SelectTrigger>
                  <SelectContent>
                    {distWallets.map((wallet) => (
                      <SelectItem key={wallet.key} value={wallet.key} className="text-right">
                        {wallet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="form-field md:col-span-2">
                <Label htmlFor="notes" className="text-sm font-medium">ملاحظات (اختياري)</Label>
                <Input
                  id="notes"
                  placeholder="غرض التحويل..."
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <XCircle className="h-4 w-4" />
              <div className="font-medium">{error}</div>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="rounded-xl border-emerald-500/50 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <div className="text-emerald-800">
                <div className="font-semibold mb-2">تم إرسال الحوالة بنجاح!</div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between border-b border-emerald-500/20 pb-1">
                    <span>رقم العملية:</span>
                    <span className="font-mono font-semibold">{success.transactionId}</span>
                  </div>
                  <div className="flex justify-between border-b border-emerald-500/20 pb-1">
                    <span>رقم الحوالة:</span>
                    <span className="font-mono font-semibold">{success.expressid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المبلغ:</span>
                    <span className="font-semibold">{success.amount} {success.currency}</span>
                  </div>
                </div>
              </div>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || isFetchingCommission}
            className="w-full h-11 font-semibold"
          >
            {(isLoading || isFetchingCommission) ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{isFetchingCommission ? 'جاري احتساب العمولة...' : 'جاري التجهيز...'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                <span>إرسال الحوالة</span>
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>

    {/* Confirmation Dialog */}
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            تأكيد إرسال الحوالة
          </DialogTitle>
          <DialogDescription>
            راجع بيانات الحوالة قبل الإرسال
          </DialogDescription>
        </DialogHeader>

        {confirmData && (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المرسل:</span>
                <span className="font-medium">{confirmData.senderName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">جوال المرسل:</span>
                <span className="font-mono" dir="ltr">{confirmData.senderMobile}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">المستلم:</span>
                <span className="font-medium">{confirmData.receiverName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">جوال المستلم:</span>
                <span className="font-mono" dir="ltr">{confirmData.receiverMobile}</span>
              </div>
              <div className="flex justify-between border-t border-border/50 pt-2">
                <span className="text-muted-foreground">المبلغ:</span>
                <span className="font-mono font-semibold">{confirmData.amount} {confirmData.currencyCode}</span>
              </div>
              {confirmData.notes && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ملاحظات:</span>
                  <span className="text-end max-w-[60%]">{confirmData.notes}</span>
                </div>
              )}
            </div>

            {confirmData.commission && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-50/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>عمولة الحوالة:</span>
                  <span className="font-mono font-semibold">{confirmData.commission.totalCommission}</span>
                </div>
                <div className="flex justify-between border-t border-emerald-500/20 pt-2 text-sm">
                  <span className="font-semibold">المبلغ الإجمالي:</span>
                  <span className="font-mono font-bold">{confirmData.commission.totalAmount}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline" disabled={isLoading}>
              إلغاء
            </Button>
          </DialogClose>
          <Button
            onClick={handleConfirmSend}
            disabled={isLoading}
            className="bg-gradient-to-r from-primary to-emerald-600 hover:to-emerald-700"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري الإرسال...</span>
              </div>
            ) : (
              <span>تأكيد الإرسال</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
