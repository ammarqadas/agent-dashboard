"use client"

import { Badge } from "@/components/ui/badge"

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; dotColor: string }> = {
  pending: { label: "معلّق", variant: "secondary", dotColor: "bg-amber-500" },
  paid: { label: "مدفوع", variant: "default", dotColor: "bg-emerald-500" },
  expired: { label: "منتهي", variant: "destructive", dotColor: "bg-red-500" },
}

export function CashoutCodeStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, variant: "outline" as const, dotColor: "bg-muted-foreground" }
  return (
    <Badge variant={config.variant} className="gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </Badge>
  )
}
