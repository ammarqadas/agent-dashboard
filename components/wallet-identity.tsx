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

function mediaUrl(m: any): string | null {
  if (!m) return null
  if (typeof m === "string" || typeof m === "number") return null
  return m.url || m?.sizes?.square?.url || m?.sizes?.thumbnail?.url || null
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

  const existingImages = useMemo(() => {
    const imgs: Array<{ label: string; url: string }> = []
    const frontUrl = mediaUrl(card?.idImageFront)
    const backUrl = mediaUrl(card?.idImageBack)
    const selfiUrl = mediaUrl(card?.idImageSelfi)
    if (frontUrl) imgs.push({ label: "Front", url: frontUrl })
    if (backUrl) imgs.push({ label: "Back", url: backUrl })
    if (selfiUrl) imgs.push({ label: "Selfie", url: selfiUrl })
    return imgs
  }, [card])

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
      setSuccess("Identity saved successfully.")
      onUpdated?.()
    } catch (err) {
      setError("Failed to save identity. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>الهوية</CardTitle>
          <CardDescription>
            عرض أو تحديث بيانات هوية المحفظة ورفع صور الهوية (للوكيل).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {card ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Full name</div>
                <div className="font-medium">{card.fullName || "—"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">ID number</div>
                <div className="font-medium">{card.idNumber || "—"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Type</div>
                <div className="font-medium">{card.type || "—"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Expiry</div>
                <div className="font-medium">
                  {card.expdate ? String(card.expdate).slice(0, 10) : "—"}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No identity card linked to this wallet yet.
            </div>
          )}

          {existingImages.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium">Existing images</div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {existingImages.map((img) => (
                    <div key={img.label} className="rounded-lg border p-2">
                      <div className="mb-2 text-xs text-muted-foreground">
                        {img.label}
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.label}
                        className="h-40 w-full rounded-md object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تحديث الهوية</CardTitle>
          <CardDescription>
            أضف/عدّل بيانات الهوية وارفع الصور. الصور اختيارية—ارفع فقط ما تريد تحديثه.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="rounded-lg border bg-muted/20 p-4">
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

            <div className="rounded-lg border bg-muted/20 p-4">
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
              </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

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


