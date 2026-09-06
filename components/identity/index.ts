"use client"

export { CameraCaptureDialog } from "./camera-capture-dialog"
export { IdentityImageGallery, IdentityImagesSection } from "./identity-images"
export { useIdentityImages } from "./use-identity-images"
export {
  ALLOWED_ID_IMAGE_TYPES,
  collectStoredIdentityImages,
  ID_IMAGE_LABELS,
  ID_IMAGE_SLOTS,
  MAX_ID_IMAGE_SIZE_MB,
  resolveMediaUrl,
  storedIdentityPreviewMap,
} from "./types"
export type {
  IdentityImageFiles,
  IdentityImagePreviews,
  IdentityImageSlot,
  StoredIdentityImage,
} from "./types"
