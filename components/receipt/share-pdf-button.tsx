"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Share2 } from "lucide-react"
import { shareReceiptPdf } from "@/lib/receipt-pdf"

export function SharePdfButton({
  slipRef,
  filename,
  className = "h-10 gap-1.5",
}: {
  slipRef: { readonly current: HTMLDivElement | null }
  filename: string
  className?: string
}) {
  const [isSharing, setIsSharing] = useState(false)

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      disabled={isSharing}
      onClick={async () => {
        setIsSharing(true)
        try {
          await shareReceiptPdf(slipRef.current, filename)
        } finally {
          setIsSharing(false)
        }
      }}
    >
      {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
      مشاركة PDF
    </Button>
  )
}
