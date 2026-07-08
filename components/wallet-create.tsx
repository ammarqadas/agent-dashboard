"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { UserPlus, Save, User, Lock, MapPin, XCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { apiClient } from "@/lib/api"

function validateMobile(mobile: string): string | null {
  if (!/^\d{9,15}$/.test(mobile)) return "رقم الجوال غير صحيح. يجب أن يحتوي على 9 إلى 15 رقم"
  return null
}

export function WalletCreate() {
  const [name, setName] = useState("")
  const [mobile, setMobile] = useState("")
  const [password, setPassword] = useState("")
  const [address, setAddress] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; mobile?: string }>({})
  const [createdWallet, setCreatedWallet] = useState<any>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const validate = (): boolean => {
    const newErrors: typeof errors = {}
    if (!name.trim()) newErrors.name = "يرجى إدخال اسم صاحب المحفظة"
    const mobileErr = validateMobile(mobile)
    if (mobileErr) newErrors.mobile = mobileErr
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsCreating(true)
    setCreatedWallet(null)
    setFormError(null)
    try {
      const payload: { name: string; mobile: string; password?: string; address?: string } = {
        name: name.trim(),
        mobile: mobile.trim(),
      }
      if (password) payload.password = password
      if (address.trim()) payload.address = address.trim()

      const response = await apiClient.createWallet(payload)

      if (response.success) {
        const wallet = response.wallet || response.result
        setCreatedWallet(wallet)

        toast.success("تم إنشاء المحفظة بنجاح", {
          description: `الاسم: ${wallet?.name || name} | الجوال: ${wallet?.mobile || mobile}`,
          duration: 6000,
        })

        setName("")
        setMobile("")
        setPassword("")
        setAddress("")
        setErrors({})
      } else {
        setFormError(response.message || "فشل في إنشاء المحفظة")
      }
    } catch {
      setFormError("حدث خطأ أثناء إنشاء المحفظة. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsCreating(false)
    }
  }, [name, mobile, password, address])

  if (createdWallet) {
    return (
      <Card className="border bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            تم إنشاء المحفظة بنجاح
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <span className="text-xs text-muted-foreground">الاسم</span>
                <p className="text-sm font-medium">{createdWallet.name}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">الجوال</span>
                <p className="text-sm font-mono" dir="ltr">{createdWallet.mobile}</p>
              </div>
              {createdWallet.address && (
                <div>
                  <span className="text-xs text-muted-foreground">العنوان</span>
                  <p className="text-sm">{createdWallet.address}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-muted-foreground">الحالة</span>
                <p className="text-sm">
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    غير مفعّل
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCreatedWallet(null)}>
              إنشاء محفظة أخرى
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="border bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle>إنشاء محفظة جديدة</CardTitle>
            <CardDescription>إنشاء محفظة جديدة للعميل</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4">
                <Label className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <User className="h-4 w-4" />
                  بيانات العميل
                </Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-right block">اسم صاحب المحفظة</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="الاسم الكامل"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
                        if (formError) setFormError(null)
                      }}
                      className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobile" className="text-right block">رقم الجوال</Label>
                    <Input
                      id="mobile"
                      type="tel"
                      placeholder="9-15 رقم"
                      value={mobile}
                      onChange={(e) => {
                        setMobile(e.target.value)
                        if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: undefined }))
                        if (formError) setFormError(null)
                      }}
                      dir="ltr"
                      className={errors.mobile ? "border-destructive" : ""}
                    />
                    {errors.mobile && <p className="text-sm text-destructive">{errors.mobile}</p>}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/20 p-4">
                <Label className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Lock className="h-4 w-4" />
                  كلمة المرور (اختياري)
                </Label>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-right block">كلمة المرور</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="اتركه فارغًا ليتم استخدام رقم الجوال"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (formError) setFormError(null)
                    }}
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">إذا لم تُدخل كلمة مرور، سيتم استخدام رقم الجوال ككلمة مرور.</p>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/20 p-4">
                <Label className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4" />
                  العنوان (اختياري)
                </Label>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-right block">العنوان</Label>
                  <Input
                    id="address"
                    type="text"
                    placeholder="المدينة / المنطقة"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value)
                      if (formError) setFormError(null)
                    }}
                  />
                </div>
              </div>

              {formError && (
                <Alert variant="destructive" className="rounded-xl">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription className="font-medium">{formError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end">
                <Button type="submit" className="min-w-40 gap-2" disabled={isCreating}>
                  {isCreating ? (
                    <>جاري الإنشاء...</>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      إنشاء المحفظة
                    </>
                  )}
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
              <UserPlus className="h-4 w-4" />
              معاينة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-xs text-muted-foreground">الاسم</span>
              <p className="text-sm mt-0.5">{name || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">الجوال</span>
              <p className="font-mono text-sm mt-0.5" dir="ltr">{mobile || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">كلمة المرور</span>
              <p className="text-sm mt-0.5">{password ? "••••••••" : "يستخدم رقم الجوال"}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">العنوان</span>
              <p className="text-sm mt-0.5">{address || "—"}</p>
            </div>
            <div className="pt-3 border-t">
              <p className="text-sm font-bold text-center text-primary">
                {name && mobile ? `${name}` : "املأ الحقول للمعاينة"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
