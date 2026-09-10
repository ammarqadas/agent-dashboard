"use client"

import { useEffect, useState } from "react"
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
import { IdentityImagesSection, linkedIdentityDocument, linkedIdentityImages, storedIdentityPreviewMap, useIdentityImages } from "@/components/identity"
import type { LinkedIdentity } from "@/components/identity"

export function WalletIdentity({
  wallet,
  identity,
  onUpdated,
}: {
  wallet: any
  identity?: LinkedIdentity | null
  onUpdated?: () => void
}) {
  const identityRef = wallet?.identityLink?.identityRef
  const imageBase = identityRef
    ? `/api/proxy/agent/identities/${encodeURIComponent(String(identityRef))}/document-image`
    : undefined
  const document = linkedIdentityDocument(identity)
  const fullName = identity?.fullName || wallet?.name || ""
  const verified = identity?.status === "verified"
  const [idNumber, setIdNumber] = useState<string>(document?.number || "")
  const [type, setType] = useState<"national" | "passport">(
    document?.attachmentType === "passport" ? "passport" : "national"
  )
  const [expdate, setExpdate] = useState<string>(() => isoToDateInput(document?.expiryDate || ""))

  const storedImages = linkedIdentityImages(identity, imageBase)
  const storedPreviews = storedIdentityPreviewMap(storedImages)
  const identityImages = useIdentityImages(["front", "back", "selfie"], storedPreviews)

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")

  const walletId = wallet?.id || wallet?._id

  useEffect(() => {
    const current = linkedIdentityDocument(identity)
    setIdNumber(current?.number || "")
    setType(current?.attachmentType === "passport" ? "passport" : "national")
    setExpdate(isoToDateInput(current?.expiryDate || ""))
  }, [identity])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (verified) return
    setError("")
    setSuccess("")
    if (expdate && !isValidDateInput(expdate)) {
      setError("تاريخ الانتهاء غير مكتمل — أدخل التاريخ بصيغة DD-MM-YYYY")
      return
    }
    const hasNewImage = Object.values(identityImages.files).some(Boolean)
    if (hasNewImage && (!identityImages.files.front || !identityImages.files.back)) {
      setError("يجب رفع الصورتين الأمامية والخلفية معاً عند تحديث صور الهوية.")
      return
    }
    setIsSaving(true)
    try {
      const res = await apiClient.agentUpsertWalletIdentity({
        walletId,
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

  const title = verified ? "بيانات الهوية" : "تحديث الهوية"
  const description = verified
    ? "الهوية موثقة ولا يمكن تعديلها"
    : "الصور اختيارية، وعند تحديثها يجب رفع الوجهين الأمامي والخلفي معاً"

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="icon-container">
            <User className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!verified && <form onSubmit={handleSave} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-right block">الاسم الكامل</Label>
              <Input
                id="fullName"
                value={fullName}
                readOnly
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
                disabled={verified}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-right block">النوع</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)} disabled={verified}>
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
                disabled={verified}
              />
            </div>
          </div>

          <IdentityImagesSection
            slots={["front", "back", "selfie"]}
            files={identityImages.files}
            previews={identityImages.previews}
            onImageChange={identityImages.set}
            locked={verified}
            columns={3}
          />

          {error && <p className="text-sm text-destructive bg-destructive/5 p-3 rounded-lg border border-destructive/20">{error}</p>}
          {success && <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200">{success}</p>}

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving || verified} className="min-w-40">
              {isSaving ? "جاري الحفظ..." : "حفظ الهوية"}
            </Button>
          </div>
        </form>}
        {verified && (
          <div className="grid gap-4 md:grid-cols-2 text-right">
            <div className="space-y-2">
              <Label className="text-right block">الاسم الكامل</Label>
              <Input id="fullName" value={fullName} readOnly placeholder="الاسم الكامل" />
            </div>
            <div className="space-y-2">
              <Label className="text-right block">رقم الهوية</Label>
              <Input id="idNumber" value={idNumber} readOnly placeholder="رقم الهوية" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label className="text-right block">النوع</Label>
              <Input
                value={type === "passport" ? "جواز سفر" : "بطاقة شخصية"}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label className="text-right block">تاريخ الانتهاء</Label>
              <Input
                id="expdate"
                value={expdate}
                readOnly
                placeholder="DD-MM-YYYY"
                dir="ltr"
              />
            </div>
          </div>
        )}
        {verified && (
          <IdentityImagesSection
            slots={["front", "back", "selfie"]}
            files={identityImages.files}
            previews={identityImages.previews}
            onImageChange={identityImages.set}
            locked
            columns={3}
          />
        )}
      </CardContent>
    </Card>
  )
}
