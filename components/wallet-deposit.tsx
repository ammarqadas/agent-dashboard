"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle2, XCircle } from "lucide-react"
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
    // Fetch available currencies
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

      if (response.success) {
        // Get currency name for success message
        const selectedCurrency = currencies.find(c => String(c.id) === currency)
        const currencyCode = selectedCurrency?.code || currency
        
        setSuccess(`تم الإيداع بنجاح! المبلغ: ${amountNum.toFixed(2)} ${currencyCode} إلى المحفظة ${mobile}`)
        
        // Reset form completely
        if (!propMobile) {
          setMobile("")
        }
        setAmount("")
        setCurrency("")
        setNotes("")
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccess("")
        }, 5000)
        
        if (onSuccess) onSuccess()
      } else {
        setError(response.message || "فشل في معالجة الإيداع")
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء معالجة الإيداع. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle>إيداع إلى محفظة</CardTitle>
        <CardDescription>
          إضافة رصيد إلى محفظة العميل
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              {!propMobile && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="mobile" className="text-right block">رقم الجوال</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="أدخل رقم الجوال"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                    dir="ltr"
                    className="text-left"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-right block">المبلغ</Label>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-right block">العملة</Label>
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
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes" className="text-right block">ملاحظات (اختياري)</Label>
                <Input
                  id="notes"
                  type="text"
                  placeholder="اكتب ملاحظة..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <div>
                <AlertTitle>خطأ</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </div>
            </Alert>
          )}
          
          {success && (
            <Alert className="border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <div>
                <AlertTitle className="text-emerald-800 dark:text-emerald-200 font-bold">
                  تم بنجاح!
                </AlertTitle>
                <AlertDescription className="text-emerald-700 dark:text-emerald-300 mt-1">
                  {success}
                </AlertDescription>
              </div>
            </Alert>
          )}
          
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading} className="min-w-40">
              {isLoading ? "جاري التنفيذ..." : "إيداع"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

