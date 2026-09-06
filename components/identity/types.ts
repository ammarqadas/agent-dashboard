// Shared identity-image slots and helpers used by the remittance pay flow,
// wallet identity editing, and the read-only wallet gallery.

export type IdentityImageSlot = "front" | "back" | "selfie"

export type IdentityImageFiles = Record<IdentityImageSlot, File | null>

export type IdentityImagePreviews = Record<IdentityImageSlot, string | null>

export const ID_IMAGE_SLOTS: IdentityImageSlot[] = ["front", "back", "selfie"]

export const ID_IMAGE_LABELS: Record<IdentityImageSlot, string> = {
  front: "صورة الهوية (أمام)",
  back: "صورة الهوية (خلف)",
  selfie: "صورة سيلفي",
}

export const MAX_ID_IMAGE_SIZE_MB = 10
export const ALLOWED_ID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

// Resolve a stored media field (URL string or object with url/sizes) to a URL.
export function resolveMediaUrl(m: unknown): string | null {
  if (!m) return null
  if (typeof m === "string" && m.startsWith("http")) return m
  if (typeof m === "object") {
    const o = m as Record<string, any>
    return o.url || o?.sizes?.square?.url || o?.sizes?.thumbnail?.url || null
  }
  return null
}

export type StoredIdentityImage = {
  slot: IdentityImageSlot
  labelAr: string
  url: string
}

// Collect stored identity images from a wallet card, preserving the legacy
// card.image[] fallback order (front, back, selfie).
export function collectStoredIdentityImages(card: any): StoredIdentityImage[] {
  if (!card || typeof card !== "object") return []

  const out: StoredIdentityImage[] = []
  let frontUrl = resolveMediaUrl(card.idImageFront)
  let backUrl = resolveMediaUrl(card.idImageBack)
  let selfiUrl = resolveMediaUrl(card.idImageSelfi)

  if (!frontUrl && !backUrl && !selfiUrl && card.image) {
    const arr = Array.isArray(card.image) ? card.image : [card.image]
    frontUrl = resolveMediaUrl(arr[0])
    backUrl = resolveMediaUrl(arr[1])
    selfiUrl = resolveMediaUrl(arr[2])
  }

  if (frontUrl) out.push({ slot: "front", labelAr: ID_IMAGE_LABELS.front, url: frontUrl })
  if (backUrl) out.push({ slot: "back", labelAr: ID_IMAGE_LABELS.back, url: backUrl })
  if (selfiUrl) out.push({ slot: "selfie", labelAr: ID_IMAGE_LABELS.selfie, url: selfiUrl })

  return out
}

export function storedIdentityPreviewMap(
  images: StoredIdentityImage[]
): Partial<IdentityImagePreviews> {
  const map: Partial<IdentityImagePreviews> = {}
  for (const img of images) map[img.slot] = img.url
  return map
}
