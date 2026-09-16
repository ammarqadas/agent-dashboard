"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"
import { Lock, Loader2, AlertCircle } from "lucide-react"

const MIN_PASSWORD_LENGTH = 8

function validate(currentPassword: string, newPassword: string, confirmPassword: string) {
  const errors: { currentPassword?: string; newPassword?: string; confirmPassword?: string } = {}

  if (!currentPassword) errors.currentPassword = "يرجى إدخال كلمة المرور الحالية"
  if (!newPassword) errors.newPassword = "يرجى إدخال كلمة المرور الجديدة"
  else if (newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل`
  }
  if (!confirmPassword) errors.confirmPassword = "يرجى تأكيد كلمة المرور الجديدة"
  else if (newPassword && confirmPassword !== newPassword) {
    errors.confirmPassword = "كلمتا المرور غير متطابقتين"
  }

  return errors
}

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [errors, setErrors] = useState<{ currentPassword?: string; newPassword?: string; confirmPassword?: string }>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const validationErrors = validate(currentPassword, newPassword, confirmPassword)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setIsSubmitting(true)
    try {
      const response = await apiClient.changePassword({ currentPassword, newPassword })

      // Upstream may answer with a plain 2xx body without a `success` flag,
      // so only an explicit `success: false` counts as a failure.
      const failed = (response as { success?: boolean }).success === false

      if (!failed) {
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        toast.success("تم تغيير كلمة المرور بنجاح")
      } else {
        setError(response.message || "لم يتم تغيير كلمة المرور. يرجى المحاولة مرة أخرى.")
      }
    } catch (err) {
      setError("حدث خطأ. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="rounded-xl border border-border/60">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          تغيير كلمة المرور
        </CardTitle>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3 px-4 pb-4 pt-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-start">
            <div className="flex flex-col gap-1">
              <Label htmlFor="current-password" className="text-right block text-xs font-medium text-muted-foreground">
                كلمة المرور الحالية
              </Label>
              <Input
                id="current-password"
                type="password"
                disabled={isSubmitting}
                autoComplete="current-password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-9"
              />
              <p className="min-h-4 text-xs text-destructive">{errors.currentPassword || ""}</p>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="new-password" className="text-right block text-xs font-medium text-muted-foreground">
                كلمة المرور الجديدة
              </Label>
              <Input
                id="new-password"
                type="password"
                disabled={isSubmitting}
                autoComplete="new-password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-9"
              />
              <p className={`min-h-4 text-xs ${errors.newPassword ? "text-destructive" : "text-muted-foreground/80"}`}>
                {errors.newPassword || `${MIN_PASSWORD_LENGTH} أحرف على الأقل`}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="confirm-password" className="text-right block text-xs font-medium text-muted-foreground">
                تأكيد كلمة المرور
              </Label>
              <Input
                id="confirm-password"
                type="password"
                disabled={isSubmitting}
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-9"
              />
              <p className="min-h-4 text-xs text-destructive">{errors.confirmPassword || ""}</p>
            </div>

            <div className="lg:mt-[1.375rem]">
              <Button type="submit" className="h-9 w-full gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>جاري التغيير...</span>
                  </>
                ) : (
                  "تغيير كلمة المرور"
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-2 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive font-medium">{error}</p>
            </div>
          )}
        </CardContent>
      </form>
    </Card>
  )
}
