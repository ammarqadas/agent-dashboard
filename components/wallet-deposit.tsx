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
import { CheckCircle2, XCircle, Wallet, Smartphone, Coins, Loader2 } from "lucide-react"
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
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [currencies, setCurrencies] = useState<any[]>([])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const amountNum = parseFloat(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        setError("الرجاء إدخال مبلغ صحيح")
        setIsLoading(false)
        return
      }

      const response = await apiClient.depositToWallet(
        mobile,
        amountNum,
        currency,
        notes || undefined
      )

      const results = (response as any).data?.results
      const depositResult = results?.[0]

      const depositSuccess = depositResult ? depositResult.success : response.success

      if (depositSuccess) {
        const selectedCurrency = currencies.find(c => String(c.id) === currency)
        const currencyCode = selectedCurrency?.code || currency

        setSuccess(`تم الإيداع بنجاح! المبلغ: ${amountNum.toFixed(2)} ${currencyCode} إلى المحفظة ${mobile}`)

        if (!propMobile) {
          setMobile("")
        }
        setAmount("")
        setCurrency("")
        setNotes("")

        setTimeout(() => {
          setSuccess("")
        }, 5000)

        if (onSuccess) onSuccess()
      } else {
        setError(depositResult?.message || response.message || "فشل في معالجة الإيداع")
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء معالجة الإيداع. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="rounded-xl border border-border/60">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="icon-container">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">إيداع إلى محفظة</CardTitle>
            <CardDescription>
              إضافة رصيد إلى محفظة العميل
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Form fields */}
          <div className="form-section space-y-4">
            {!propMobile && (
              <div className="form-field">
                <Label htmlFor="mobile" className="text-sm font-medium">رقم الجوال</Label>
                <div className="input-icon-wrapper">
                  <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="7xxxxxxxx"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                    dir="ltr"
                    className="pr-10"
                  />
                </div>
              </div>
            )}

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
            </div>

            <div className="form-field">
              <Label htmlFor="notes" className="text-sm font-medium">ملاحظات (اختياري)</Label>
              <Input
                id="notes"
                type="text"
                placeholder="اكتب ملاحظة..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
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
              <div className="text-emerald-800 font-medium">{success}</div>
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
      </CardContent>
    </Card>
  )
}
