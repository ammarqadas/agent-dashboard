"use client"

import { FileImage, UserRound } from "lucide-react"
import { IdentityImageGallery } from "./identity-images"
import { IdentityImageSlot, StoredIdentityImage } from "./types"

export type LinkedIdentityAttachmentFile = {
  slot: string
  status: string
}

export type LinkedIdentityAttachment = {
  id: string
  identityId?: string
  attachmentType: "national" | "passport" | "business_license"
  number: string | null
  issueDate: string | null
  expiryDate: string | null
  issuePlace: string | null
  files: LinkedIdentityAttachmentFile[]
  createdAt?: string
}

export type LinkedIdentity = {
  id: string
  fullName: string
  mobile?: string
  status?: "pending" | "verified" | "rejected"
  documentRef?: string | null
  attachments?: LinkedIdentityAttachment[]
}

const TYPE_LABELS = { national: "بطاقة شخصية", passport: "جواز سفر" }

function displayDate(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toISOString().slice(0, 10)
}

export function linkedIdentityDocument(identity?: LinkedIdentity | null): LinkedIdentityAttachment | null {
  if (!identity?.attachments?.length) return null
  const documents = identity.attachments.filter(
    attachment => attachment.attachmentType === "national" || attachment.attachmentType === "passport"
  )
  if (identity.documentRef) {
    const linked = documents.find(attachment => attachment.id === identity.documentRef)
    if (linked) return linked
  }
  return documents[0] || null
}

function imageUrl(imageBase: string, slot: IdentityImageSlot, variant: "thumbnail" | "full") {
  const separator = imageBase.includes("?") ? "&" : "?"
  return `${imageBase}${separator}slot=${slot}&variant=${variant}`
}

export function linkedIdentityImages(identity?: LinkedIdentity | null, imageBase?: string): StoredIdentityImage[] {
  const document = linkedIdentityDocument(identity)
  if (!document || !imageBase) return []
  const labels: Record<IdentityImageSlot, string> = {
    front: "صورة الهوية (أمام)",
    back: "صورة الهوية (خلف)",
    selfie: "صورة سيلفي",
  }
  return document.files.flatMap(file => {
    if (file.status !== "available" || !["front", "back", "selfie"].includes(file.slot)) return []
    const slot = file.slot as IdentityImageSlot
    return [{
      slot,
      labelAr: labels[slot],
      url: imageUrl(imageBase, slot, "thumbnail"),
      fullUrl: imageUrl(imageBase, slot, "full"),
    }]
  })
}

export function LinkedIdentityView({
  identity,
  imageBase,
  loading = false,
}: {
  identity?: LinkedIdentity | null
  imageBase?: string
  loading?: boolean
}) {
  if (loading) return <p className="text-sm text-muted-foreground">جاري تحميل بيانات الهوية...</p>
  if (!identity) return <p className="text-sm text-muted-foreground">لا توجد هوية مرتبطة بهذه المحفظة.</p>

  const document = linkedIdentityDocument(identity)
  const images = linkedIdentityImages(identity, imageBase)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserRound className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">بيانات الهوية</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <IdentityDetail label="الاسم" value={identity.fullName} />
        <IdentityDetail label="رقم الهوية" value={document?.number || undefined} ltr />
        <IdentityDetail label="نوع الهوية" value={document ? TYPE_LABELS[document.attachmentType as "national" | "passport"] : undefined} />
        <IdentityDetail label="تاريخ الانتهاء" value={displayDate(document?.expiryDate || undefined)} ltr />
      </div>
      {images.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-bold"><FileImage className="h-4 w-4 text-primary" />صور الهوية</h4>
          <IdentityImageGallery images={images} columns={3} />
        </div>
      )}
    </div>
  )
}

function IdentityDetail({ label, value, ltr }: { label: string; value?: string; ltr?: boolean }) {
  return <div className="rounded-lg border bg-muted/30 p-3"><p className="mb-1 text-xs text-muted-foreground">{label}</p><p className="font-semibold" dir={ltr ? "ltr" : undefined}>{value || "—"}</p></div>
}
