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

export type StoredIdentityImage = {
  slot: IdentityImageSlot
  labelAr: string
  url: string
  fullUrl?: string
}

export function storedIdentityPreviewMap(
  images: StoredIdentityImage[]
): Partial<IdentityImagePreviews> {
  const map: Partial<IdentityImagePreviews> = {}
  for (const img of images) map[img.slot] = img.url
  return map
}
