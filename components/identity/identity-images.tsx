"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Camera, ImagePlus, Trash2 } from "lucide-react"
import { CameraCaptureDialog } from "./camera-capture-dialog"
import {
  ALLOWED_ID_IMAGE_TYPES,
  ID_IMAGE_LABELS,
  IdentityImageFiles,
  IdentityImagePreviews,
  IdentityImageSlot,
  MAX_ID_IMAGE_SIZE_MB,
  StoredIdentityImage,
} from "./types"

type SectionProps = {
  slots: IdentityImageSlot[]
  files: IdentityImageFiles
  previews: IdentityImagePreviews
  onImageChange: (slot: IdentityImageSlot, file: File | null) => void
  required?: Partial<Record<IdentityImageSlot, boolean>>
  locked?: boolean
  columns?: 2 | 3
}

const SLOT_FACING: Record<IdentityImageSlot, "environment" | "user"> = {
  front: "environment",
  back: "environment",
  selfie: "user",
}

function IdentityImageCard({
  label,
  required,
  file,
  preview,
  locked,
  onImageChange,
  facingMode,
}: {
  label: string
  required?: boolean
  file: File | null
  preview: string | null
  locked?: boolean
  onImageChange: (file: File | null) => void
  facingMode: "environment" | "user"
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cameraOpen, setCameraOpen] = useState(false)

  const handleSelect = (list: FileList | null) => {
    const selected = list?.[0]
    if (!selected) return
    if (!ALLOWED_ID_IMAGE_TYPES.includes(selected.type)) {
      toast.error("صيغة الملف غير مدعومة — استخدم JPG أو PNG أو WebP")
      return
    }
    if (selected.size > MAX_ID_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`حجم الصورة يتجاوز ${MAX_ID_IMAGE_SIZE_MB} ميجابايت`)
      return
    }
    onImageChange(selected)
  }

  const pick = () => inputRef.current?.click()

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </div>

      <div
        className={`relative h-32 rounded-xl border-2 border-dashed overflow-hidden ${
          preview ? "border-emerald-300 bg-emerald-500/5" : "border-border/60 bg-muted/30"
        }`}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={label} className="absolute inset-0 h-full w-full object-cover" />
            {!locked && (
              <div className="absolute bottom-1.5 inset-x-0 flex justify-center gap-1.5">
                <Button type="button" size="sm" variant="secondary" className="h-7 text-xs px-2 shadow-sm" onClick={pick}>
                  استبدال
                </Button>
                <Button type="button" size="sm" variant="secondary" className="h-7 text-xs px-2 shadow-sm" onClick={() => setCameraOpen(true)}>
                  تصوير
                </Button>
                {file && (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="h-7 text-xs px-2 shadow-sm"
                    onClick={() => onImageChange(null)}
                  >
                    <Trash2 className="h-3 w-3" />
                    إزالة
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ImagePlus className="h-4 w-4" />
            </div>
            {!locked && (
              <div className="flex gap-1.5">
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={pick}>
                  <ImagePlus className="h-3 w-3" />
                  اختيار صورة
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setCameraOpen(true)}>
                  <Camera className="h-3 w-3" />
                  كاميرا
                </Button>
              </div>
            )}
            <p className="text-[10px]">JPG أو PNG أو WebP — حتى {MAX_ID_IMAGE_SIZE_MB} ميجابايت</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_ID_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            handleSelect(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      <CameraCaptureDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        title={label}
        facingMode={facingMode}
        onCapture={captured => onImageChange(captured)}
      />
    </div>
  )
}

export function IdentityImagesSection({
  slots,
  files,
  previews,
  onImageChange,
  required,
  locked,
  columns = 2,
}: SectionProps) {
  const gridCols = columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
  return (
    <div className={`grid gap-3 grid-cols-1 ${gridCols}`}>
      {slots.map(slot => (
        <IdentityImageCard
          key={slot}
          label={ID_IMAGE_LABELS[slot]}
          required={required?.[slot]}
          file={files[slot]}
          preview={previews[slot]}
          locked={locked}
          onImageChange={file => onImageChange(slot, file)}
          facingMode={SLOT_FACING[slot]}
        />
      ))}
    </div>
  )
}

export function IdentityImageGallery({
  images,
  columns = 3,
}: {
  images: StoredIdentityImage[]
  columns?: 2 | 3
}) {
  if (images.length === 0) return null
  const gridCols = columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"
  return (
    <div className={`grid gap-4 grid-cols-1 ${gridCols}`}>
      {images.map(img => (
        <div key={img.slot} className="rounded-xl border overflow-hidden bg-card shadow-sm">
          <div className="p-3 bg-muted/50 border-b flex items-center gap-2">
            <ImagePlus className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{img.labelAr}</span>
          </div>
          <div className="p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.labelAr}
              className="w-full rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
              style={{ minHeight: "180px", maxHeight: "260px" }}
              onClick={() => window.open(img.fullUrl || img.url, "_blank")}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
