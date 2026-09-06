"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type FacingMode = "environment" | "user"

const MAX_CAPTURE_WIDTH = 1920

export function CameraCaptureDialog({
  open,
  onOpenChange,
  title,
  facingMode = "environment",
  onCapture,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  facingMode?: FacingMode
  onCapture: (file: File) => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facing, setFacing] = useState<FacingMode>(facingMode)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setReady(false)
  }, [])

  const startStream = useCallback(
    async (mode: FacingMode) => {
      setError(null)
      setReady(false)
      stopStream()
      try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          throw Object.assign(new Error("unsupported"), { name: "NotSupportedError" })
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 1920 } },
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setReady(true)
      } catch (err: any) {
        const name: string = err?.name || ""
        if (typeof window !== "undefined" && !window.isSecureContext) {
          setError("الكاميرا تتطلب اتصالاً آمناً (HTTPS) أو العمل عبر localhost. استخدم رفع الملف بدلاً من ذلك.")
        } else if (name === "NotAllowedError" || name === "SecurityError") {
          setError("تم رفض الوصول إلى الكاميرا. يرجى منح الإذن من إعدادات المتصفح أو استخدام رفع الملف.")
        } else if (name === "NotFoundError" || name === "OverconstrainedError" || name === "NotSupportedError") {
          setError("لا يوجد جهاز تصوير متاح. استخدم رفع الملف بدلاً من الكاميرا.")
        } else {
          setError("تعذر الوصول إلى الكاميرا. استخدم رفع الملف بدلاً من الكاميرا.")
        }
      }
    },
    [stopStream]
  )

  useEffect(() => {
    if (open) {
      setFacing(facingMode)
      startStream(facingMode)
    } else {
      stopStream()
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open) startStream(facing)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing])

  const handleCapture = useCallback(() => {
    const video = videoRef.current
    if (!video || !ready || !video.videoWidth) return

    const scale = Math.min(1, MAX_CAPTURE_WIDTH / video.videoWidth)
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      blob => {
        if (!blob) return
        const file = new File([blob], `id-capture-${Date.now()}.jpg`, { type: "image/jpeg" })
        onCapture(file)
        onOpenChange(false)
      },
      "image/jpeg",
      0.9
    )
  }, [ready, onCapture, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>وجّه الكاميرا نحو المستند ثم اضغط التقاط الصورة</DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive text-center">
            {error}
          </div>
        ) : (
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-contain" />
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-background/80 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">جاري تشغيل الكاميرا...</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFacing(mode => (mode === "environment" ? "user" : "environment"))}
            disabled={!!error}
          >
            <RefreshCw className="h-4 w-4" />
            تبديل الكاميرا
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="button" onClick={handleCapture} disabled={!ready || !!error}>
              <Camera className="h-4 w-4" />
              التقاط الصورة
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
