"use client"

import { useMemo, useState } from "react"
import { apiClient } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateInput, isValidDateInput, dateInputToISO, isoToDateInput } from "@/components/ui/date-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { User } from "lucide-react"
import { toast } from "sonner"
import { IdentityImagesSection, useIdentityImages, collectStoredIdentityImages, storedIdentityPreviewMap } from "@/components/identity"

export function WalletIdentity({
  wallet,
  onUpdated,
}: {
  wallet: any
  onUpdated?: () => void
}) {
  const card = wallet?.card && typeof wallet.card === "object" ? wallet.card : null

  const [fullName, setFullName] = useState<string>(card?.fullName || "")
  const [idNumber, setIdNumber] = useState<string>(card?.idNumber || "")
  const [type, setType] = useState<"national" | "passport">(
    (card?.type === "passport" ? "passport" : "national") as any
  )
  const [expdate, setExpdate] = useState<string>(() => isoToDateInput(card?.expdate ? String(card.expdate) : ""))

  const storedImages = useMemo(() => collectStoredIdentityImages(card), [card])
  const storedPreviews = useMemo(() => storedIdentityPreviewMap(storedImages), [storedImages])
  const identityImages = useIdentityImages(["front", "back", "selfie"], storedPreviews)

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")

  const walletId = wallet?.id || wallet?._id

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    if (expdate && !isValidDateInput(expdate)) {
      setError("تاريخ الانتهاء غير مكتمل — أدخل التاريخ بصيغة DD-MM-YYYY")
      return
    }
    setIsSaving(true)
    try {
      const res = await apiClient.agentUpsertWalletIdentity({
        walletId,
        fullName: fullName || undefined,
        idNumber: idNumber || undefined,
        type,
        expdate: expdate ? dateInputToISO(expdate) : undefined,
        idImageFront: identityImages.files.front,
        idImageBack: identityImages.files.back,
        idImageSelfi: identityImages.files.selfie,
      })

      if (!res.success) {
        setError(res.message || "Failed to save identity")
        return
      }

      identityImages.reset()
      setSuccess("تم حفظ الهوية بنجاح.")
      toast.success("تم حفظ الهوية بنجاح.")
      onUpdated?.()
    } catch (err) {
      setError("فشل في حفظ الهوية. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="icon-container">
            <User className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>تحديث الهوية</CardTitle>
            <CardDescription>الصور اختيارية — ارفع فقط ما تريد تحديثه</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-right block">الاسم الكامل</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="الاسم الكامل"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idNumber" className="text-right block">رقم الهوية</Label>
              <Input
                id="idNumber"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="رقم الهوية"
                required
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-right block">النوع</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger className="text-right [&>span]:text-right">
                  <SelectValue placeholder="اختر النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national" className="text-right">بطاقة شخصية</SelectItem>
                  <SelectItem value="passport" className="text-right">جواز سفر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expdate" className="text-right block">تاريخ الانتهاء</Label>
              <DateInput
                id="expdate"
                value={expdate}
                onChange={(e) => setExpdate(e.target.value)}
              />
            </div>
          </div>

          <IdentityImagesSection
            slots={["front", "back", "selfie"]}
            files={identityImages.files}
            previews={identityImages.previews}
            onImageChange={identityImages.set}
            columns={3}
          />

          {error && <p className="text-sm text-destructive bg-destructive/5 p-3 rounded-lg border border-destructive/20">{error}</p>}
          {success && <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200">{success}</p>}

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving} className="min-w-40">
              {isSaving ? "جاري الحفظ..." : "حفظ الهوية"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
