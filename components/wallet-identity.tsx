"use client"

import { useEffect, useState } from "react"
import { FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api"
import type { WalletIdentitySaveResult } from "@/lib/api"
import { walletIdentitySaveFields } from "@/lib/wallet-data"
import type { WalletIdentityForm } from "@/lib/wallet-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateInput, isoToDateInput } from "@/components/ui/date-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { IdentityImagesSection, linkedIdentityDocument, linkedIdentityImages, storedIdentityPreviewMap, useIdentityImages } from "@/components/identity"
import type { LinkedIdentity } from "@/components/identity"

export function WalletIdentity({ wallet, identity, loading = false, onSaved, onBusyChange, onDirtyChange }: {
  wallet: any
  identity?: LinkedIdentity | null
  loading?: boolean
  onSaved: (result: WalletIdentitySaveResult) => void
  onBusyChange?: (busy: boolean) => void
  onDirtyChange?: (dirty: boolean) => void
}) {
  const walletId = wallet.id || wallet._id
  const document = linkedIdentityDocument(identity)
  const linked = Boolean(wallet.identityLink?.identityRef)
  const active = wallet.active !== false
  const rejected = identity?.status === "rejected"
  const verified = identity?.status === "verified"
  const verifiedDocument = document?.status === "verified"
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [imageVersion, setImageVersion] = useState(0)
  const snapshot = JSON.stringify({
    fullName: identity?.fullName || wallet.name || "",
    address: identity?.address || "",
    gender: identity?.gender || "",
    dateOfBirth: isoToDateInput(identity?.dateOfBirth),
    type: document?.attachmentType === "passport" ? "passport" : "national",
    idNumber: document?.number || "",
    idIssueDate: isoToDateInput(document?.issueDate),
    expdate: isoToDateInput(document?.expiryDate),
    idIssuePlace: document?.issuePlace || "",
  } satisfies WalletIdentityForm)
  const [baseline, setBaseline] = useState<WalletIdentityForm>(() => JSON.parse(snapshot))
  const [draft, setDraft] = useState<WalletIdentityForm>(baseline)
  useEffect(() => {
    const values = JSON.parse(snapshot) as WalletIdentityForm
    setBaseline(values)
    setDraft(values)
  }, [snapshot])

  const imageBase = wallet.identityLink?.identityRef
    ? `/api/proxy/agent/identities/${encodeURIComponent(String(wallet.identityLink.identityRef))}/document-image?version=${imageVersion}`
    : undefined
  const images = useIdentityImages(["front", "back", "selfie"], storedIdentityPreviewMap(linkedIdentityImages(identity, imageBase)))
  const hasImages = Object.values(images.files).some(Boolean)
  const dirty = JSON.stringify(baseline) !== JSON.stringify(draft) || hasImages
  const locked = active || rejected || verified || loading
  const disabled = locked || saving
  useEffect(() => { onBusyChange?.(saving) }, [saving, onBusyChange])
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])

  const reset = () => { setDraft({ ...baseline }); images.reset(); setError("") }
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (disabled) return
    setError("")
    try {
      if (hasImages && (!images.files.front || !images.files.back)) throw new Error("يجب رفع صورتي الوجه الأمامي والخلفي معاً")
      const fields = walletIdentitySaveFields(baseline, draft, { hasIdentity: linked, hasDocument: Boolean(document), hasImages })
      if (!Object.keys(fields).length && !hasImages) return
      setSaving(true)
      const response = await apiClient.saveWalletIdentity(walletId, fields, images.files)
      if (!response.success || !response.data) { setError(response.message || "تعذر حفظ البيانات والهوية"); return }
      images.reset()
      setImageVersion(value => value + 1)
      setBaseline({ ...draft })
      onSaved(response.data)
      toast.success("تم حفظ البيانات والهوية")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ البيانات والهوية")
    } finally { setSaving(false) }
  }

  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />{linked ? "بيانات العميل والهوية" : "تسجيل هوية العميل"}</CardTitle>
      <CardDescription>{active ? "المحفظة مفعّلة — البيانات للعرض فقط" : verified ? "الهوية موثقة ولا يمكن تعديلها" : rejected ? "الهوية مرفوضة؛ يلزم مراجعة المسؤول" : "أدخل البيانات واحفظها مرة واحدة؛ الصور مطلوبة للهوية الجديدة أو لاستبدال الوثيقة فقط"}</CardDescription>
    </CardHeader>
    <CardContent>
      {loading && <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />جاري تحميل البيانات...</p>}
      <form onSubmit={save} className="space-y-5">
        <fieldset disabled={disabled} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="wallet-fullName">الاسم الكامل</Label><Input id="wallet-fullName" value={draft.fullName} onChange={event => setDraft({ ...draft, fullName: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="wallet-address">العنوان</Label><Input id="wallet-address" value={draft.address} onChange={event => setDraft({ ...draft, address: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="wallet-birthdate">تاريخ الميلاد</Label><DateInput id="wallet-birthdate" value={draft.dateOfBirth} onChange={event => setDraft({ ...draft, dateOfBirth: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="wallet-gender">الجنس</Label><Select value={draft.gender} disabled={disabled} onValueChange={gender => setDraft({ ...draft, gender })}><SelectTrigger id="wallet-gender"><SelectValue placeholder="اختر الجنس" /></SelectTrigger><SelectContent><SelectItem value="male">ذكر</SelectItem><SelectItem value="female">أنثى</SelectItem></SelectContent></Select></div>
        </fieldset>
        <div className="border-t pt-4">
          <h3 className="mb-4 text-sm font-semibold">وثيقة الهوية</h3>
          {verifiedDocument && !locked && <p className="mb-3 text-xs text-muted-foreground">الوثيقة موثقة؛ يسمح فقط بإكمال التواريخ الناقصة.</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="wallet-idNumber">رقم الوثيقة</Label><Input id="wallet-idNumber" dir="ltr" value={draft.idNumber} disabled={disabled || verifiedDocument} onChange={event => setDraft({ ...draft, idNumber: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="wallet-idType">نوع الوثيقة</Label><Select value={draft.type} disabled={disabled || verifiedDocument} onValueChange={type => setDraft({ ...draft, type: type as "national" | "passport" })}><SelectTrigger id="wallet-idType"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="national">بطاقة شخصية</SelectItem><SelectItem value="passport">جواز سفر</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="wallet-issueDate">تاريخ الإصدار</Label><DateInput id="wallet-issueDate" value={draft.idIssueDate} disabled={disabled || (verifiedDocument && Boolean(baseline.idIssueDate))} onChange={event => setDraft({ ...draft, idIssueDate: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="wallet-expdate">تاريخ الانتهاء</Label><DateInput id="wallet-expdate" value={draft.expdate} disabled={disabled || (verifiedDocument && Boolean(baseline.expdate))} onChange={event => setDraft({ ...draft, expdate: event.target.value })} /></div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="wallet-issuePlace">مكان الإصدار</Label><Input id="wallet-issuePlace" value={draft.idIssuePlace} disabled={disabled || verifiedDocument} onChange={event => setDraft({ ...draft, idIssuePlace: event.target.value })} /></div>
          </div>
        </div>
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold">صور الوثيقة</h3>
          {!locked && !verifiedDocument && <p className="text-xs text-muted-foreground">لتسجيل هوية جديدة أو استبدال الوثيقة غير الموثقة ارفع الوجهين معاً. تعديل العنوان أو البيانات المسجلة لا يتطلب إعادة رفع الصور.</p>}
          <IdentityImagesSection slots={["front", "back", "selfie"]} files={images.files} previews={images.previews} onImageChange={images.set} locked={disabled || verifiedDocument} columns={3} />
        </div>
        {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        {!locked && <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving || !dirty} onClick={reset}>تراجع</Button><Button type="submit" disabled={saving || (!dirty && linked)}>{saving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}حفظ البيانات والهوية</Button></div>}
      </form>
    </CardContent>
  </Card>
}
