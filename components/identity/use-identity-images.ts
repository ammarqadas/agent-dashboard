"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ID_IMAGE_SLOTS,
  IdentityImageFiles,
  IdentityImagePreviews,
  IdentityImageSlot,
} from "./types"

function emptyFiles(): IdentityImageFiles {
  return { front: null, back: null, selfie: null }
}

function emptyPreviews(): IdentityImagePreviews {
  return { front: null, back: null, selfie: null }
}

/**
 * Owns identity image files + their preview URLs.
 *
 * - New files get blob previews (tracked + revoked on replace/reset/unmount).
 * - Slots without a new file fall back to the stored (remote) preview passed
 *   via `initialPreviews` — those URLs are remote and are never revoked.
 * - Replacement revokes ONLY the replaced slot's blob, so setting the back
 *   image never kills the front image.
 */
export function useIdentityImages(
  slots: IdentityImageSlot[],
  initialPreviews?: Partial<IdentityImagePreviews>
) {
  const [files, setFiles] = useState<IdentityImageFiles>(emptyFiles)
  const [previews, setPreviews] = useState<IdentityImagePreviews>(() => ({
    front: initialPreviews?.front ?? null,
    back: initialPreviews?.back ?? null,
    selfie: initialPreviews?.selfie ?? null,
  }))

  const blobUrlsRef = useRef<Set<string>>(new Set())
  const filesRef = useRef<IdentityImageFiles>(files)
  const previewsRef = useRef<IdentityImagePreviews>(previews)
  const initialRef = useRef<Partial<IdentityImagePreviews>>(initialPreviews ?? {})

  const set = useCallback((slot: IdentityImageSlot, file: File | null) => {
    const old = previewsRef.current[slot]
    if (old && blobUrlsRef.current.has(old)) {
      URL.revokeObjectURL(old)
      blobUrlsRef.current.delete(old)
    }

    let nextUrl: string | null = initialRef.current[slot] ?? null
    if (file) {
      nextUrl = URL.createObjectURL(file)
      blobUrlsRef.current.add(nextUrl)
    }

    previewsRef.current = { ...previewsRef.current, [slot]: nextUrl }
    filesRef.current = { ...filesRef.current, [slot]: file }
    setPreviews(previewsRef.current)
    setFiles(filesRef.current)
  }, [])

  const reset = useCallback(() => {
    blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    blobUrlsRef.current.clear()
    const restored: IdentityImagePreviews = { ...emptyPreviews() }
    for (const slot of ID_IMAGE_SLOTS) {
      restored[slot] = initialRef.current[slot] ?? null
    }
    previewsRef.current = restored
    filesRef.current = emptyFiles()
    setPreviews(restored)
    setFiles(filesRef.current)
  }, [])

  // When stored previews change (e.g. wallet reloaded after save), refresh
  // slots that have no newly-selected file.
  const initialKey = slots
    .map(s => `${s}:${initialPreviews?.[s] ?? ""}`)
    .join("|")

  useEffect(() => {
    initialRef.current = initialPreviews ?? {}
    let changed = false
    const next = { ...previewsRef.current }
    for (const slot of slots) {
      if (!filesRef.current[slot] && next[slot] !== (initialRef.current[slot] ?? null)) {
        next[slot] = initialRef.current[slot] ?? null
        changed = true
      }
    }
    previewsRef.current = next
    if (changed) setPreviews(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey])

  // Revoke blob URLs on unmount only.
  useEffect(() => {
    const urls = blobUrlsRef.current
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])

  return { files, previews, set, reset }
}
