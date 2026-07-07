"use client"

import { TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { CashoutCodeStatusBadge } from "./CashoutCodeStatusBadge"
import type { CashoutCode } from "./types"

function resolveCurrency(code: CashoutCode): string {
  if (!code.currency) return "—"
  return typeof code.currency === "object" ? code.currency.code : String(code.currency)
}

function resolveWallet(code: CashoutCode): string {
  if (!code.wallet || code.wallet === "غير متوفر") return "غير متوفر"
  if (typeof code.wallet === "object") return code.wallet.mobile || code.wallet.name || "—"
  return String(code.wallet)
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("ar-EG")
  } catch {
    return dateStr
  }
}

export function CashoutCodeRow({ code, showActions = true, onPay }: { code: CashoutCode; showActions?: boolean; onPay?: (code: string) => void }) {
  return (
    <TableRow>
      <TableCell className="font-mono">{code.code}</TableCell>
      <TableCell>{code.amount}</TableCell>
      <TableCell>{resolveCurrency(code)}</TableCell>
      <TableCell>
        <CashoutCodeStatusBadge status={code.status} />
      </TableCell>
      <TableCell>{resolveWallet(code)}</TableCell>
      <TableCell>{formatDate(code.createdAt)}</TableCell>
      {showActions && (
        <TableCell>
          {code.status === "pending" && onPay && (
            <Button size="sm" onClick={() => onPay(code.code)}>
              دفع
            </Button>
          )}
        </TableCell>
      )}
    </TableRow>
  )
}
