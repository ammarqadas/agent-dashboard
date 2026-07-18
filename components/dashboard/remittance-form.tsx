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
import { CheckCircle2, ArrowRightLeft, User, Phone, Coins, Loader2, AlertTriangle, RotateCcw, FileText, Send, X } from "lucide-react"
import { toast } from "sonner"
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
  const [success, setSuccess] = useState<any>(null)
  const [successDismissed, setSuccessDismissed] = useState(false)
  const [isFetchingCommission, setIsFetchingCommission] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [isCurrenciesLoading, setIsCurrenciesLoading] = useState(true)
  const [isDistWalletsLoading, setIsDistWalletsLoading] = useState(true)
  const [commissionResult, setCommissionResult] = useState<{
    totalCommission: number
    totalAmount: number
    searchToken: string
  } | null>(null)
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

  const normalizeMobile = (mob: string) => {
    if (!mob) return mob
    const clean = mob.replace(/^\+?966/, "").replace(/^0/, "")
    if (/^7\d{8}$/.test(clean)) return clean
    return mob
  }

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

  useEffect(() => {
    const fetchDistWallets = async () => {
      setIsDistWalletsLoading(true)
      try {
        const response = await apiClient.getDistWallets()
        if (response.success && response.docs) {
          setDistWallets(response.docs)
        }
      } catch (err) {
        console.error("Failed to fetch distribution wallets:", err)
      } finally {
        setIsDistWalletsLoading(false)
      }
    }
    fetchDistWallets()
  }, [])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (['amount', 'currency', 'distWallet'].includes(field)) {
      setCommissionResult(null)
    }
  }

  const requiresCommission = !!formData.distWallet

  const selectedCurrency = currencies.find(c => String(c.id) === formData.currency)
  const selectedNetwork = distWallets.find(w => w.key === formData.distWallet)

  const handleReset = () => {
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
    setSuccess(null)
    setSuccessDismissed(false)
    setCommissionResult(null)
    setConfirmData(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccess(null)
    setSuccessDismissed(false)
    setIsLoading(true)

    try {
      const amountNum = parseFloat(formData.amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        toast.error("الرجاء إدخال مبلغ صحيح")
        setIsLoading(false)
        return
      }

      if (!formData.currency) {
        toast.error("الرجاء اختيار العملة")
        setIsLoading(false)
        return
      }

      const currencyCode = selectedCurrency?.code || 'YER'

      let commission: {
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
            commission = {
              totalCommission: response.totalCommission ?? response.commission ?? 0,
              totalAmount: response.totalAmount ?? response.amount ?? amountNum,
              searchToken: response.searchToken,
            }
            setCommissionResult(commission)
          } else {
            toast.error(response.message || 'فشل احتساب العمولة')
            setIsLoading(false)
            setIsFetchingCommission(false)
            return
          }
        } catch (err: any) {
          toast.error(err.message || 'حدث خطأ أثناء احتساب العمولة')
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
        commission: commission || undefined,
      })
      setShowDialog(true)
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ غير متوقع")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmSend = async () => {
    if (!confirmData) return
    setSuccess(null)
    setSuccessDismissed(false)
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
        setConfirmData(null)
        setShowDialog(false)
        setCommissionResult(null)
        setTimeout(() => setSuccessDismissed(true), 8000)
      } else {
        toast.error(response.message || "فشل في إرسال الحوالة")
        setShowDialog(false)
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ غير متوقع")
      setShowDialog(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Main Form / Success Result */}
        <div className="lg:col-span-2">
          {success ? (
            <Card className="rounded-xl border border-border/60">
              <CardHeader className="pb-5 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="icon-container bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">تم إرسال الحوالة بنجاح</CardTitle>
                    <CardDescription>تفاصيل الحوالة</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {success.transactionId && (
                    <div className="dash-stat-card">
                      <div className="text-xs text-muted-foreground mb-1">رقم العملية</div>
                      <div className="text-lg font-bold font-mono">{success.transactionId}</div>
                    </div>
                  )}
                  {success.expressid && (
                    <div className="dash-stat-card">
                      <div className="text-xs text-muted-foreground mb-1">رقم الحوالة</div>
                      <div className="text-lg font-bold font-mono">{success.expressid}</div>
                    </div>
                  )}
                  <div className="dash-stat-card">
                    <div className="text-xs text-muted-foreground mb-1">المبلغ</div>
                    <div className="text-lg font-bold font-mono">
                      {success.amount?.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">{success.currency}</span>
                    </div>
                  </div>
                  <div className="dash-stat-card border-emerald-500/20 bg-emerald-50/50">
                    <div className="text-xs text-muted-foreground mb-1">الحالة</div>
                    <div className="text-lg font-bold text-emerald-600 font-medium">مكتملة</div>
                  </div>
                </div>
                <Button onClick={handleReset} variant="outline" className="w-full h-11 font-semibold">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    <span>إرسال حوالة جديدة</span>
                  </div>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl border border-border/60">
            <CardHeader className="pb-5 border-b border-border/40 bg-gradient-to-br from-primary/5 via-primary/[0.08] to-transparent">
              <div className="flex items-center gap-3">
                <div className="icon-container">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">حوالة الى حساب</CardTitle>
                    <Badge variant="secondary" className="text-xs">إرسال</Badge>
                  </div>
                  <CardDescription>
                    حوالة مالية من خلال حساب الوكيل
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Sender Details */}
                <div className="form-section space-y-4">
                  <Label className="form-section-title">
                    <User className="h-4 w-4" />
                    بيانات المرسل
                  </Label>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="form-field">
                      <Label htmlFor="senderName" className="text-sm font-medium">اسم المرسل</Label>
                      <div className="input-icon-wrapper">
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                        <Input
                          id="senderName"
                          placeholder="الاسم الثلاثي"
                          value={formData.senderName}
                          onChange={(e) => handleChange('senderName', e.target.value)}
                          required
                          className="pr-10"
                        />
                      </div>
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

                {/* Receiver Details */}
                <div className="form-section space-y-4">
                  <Label className="form-section-title">
                    <User className="h-4 w-4" />
                    بيانات المستلم
                  </Label>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="form-field">
                      <Label htmlFor="receiverName" className="text-sm font-medium">اسم المستلم</Label>
                      <div className="input-icon-wrapper">
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                        <Input
                          id="receiverName"
                          placeholder="الاسم الثلاثي"
                          value={formData.receiverName}
                          onChange={(e) => handleChange('receiverName', e.target.value)}
                          required
                          className="pr-10"
                        />
                      </div>
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

                {/* Remittance Details */}
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
                    <div className="form-field">
                      <Label htmlFor="distWallet" className="text-sm font-medium">تحويل عبر شبكة</Label>
                      <Select value={formData.distWallet} onValueChange={(v) => handleChange('distWallet', v)}>
                        <SelectTrigger className="text-right [&>span]:text-right">
                          {isDistWalletsLoading ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>جاري التحميل...</span>
                            </div>
                          ) : (
                            <SelectValue placeholder="اختر الشبكة" />
                          )}
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
                      <textarea
                        id="notes"
                        rows={2}
                        placeholder="غرض التحويل..."
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

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

                {/* Compact Success Card */}
                {success && !successDismissed && (
                  <div className="relative rounded-xl border border-emerald-500/40 bg-emerald-50 p-5 space-y-3">
                    <button
                      type="button"
                      onClick={() => setSuccessDismissed(true)}
                      className="absolute top-3 left-3 text-emerald-500 hover:text-emerald-700 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>تم إرسال الحوالة بنجاح</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {success.transactionId && (
                        <div className="space-y-0.5">
                          <span className="text-xs text-muted-foreground">رقم العملية</span>
                          <p className="font-mono font-bold">{success.transactionId}</p>
                        </div>
                      )}
                      {success.expressid && (
                        <div className="space-y-0.5">
                          <span className="text-xs text-muted-foreground">رقم الحوالة</span>
                          <p className="font-mono font-bold">{success.expressid}</p>
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <span className="text-xs text-muted-foreground">المبلغ</span>
                        <p className="font-mono font-bold">{success.amount?.toLocaleString()} {success.currency}</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs text-muted-foreground">الحالة</span>
                        <p className="font-medium text-emerald-600">مكتملة</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handleReset}
                      variant="outline"
                      className="w-full h-11 font-semibold"
                    >
                      <RotateCcw className="ml-2 h-4 w-4" />
                      إرسال حوالة جديدة
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
          )}
        </div>

        {/* Right: Preview Sidebar */}
        <div className="lg:col-span-1">
          <Card className="rounded-xl border border-border/60 lg:sticky lg:top-24">
            <CardHeader className="pb-5 border-b border-border/40">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                {success ? "تمت العملية" : "ملخص الحوالة"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {success ? (
                <div className="space-y-4">
                  <div className="text-center py-2">
                    <div className="icon-container bg-emerald-500/10 text-emerald-600 mx-auto mb-2">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-bold text-emerald-600">تمت العملية بنجاح</p>
                  </div>
                  <div className="space-y-3">
                    {success.transactionId && (
                      <div>
                        <span className="text-xs text-muted-foreground">رقم العملية</span>
                        <p className="font-mono text-sm font-bold">{success.transactionId}</p>
                      </div>
                    )}
                    {success.expressid && (
                      <div>
                        <span className="text-xs text-muted-foreground">رقم الحوالة</span>
                        <p className="font-mono text-sm font-bold">{success.expressid}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-muted-foreground">المبلغ</span>
                      <p className="font-mono text-lg font-bold" dir="ltr">{success.amount?.toLocaleString()} {success.currency}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Sender */}
                  <div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" /> المرسل
                    </span>
                    <p className="text-sm font-medium mt-0.5">{formData.senderName || "—"}</p>
                    {formData.senderMobile && (
                      <p className="font-mono text-xs mt-0.5" dir="ltr">{formData.senderMobile}</p>
                    )}
                  </div>

                  {/* Receiver */}
                  <div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" /> المستلم
                    </span>
                    <p className="text-sm font-medium mt-0.5">{formData.receiverName || "—"}</p>
                    {formData.receiverMobile && (
                      <p className="font-mono text-xs mt-0.5" dir="ltr">{formData.receiverMobile}</p>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Coins className="h-3 w-3" /> المبلغ
                    </span>
                    <p className="text-lg font-bold font-mono mt-0.5" dir="ltr">
                      {formData.amount
                        ? `${parseFloat(formData.amount).toLocaleString("en-US")} ${selectedCurrency?.code || ''}`
                        : "—"}
                    </p>
                  </div>

                  {/* Network */}
                  {formData.distWallet && (
                    <div>
                      <span className="text-xs text-muted-foreground">تحويل عبر</span>
                      <p className="text-sm mt-0.5">{selectedNetwork?.name || formData.distWallet}</p>
                    </div>
                  )}

                  {/* Commission (when available) */}
                  {commissionResult && (
                    <div className="pt-3 border-t">
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-50/50 p-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">عمولة التحويل</span>
                          <span className="font-mono font-semibold">{commissionResult.totalCommission}</span>
                        </div>
                        <div className="flex justify-between border-t border-emerald-500/20 pt-2 text-sm">
                          <span className="font-semibold">المبلغ الإجمالي</span>
                          <span className="font-mono font-bold">{commissionResult.totalAmount} {selectedCurrency?.code}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Commission loading */}
                  {isFetchingCommission && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>جاري احتساب العمولة...</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
            <div className="space-y-3">
              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> المرسل
                  </div>
                  <div className="font-medium">{confirmData.senderName}</div>
                  <div className="font-mono text-xs" dir="ltr">{confirmData.senderMobile}</div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> المستلم
                  </div>
                  <div className="font-medium">{confirmData.receiverName}</div>
                  <div className="font-mono text-xs" dir="ltr">{confirmData.receiverMobile}</div>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                  <Coins className="h-3.5 w-3.5" /> المبلغ
                </div>
                <div className="font-mono font-bold text-lg">{confirmData.amount} {confirmData.currencyCode}</div>
              </div>
              {confirmData.notes && (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                    <FileText className="h-3.5 w-3.5" /> ملاحظات
                  </div>
                  <div className="text-sm">{confirmData.notes}</div>
                </div>
              )}

              {confirmData.commission && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-50/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">عمولة الحوالة</span>
                    <span className="font-mono font-semibold">{confirmData.commission.totalCommission}</span>
                  </div>
                  <div className="flex justify-between border-t border-emerald-500/20 pt-2 text-sm">
                    <span className="font-semibold">المبلغ الإجمالي</span>
                    <span className="font-mono font-bold">{confirmData.commission.totalAmount} {confirmData.currencyCode}</span>
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
