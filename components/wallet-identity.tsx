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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wallet-identity.tsx:18',message:'mediaUrl called',data:{input:m,type:typeof m,isString:typeof m === 'string',isObject:typeof m === 'object'},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  if (!m) return null
  // If it's already a string URL, return it
  if (typeof m === "string" && m.startsWith("http")) return m
  // If it's an object, try to get the URL
  if (typeof m === "object") {
    const url = m.url || m?.sizes?.square?.url || m?.sizes?.thumbnail?.url || null
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wallet-identity.tsx:24',message:'mediaUrl result',data:{url,hasUrl:!!m.url,hasSizesSquare:!!m?.sizes?.square?.url,hasSizesThumbnail:!!m?.sizes?.thumbnail?.url,objectKeys:Object.keys(m || {})},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return url
  }
  return null
}

export function WalletIdentity({
  wallet,
  onUpdated,
}: {
  wallet: any
  onUpdated?: () => void
}) {
  const card = wallet?.card && typeof wallet.card === "object" ? wallet.card : null

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wallet-identity.tsx:36',message:'WalletIdentity component render',data:{hasWallet:!!wallet,hasCard:!!card,walletKeys:wallet ? Object.keys(wallet) : [],cardKeys:card ? Object.keys(card) : [],idImageFront:card?.idImageFront,idImageBack:card?.idImageBack,idImageSelfi:card?.idImageSelfi,imageProperty:card?.image,imageType:typeof card?.image,imageKeys:card?.image ? Object.keys(card.image) : []},timestamp:Date.now(),runId:'run2',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

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
    const imgs: Array<{ label: string; labelAr: string; url: string }> = []
    
    // Try individual fields first (if populated with proper depth)
    let frontUrl = mediaUrl(card?.idImageFront)
    let backUrl = mediaUrl(card?.idImageBack)
    let selfiUrl = mediaUrl(card?.idImageSelfi)
    
    // If individual fields are not available, check the image array
    // The image array might contain the images in order: [front, back, selfie]
    if (!frontUrl && !backUrl && !selfiUrl && card?.image) {
      const imageArray = Array.isArray(card.image) ? card.image : [card.image]
      if (imageArray.length > 0) frontUrl = mediaUrl(imageArray[0])
      if (imageArray.length > 1) backUrl = mediaUrl(imageArray[1])
      if (imageArray.length > 2) selfiUrl = mediaUrl(imageArray[2])
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wallet-identity.tsx:66',message:'existingImages useMemo',data:{frontUrl,backUrl,selfiUrl,hasImageArray:!!card?.image,imageArrayLength:Array.isArray(card?.image) ? card.image.length : (card?.image ? 1 : 0),imagesCount:imgs.length},timestamp:Date.now(),runId:'run2',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    if (frontUrl) imgs.push({ label: "Front", labelAr: "صورة الهوية (أمام)", url: frontUrl })
    if (backUrl) imgs.push({ label: "Back", labelAr: "صورة الهوية (خلف)", url: backUrl })
    if (selfiUrl) imgs.push({ label: "Selfie", labelAr: "صورة سيلفي", url: selfiUrl })
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wallet-identity.tsx:75',message:'existingImages final result',data:{finalCount:imgs.length,images:imgs.map(i => ({label:i.label,url:i.url}))},timestamp:Date.now(),runId:'run2',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
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

          {/* #region agent log */}
          {(() => {
            fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wallet-identity.tsx:139',message:'Rendering check for existingImages',data:{existingImagesLength:existingImages.length,willRender:existingImages.length > 0},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            return null;
          })()}
          {/* #endregion */}
          {existingImages.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="text-base font-semibold">صور الهوية</div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {existingImages.map((img) => {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wallet-identity.tsx:182',message:'Rendering image',data:{label:img.label,url:img.url,urlType:typeof img.url},timestamp:Date.now(),runId:'run2',hypothesisId:'D'})}).catch(()=>{});
                    // #endregion
                    return (
                      <div key={img.label} className="rounded-lg border overflow-hidden bg-card">
                        <div className="p-3 bg-muted/50 border-b">
                          <div className="text-sm font-medium text-right">{img.labelAr}</div>
                        </div>
                        <div className="p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt={img.labelAr}
                            className="w-full rounded-md object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            style={{ minHeight: "200px", maxHeight: "300px" }}
                            onClick={() => window.open(img.url, "_blank")}
                            onError={(e) => {
                              // #region agent log
                              fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wallet-identity.tsx:195',message:'Image load error',data:{label:img.label,url:img.url},timestamp:Date.now(),runId:'run2',hypothesisId:'D'})}).catch(()=>{});
                              // #endregion
                            }}
                            onLoad={() => {
                              // #region agent log
                              fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wallet-identity.tsx:201',message:'Image loaded successfully',data:{label:img.label,url:img.url},timestamp:Date.now(),runId:'run2',hypothesisId:'D'})}).catch(()=>{});
                              // #endregion
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
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


