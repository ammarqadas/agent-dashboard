import { toast } from "sonner"
import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"

type NavigatorWithCanShare = Navigator & {
  canShare?: (data: ShareData) => boolean
}

// Wait until the receipt fonts are actually loaded and registered for canvas
// use — html2canvas re-renders text itself and falls back to wrong-metric
// fonts (broken Arabic shaping) if the faces are not ready.
async function waitForReceiptFonts(): Promise<void> {
  try {
    if (typeof document === "undefined" || !("fonts" in document)) return
    await Promise.all(
      ["400", "700", "800"].map(weight =>
        document.fonts.load(`${weight} 16px Almarai`)
      )
    )
    await document.fonts.ready
  } catch {}
}

// Wait for every image inside the slip to finish decoding.
async function waitForImages(slip: HTMLElement): Promise<void> {
  await Promise.all(
    Array.from(slip.querySelectorAll("img")).map(img =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>(resolve => {
            img.addEventListener("load", () => resolve(), { once: true })
            img.addEventListener("error", () => resolve(), { once: true })
          })
    )
  )
}

// Render the receipt slip element to an A5 PDF, share it through the native
// share sheet when supported (mobile), otherwise download it.
export async function shareReceiptPdf(
  slip: HTMLElement | null,
  filename: string
): Promise<void> {
  if (!slip) {
    toast.error("لا يوجد إيصال للمشاركة")
    return
  }

  try {
    await waitForReceiptFonts()
    await waitForImages(slip)

    const canvas = await html2canvas(slip, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      // Belt-and-braces on the cloned document: neutral letter spacing keeps
      // Arabic joined, and an explicit font family avoids fallback metrics.
      onclone: (doc: Document, node: HTMLElement | null) => {
        if (!node) return
        node.style.letterSpacing = "0"
        node.style.fontFamily = '"Almarai", sans-serif'
        node.querySelectorAll<HTMLElement>("*").forEach(el => {
          el.style.letterSpacing = "0"
        })
      },
    })

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 8
    const maxContentWidth = pageWidth - margin * 2
    const maxContentHeight = pageHeight - margin * 2

    // Fit the slip inside A5 preserving its aspect ratio. Receipts start at
    // the top margin so short documents do not appear vertically centered.
    const ratio = canvas.height / canvas.width
    let renderWidth = maxContentWidth
    let renderHeight = renderWidth * ratio
    if (renderHeight > maxContentHeight) {
      renderHeight = maxContentHeight
      renderWidth = renderHeight / ratio
    }
    const offsetX = margin + (maxContentWidth - renderWidth) / 2
    const offsetY = margin

    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      offsetX,
      offsetY,
      renderWidth,
      renderHeight,
      undefined,
      "FAST"
    )

    const blob = pdf.output("blob")
    const file = new File([blob], `${filename}.pdf`, { type: "application/pdf" })

    const nav = navigator as NavigatorWithCanShare
    if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: filename })
        return
      } catch (err: any) {
        if (err?.name === "AbortError") return
        // Fall through to download on other share errors.
      }
    }

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${filename}.pdf`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    toast.success("تم تنزيل ملف PDF")
  } catch (err: any) {
    toast.error(err?.message || "تعذر إنشاء ملف PDF")
  }
}
