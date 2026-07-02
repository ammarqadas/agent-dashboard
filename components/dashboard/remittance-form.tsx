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
import { CheckCircle2, XCircle, ArrowRightLeft, User, Phone, Coins, Loader2 } from "lucide-react"
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

      const response = await apiClient.agentRemittance({
        senderName: formData.senderName,
        senderMobile: formData.senderMobile,
        receiverName: formData.receiverName,
        receiverMobile: formData.receiverMobile,
        amount: amountNum,
        currency: formData.currency,
        notes: formData.notes || undefined,
        distWallet: formData.distWallet || undefined,
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
      } else {
        setError(response.message || "فشل في إرسال الحوالة")
      }

    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="rounded-xl border border-border/60">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="icon-container">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">إرسال حوالة</CardTitle>
            <CardDescription>
              إرسال حوالة مالية من خلال حساب الوكيل
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
            disabled={isLoading}
            className="w-full h-11 font-semibold"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري الإرسال...</span>
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
  )
}
