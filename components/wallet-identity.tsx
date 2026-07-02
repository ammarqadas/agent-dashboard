"use client"

import { useMemo, useState } from "react"
import { apiClient } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { User, CreditCard, Calendar, FileImage } from "lucide-react"

function mediaUrl(m: any): string | null {
  if (!m) return null
  if (typeof m === "string" && m.startsWith("http")) return m
  if (typeof m === "object") {
    return m.url || m?.sizes?.square?.url || m?.sizes?.thumbnail?.url || null
  }
  return null
}

export function WalletIdentityDisplay({ wallet }: { wallet: any }) {
  const card = wallet?.card && typeof wallet.card === "object" ? wallet.card : null

  const existingImages = useMemo(() => {
    const imgs: Array<{ label: string; labelAr: string; url: string }> = []

    let frontUrl = mediaUrl(card?.idImageFront)
    let backUrl = mediaUrl(card?.idImageBack)
    let selfiUrl = mediaUrl(card?.idImageSelfi)

    if (!frontUrl && !backUrl && !selfiUrl && card?.image) {
      const imageArray = Array.isArray(card.image) ? card.image : [card.image]
      if (imageArray.length > 0) frontUrl = mediaUrl(imageArray[0])
      if (imageArray.length > 1) backUrl = mediaUrl(imageArray[1])
      if (imageArray.length > 2) selfiUrl = mediaUrl(imageArray[2])
    }

    if (frontUrl) imgs.push({ label: "Front", labelAr: "صورة الهوية (أمام)", url: frontUrl })
    if (backUrl) imgs.push({ label: "Back", labelAr: "صورة الهوية (خلف)", url: backUrl })
    if (selfiUrl) imgs.push({ label: "Selfie", labelAr: "صورة سيلفي", url: selfiUrl })

    return imgs
  }, [card])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="icon-container">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>بيانات الهوية</CardTitle>
            <CardDescription>معلومات هوية صاحب المحفظة</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {card ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
                <div className="icon-container shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">الاسم الكامل</p>
                  <p className="font-semibold truncate">{card.fullName || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
                <div className="icon-container shrink-0">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">رقم الهوية</p>
                  <p className="font-semibold truncate" dir="ltr">{card.idNumber || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
                <div className="icon-container shrink-0">
                  <FileImage className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">نوع الهوية</p>
                  <p className="font-semibold">{card.type === "passport" ? "جواز سفر" : card.type === "national" ? "بطاقة شخصية" : card.type || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
                <div className="icon-container shrink-0">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">تاريخ الانتهاء</p>
                  <p className="font-semibold" dir="ltr">
                    {card.expdate ? String(card.expdate).slice(0, 10) : "—"}
                  </p>
                </div>
              </div>
            </div>

            {existingImages.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <FileImage className="h-4 w-4 text-primary" />
                    صور الهوية
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {existingImages.map((img) => (
                      <div key={img.label} className="rounded-xl border overflow-hidden bg-card shadow-sm">
                        <div className="p-3 bg-muted/50 border-b flex items-center gap-2">
                          <FileImage className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{img.labelAr}</span>
                        </div>
                        <div className="p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt={img.labelAr}
                            className="w-full rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            style={{ minHeight: "180px", maxHeight: "260px" }}
                            onClick={() => window.open(img.url, "_blank")}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
            <User className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>لا توجد هوية مرتبطة بهذه المحفظة</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

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
  const [expdate, setExpdate] = useState<string>(
    card?.expdate ? String(card.expdate).slice(0, 10) : ""
  )

  const [front, setFront] = useState<File | null>(null)
  const [back, setBack] = useState<File | null>(null)
  const [selfi, setSelfi] = useState<File | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")

  const walletId = wallet?.id || wallet?._id

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsSaving(true)
    try {
      const res = await apiClient.agentUpsertWalletIdentity({
        walletId,
        fullName: fullName || undefined,
        idNumber: idNumber || undefined,
        type,
        expdate: expdate || undefined,
        idImageFront: front,
        idImageBack: back,
        idImageSelfi: selfi,
      })

      if (!res.success) {
        setError(res.message || "Failed to save identity")
        return
      }

      setFront(null)
      setBack(null)
      setSelfi(null)
      setSuccess("تم حفظ الهوية بنجاح.")
      onUpdated?.()
    } catch (err) {
      setError("فشل في حفظ الهوية. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <WalletIdentityDisplay wallet={wallet} />

      {/* Update Identity Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="icon-container">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>تحديث الهوية</CardTitle>
              <CardDescription>
                أضف/عدّل بيانات الهوية وارفع الصور. الصور اختيارية — ارفع فقط ما تريد تحديثه.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="rounded-xl border bg-muted/20 p-5 space-y-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">البيانات الأساسية</h3>
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
                  <Input
                    id="expdate"
                    type="date"
                    value={expdate}
                    onChange={(e) => setExpdate(e.target.value)}
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="rounded-xl border bg-muted/20 p-5 space-y-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">المرفقات</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="front" className="text-right block">صورة الهوية (أمام)</Label>
                  <Input
                    id="front"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFront(e.target.files?.[0] || null)}
                    className="text-right file:mr-0 file:ml-auto"
                  />
                  {front && (
                    <p className="text-xs text-emerald-600 font-medium">تم اختيار: {front.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="back" className="text-right block">صورة الهوية (خلف)</Label>
                  <Input
                    id="back"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBack(e.target.files?.[0] || null)}
                    className="text-right file:mr-0 file:ml-auto"
                  />
                  {back && (
                    <p className="text-xs text-emerald-600 font-medium">تم اختيار: {back.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selfi" className="text-right block">صورة سيلفي</Label>
                  <Input
                    id="selfi"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelfi(e.target.files?.[0] || null)}
                    className="text-right file:mr-0 file:ml-auto"
                  />
                  {selfi && (
                    <p className="text-xs text-emerald-600 font-medium">تم اختيار: {selfi.name}</p>
                  )}
                </div>
              </div>
            </div>

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
    </div>
  )
}
