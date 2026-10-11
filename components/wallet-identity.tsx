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
import { Loader2, User, UserCheck } from "lucide-react"
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
  const [fullName, setFullName] = useState(identity?.fullName || wallet?.name || "")
  const [address, setAddress] = useState(identity?.address || wallet?.address || "")
  const [birthdate, setBirthdate] = useState(() => isoToDateInput(identity?.dateOfBirth || ""))
  const [gender, setGender] = useState<"male" | "female" | "">(identity?.gender || "")
  const verified = identity?.status === "verified"
  const isActive = wallet?.active !== false
  const locked = verified || isActive
  const [idNumber, setIdNumber] = useState<string>(document?.number || "")
  const [type, setType] = useState<"national" | "passport">(
    document?.attachmentType === "passport" ? "passport" : "national"
  )
  const [expdate, setExpdate] = useState<string>(() => isoToDateInput(document?.expiryDate || ""))

  const storedImages = linkedIdentityImages(identity, imageBase)
  const storedPreviews = storedIdentityPreviewMap(storedImages)
  const identityImages = useIdentityImages(["front", "back", "selfie"], storedPreviews)

  const [isSaving, setIsSaving] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")

  const walletId = wallet?.id || wallet?._id

  const handleLinkExisting = async () => {
    setError("")
    setSuccess("")
    setIsLinking(true)
    try {
      const res = await apiClient.agentLinkExistingWalletIdentity(walletId)
      if (!res.success) {
        setError(res.message || "لم يتم العثور على هوية مطابقة يمكن ربطها.")
        return
      }
      setSuccess("تم ربط الهوية الموجودة بالمحفظة دون تعديل بياناتها.")
      toast.success("تم ربط الهوية الموجودة بالمحفظة.")
      onUpdated?.()
    } catch {
      setError("تعذر ربط الهوية الموجودة بالمحفظة.")
    } finally {
      setIsLinking(false)
    }
  }

  useEffect(() => {
    const current = linkedIdentityDocument(identity)
    setFullName(identity?.fullName || wallet?.name || "")
    setAddress(identity?.address || wallet?.address || "")
    setBirthdate(isoToDateInput(identity?.dateOfBirth || ""))
    setGender(identity?.gender || "")
    setIdNumber(current?.number || "")
    setType(current?.attachmentType === "passport" ? "passport" : "national")
    setExpdate(isoToDateInput(current?.expiryDate || ""))
  }, [identity, wallet])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (locked) return
    setError("")
    setSuccess("")
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }
    setIsSaving(true)
    try {
      const ok = await performSave()
      if (!ok) return
      setSuccess("تم حفظ الهوية بنجاح.")
      toast.success("تم حفظ الهوية بنجاح.")
      onUpdated?.()
    } catch {
      setError("فشل في حفظ الهوية. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsSaving(false)
    }
  }

  const validateForm = (): string | "" => {
    if (!fullName.trim()) return "أدخل الاسم الكامل كما يظهر في الهوية"
    if (fullName.trim().split(/\s+/).length < 3) return "أدخل الاسم الأول واسم الأب واسم العائلة على الأقل"
    if (!idNumber.trim()) return "أدخل رقم الهوية"
    if (birthdate && !isValidDateInput(birthdate)) {
      return "تاريخ الميلاد غير مكتمل — أدخل التاريخ بصيغة DD-MM-YYYY"
    }
    if (birthdate && new Date(dateInputToISO(birthdate)) > new Date()) {
      return "تاريخ الميلاد لا يمكن أن يكون في المستقبل"
    }
    if (expdate && !isValidDateInput(expdate)) {
      return "تاريخ الانتهاء غير مكتمل — أدخل التاريخ بصيغة DD-MM-YYYY"
    }
    const hasNewImage = Object.values(identityImages.files).some(Boolean)
    const documentChanged = identityRef && (
      idNumber !== (document?.number || "") ||
      type !== (document?.attachmentType === "passport" ? "passport" : "national") ||
      expdate !== isoToDateInput(document?.expiryDate || "")
    )
    if (documentChanged && (!identityImages.files.front || !identityImages.files.back)) {
      return "لتغيير رقم الهوية أو نوعها أو تاريخ الانتهاء، ارفع صورتي الوجه والخلف مع البيانات الجديدة"
    }
    if ((!address.trim() && identity?.address) || (!birthdate && identity?.dateOfBirth) || (!gender && identity?.gender)) {
      return "لا يدعم الخادم حذف البيانات الشخصية المسجلة؛ أدخل قيمة بديلة"
    }
    if (!identityRef && (!identityImages.files.front || !identityImages.files.back)) {
      return "اربط الهوية الموجودة أولاً، أو ارفع صورتي الوجه والخلف لتسجيل هوية جديدة."
    }
    if (hasNewImage && (!identityImages.files.front || !identityImages.files.back)) {
      return "يجب رفع الصورتين الأمامية والخلفية معاً عند تحديث صور الهوية."
    }
    return ""
  }

  const performSave = async (): Promise<boolean> => {
    const res = await apiClient.agentUpsertWalletIdentity({
      walletId,
      fullName: fullName.trim().replace(/\s+/g, " "),
      address: address.trim() || undefined,
      dateOfBirth: birthdate ? dateInputToISO(birthdate) : undefined,
      gender: gender || undefined,
      idNumber: idNumber || undefined,
      type,
      expdate: expdate ? dateInputToISO(expdate) : undefined,
      idImageFront: identityImages.files.front,
      idImageBack: identityImages.files.back,
      idImageSelfi: identityImages.files.selfie,
    })
    if (!res.success) {
      setError(res.message || "Failed to save identity")
      return false
    }
    // The save endpoint determines success. Refresh through onUpdated after
    // the operation, without making read-back comparisons an activation gate.
    identityImages.reset()
    return true
  }

  // Activation is part of the identity action, never a separate standalone step:
  // for an inactive wallet the agent saves the identity and activates in one go.
  const handleActivate = async () => {
    setError("")
    setSuccess("")
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }
    setActivating(true)
    try {
      const hasNewData = Boolean(
        identityImages.files.front || identityImages.files.back || identityImages.files.selfie ||
        fullName !== (identity?.fullName || wallet?.name || "") ||
        address !== (identity?.address || wallet?.address || "") ||
        birthdate !== isoToDateInput(identity?.dateOfBirth || "") ||
        gender !== (identity?.gender || "") ||
        idNumber !== (document?.number || "") ||
        expdate !== isoToDateInput(document?.expiryDate || "") ||
        type !== (document?.attachmentType === "passport" ? "passport" : "national")
      )
      if (!identityRef || hasNewData) {
        const ok = await performSave()
        if (!ok) return
      }
      const res = await apiClient.updateWallet(walletId, { active: true })
      if (!res.success) {
        setError(res.message || "تم حفظ الهوية، لكن تعذر تفعيل المحفظة — حاول التفعيل مجدداً.")
        return
      }
      setSuccess("تم حفظ الهوية وتفعيل المحفظة.")
      toast.success("تم تفعيل المحفظة.")
      onUpdated?.()
    } catch {
      setError("تعذر تفعيل المحفظة. يرجى المحاولة مرة أخرى.")
    } finally {
      setActivating(false)
    }
  }

  const title = locked ? "بيانات الهوية" : identityRef ? "تحديث الهوية" : "ربط أو تسجيل الهوية"
  const description = verified
    ? "الهوية موثقة ولا يمكن تعديلها"
    : isActive
      ? "المحفظة مفعّلة — لا يمكن تعديل هويتها من قبل الوكيل"
      : identityRef
        ? "الصور اختيارية، وعند تحديثها يجب رفع الوجهين الأمامي والخلفي معاً — التفعيل يتم بالحفظ"
        : "اربط هوية مطابقة موجودة، أو ارفع الوجهين لتسجيل هوية جديدة — ثم فعّل المحفظة من زر حفظ وتفعيل"

  const personalDetails = (
    <>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="identity-address">العنوان</Label>
          <Input id="identity-address" value={address} onChange={(e) => setAddress(e.target.value)}
            readOnly={locked} placeholder="المدينة، المنطقة، الشارع" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="identity-birthdate">تاريخ الميلاد</Label>
          <DateInput id="identity-birthdate" value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)} disabled={locked} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="identity-gender">الجنس</Label>
          <Select value={gender} onValueChange={(value) => setGender(value as "male" | "female")} disabled={locked}>
            <SelectTrigger id="identity-gender"><SelectValue placeholder="اختر الجنس" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">ذكر</SelectItem>
              <SelectItem value="female">أنثى</SelectItem>
            </SelectContent>
          </Select>
        </div>
    </>
  )

  return (
    <Card className="rounded-xl [&_input]:h-10 [&_button[role=combobox]]:h-10 [&_label]:text-xs">
      <CardHeader className="px-4 py-4">
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
      <CardContent className="px-4 pb-4">
        {!locked && !identityRef && (
          <div className="mb-4 rounded-lg border bg-muted/30 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">هل هوية العميل مسجلة مسبقاً؟</p>
                <p className="mt-1 text-xs text-muted-foreground">سيتم الربط فقط عند تطابق اسم العميل ورقم جواله بالكامل.</p>
              </div>
              <Button type="button" variant="outline" onClick={handleLinkExisting} disabled={isLinking || isSaving}>
                {isLinking ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <UserCheck className="ml-2 h-4 w-4" />}
                ربط الهوية الموجودة
              </Button>
            </div>
          </div>
        )}
        {!locked && <form onSubmit={handleSave} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-right block">الاسم الكامل</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
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
            {personalDetails}
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

          <div className="flex justify-end gap-2">
            {!isActive && (
              <Button
                type="button"
                onClick={handleActivate}
                disabled={isSaving || locked || activating || isLinking}
                className="min-w-40"
              >
                {activating ? "جاري التفعيل..." : "حفظ وتفعيل"}
              </Button>
            )}
            <Button type="submit" disabled={isSaving || locked || activating} className="min-w-40">
              {isSaving ? "جاري الحفظ..." : "حفظ الهوية"}
            </Button>
          </div>
        </form>}
        {locked && (
          <div className="grid gap-3 md:grid-cols-2 text-right">
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
            {personalDetails}
          </div>
        )}
        {locked && (
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
