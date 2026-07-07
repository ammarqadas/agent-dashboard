"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCurrencies } from "./useCashoutCodes"
import { toast } from "sonner"
import Link from "next/link"
import { Eye, ArrowLeft } from "lucide-react"
import { apiClient } from "@/lib/api"

function validateMobile(mobile: string): string | null {
  if (!/^05\d{8}$/.test(mobile)) return "رقم الجوال غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 10 أرقام"
  return null
}

function validateAmount(amount: string): string | null {
  const num = parseFloat(amount)
  if (isNaN(num) || num <= 0) return "المبلغ يجب أن يكون رقمًا أكبر من 0"
  return null
}

export function CashoutCodeCreate() {
  const { currencies } = useCurrencies()
  const [mobile, setMobile] = useState("")
  const [amount, setAmount] = useState("")
  const [currencyId, setCurrencyId] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [errors, setErrors] = useState<{ mobile?: string; amount?: string; currency?: string }>({})

  const selectedCurrency = currencies.find((c) => String(c.id) === currencyId)

  const validate = (): boolean => {
    const newErrors: typeof errors = {}
    const mobileErr = validateMobile(mobile)
    const amountErr = validateAmount(amount)
    if (mobileErr) newErrors.mobile = mobileErr
    if (amountErr) newErrors.amount = amountErr
    if (!currencyId) newErrors.currency = "يرجى اختيار العملة"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsCreating(true)
    try {
      const parsedAmount = parseFloat(amount)
      const response = await apiClient.createCashoutCode(mobile, parsedAmount, currencyId)

      if (response.success) {
        const createdCode = response.code || response.result?.code
        const parts: string[] = []
        if (createdCode) parts.push(`الكود: ${createdCode}`)
        parts.push(`المبلغ: ${parsedAmount.toLocaleString("en-US")} ${selectedCurrency?.code || ""}`)
        if (response.result?.wallet?.name) parts.push(`العميل: ${response.result.wallet.name}`)
        if (response.result?.wallet?.mobile) parts.push(`الجوال: ${response.result.wallet.mobile}`)

        toast.success("تم إنشاء كود السحب بنجاح", {
          description: parts.join(" | "),
          duration: 6000,
          action: {
            label: "عرض الأكواد",
            onClick: () => window.location.href = "/dashboard/cashout-codes",
          },
        })

        setMobile("")
        setAmount("")
        setCurrencyId("")
        setErrors({})
      } else {
        toast.error("فشل الإنشاء", {
          description: response.message || "فشل في إنشاء كود السحب",
        })
      }
    } catch {
      toast.error("خطأ في الإنشاء", {
        description: "حدث خطأ أثناء إنشاء الكود. يرجى المحاولة مرة أخرى.",
      })
    } finally {
      setIsCreating(false)
    }
  }, [mobile, amount, currencyId, selectedCurrency])

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="border bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle>إنشاء كود سحب</CardTitle>
            <CardDescription>إنشاء كود سحب جديد للعميل</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="mobile" className="text-right block">جوال العميل</Label>
                    <Input
                      id="mobile"
                      type="tel"
                      placeholder="05XXXXXXXX"
                      value={mobile}
                      onChange={(e) => {
                        setMobile(e.target.value)
                        if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: undefined }))
                      }}
                      dir="ltr"
                      className={errors.mobile ? "border-destructive" : ""}
                    />
                    {errors.mobile && <p className="text-sm text-destructive">{errors.mobile}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-right block">المبلغ</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value)
                        if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }))
                      }}
                      dir="ltr"
                      className={errors.amount ? "border-destructive" : ""}
                    />
                    {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-right block">العملة</Label>
                    <Select
                      value={currencyId}
                      onValueChange={(value) => {
                        setCurrencyId(value)
                        if (errors.currency) setErrors((prev) => ({ ...prev, currency: undefined }))
                      }}
                    >
                      <SelectTrigger
                        id="currency"
                        className={`text-right [&>span]:text-right ${errors.currency ? "border-destructive" : ""}`}
                      >
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
                    {errors.currency && <p className="text-sm text-destructive">{errors.currency}</p>}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" className="min-w-40" disabled={isCreating}>
                  {isCreating ? "جاري الإنشاء..." : "إنشاء كود"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="border bg-card/80 shadow-sm lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              معاينة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-xs text-muted-foreground">الجوال</span>
              <p className="font-mono text-sm mt-0.5" dir="ltr">{mobile || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">المبلغ</span>
              <p className="text-sm mt-0.5">
                {amount ? `${parseFloat(amount).toLocaleString("en-US")}` : "—"}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">العملة</span>
              <p className="text-sm mt-0.5">{selectedCurrency ? `${selectedCurrency.code} - ${selectedCurrency.name}` : "—"}</p>
            </div>
            <div className="pt-3 border-t">
              <p className="text-lg font-bold text-center">
                {amount && selectedCurrency
                  ? `${parseFloat(amount).toLocaleString("en-US")} ${selectedCurrency.code}`
                  : "املأ الحقول للمعاينة"}
              </p>
            </div>
            <div className="pt-2">
              <Link href="/dashboard/cashout-codes">
                <Button variant="outline" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  العودة لقائمة الأكواد
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
