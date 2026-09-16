"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useCashoutCodeSearch, useCashoutCodePay } from "./useCashoutCodes"
import { CashoutCodeStatusBadge } from "./CashoutCodeStatusBadge"
import { SearchX, X, Loader2, CheckCircle2, RotateCcw, Printer, Coins } from "lucide-react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import type { CashoutCode } from "./types"
import { SharePdfButton } from "@/components/receipt/share-pdf-button"
import { formatReceiptTimestamp } from "@/lib/utils"

type PayReceipt = {
  code: string
  amount: number
  currency: string | null
  walletName: string | null
  mobile: string | null
  transactionId: string | number | null
  paidAt: Date
}

function resolveCurrency(code: CashoutCode): string {
  if (!code.currency) return "—"
  return typeof code.currency === "object" ? code.currency.code : String(code.currency)
}

function resolveWallet(code: CashoutCode): string {
  if (!code.wallet || code.wallet === "غير متوفر") return "غير متوفر"
  if (typeof code.wallet === "object") {
    return `${code.wallet.name || ""} (${code.wallet.mobile || ""})`
  }
  return String(code.wallet)
}

export function CashoutCodeSearch() {
  const [code, setCode] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const { result, isSearching, search, clearResult } = useCashoutCodeSearch()
  const { pay, isPaying } = useCashoutCodePay()
  const [payDialogCode, setPayDialogCode] = useState<string | null>(null)
  const [paidReceipt, setPaidReceipt] = useState<PayReceipt | null>(null)
  const [agentName, setAgentName] = useState("وكيل")

  useEffect(() => {
    try {
      const agentUser = JSON.parse(sessionStorage.getItem("agentUser") || "{}")
      setAgentName(agentUser.name || "وكيل")
    } catch {
      setAgentName("وكيل")
    }
  }, [])

  useEffect(() => {
    if (paidReceipt) return
    inputRef.current?.focus()
  }, [paidReceipt])

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    const found = await search(trimmed)
    if (found) {
      toast.success("تم العثور على الكود", { description: `كود ${trimmed} موجود.` })
    } else {
      toast.error("غير موجود", { description: "كود السحب غير موجود" })
    }
  }, [code, search])

  const handlePay = useCallback(async (codeValue: string) => {
    setPayDialogCode(codeValue)
  }, [])

  const handleConfirmPay = useCallback(async () => {
    if (!payDialogCode) return
    const payResult = await pay(payDialogCode)
    if (payResult.success && payResult.receipt) {
      toast.success(payResult.message)

      // The pay payload lacks amount/currency/wallet; use the searched code.
      if (!result) {
        toast.error("ابحث عن الكود قبل الدفع")
      } else {
        const fallbackTransactionId = payResult.receipt.transactionId
        setPaidReceipt({
          code: result.code,
          amount: Number(result.amount || 0),
          currency: resolveCurrency(result),
          walletName: typeof result.wallet === "object" ? (result.wallet.name || null) : null,
          mobile: typeof result.wallet === "object" ? (result.wallet.mobile || null) : null,
          transactionId: fallbackTransactionId,
          paidAt: new Date(),
        })
      }
    } else {
      toast.error(payResult.message)
    }
    setPayDialogCode(null)
  }, [payDialogCode, pay, result])

  const handleClear = () => {
    setCode("")
    clearResult()
    inputRef.current?.focus()
  }

  const handlePayAnother = () => {
    setPaidReceipt(null)
    setCode("")
    clearResult()
  }

  if (paidReceipt) {
    return (
      <CashoutPayReceipt
        receipt={paidReceipt}
        agentName={agentName}
        onPayAnother={handlePayAnother}
      />
    )
  }

  return (
    <Card className="border bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle>بحث عن كود سحب</CardTitle>
        <CardDescription>ابحث عن كود سحب باستخدام رقم الكود</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex gap-2 flex-col sm:flex-row">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="code" className="text-right block">كود السحب</Label>
              <div className="relative">
                <Input
                  ref={inputRef}
                  id="code"
                  type="text"
                  placeholder="أدخل كود السحب"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value)
                    if (result) clearResult()
                  }}
                  dir="ltr"
                  className="pl-8 h-10"
                />
                {code && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <Button type="submit" disabled={isSearching || !code.trim()} className="sm:self-end h-10 px-6">
              {isSearching ? "جاري البحث..." : "بحث"}
            </Button>
          </div>
        </form>

        {result && (
          <Card className="rounded-xl border overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">تفاصيل الكود</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">الكود</p>
                  <p className="font-mono font-medium text-sm truncate">{result.code}</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">المبلغ</p>
                  <p className="font-medium text-sm">{result.amount}</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">العملة</p>
                  <p className="font-medium text-sm">{resolveCurrency(result)}</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">الحالة</p>
                  <CashoutCodeStatusBadge status={result.status} />
                </div>
              </div>
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3.5">
                <p className="text-xs text-muted-foreground mb-0.5">المحفظة</p>
                <p className="font-medium text-sm">{resolveWallet(result)}</p>
              </div>
              {result.status === "pending" && (
                <Button onClick={() => handlePay(result.code)} disabled={isPaying} className="w-full h-11">
                  {isPaying ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري الدفع...
                    </>
                  ) : "دفع الكود"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

      <Dialog open={payDialogCode !== null} onOpenChange={() => setPayDialogCode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد دفع كود السحب</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من دفع كود السحب؟
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-sm text-muted-foreground mb-2">الكود</p>
            <p className="text-center font-mono text-xl font-bold">{payDialogCode}</p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">إلغاء</Button>
            </DialogClose>
            <Button onClick={handleConfirmPay} disabled={isPaying}>
              {isPaying ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الدفع...
                </>
              ) : "تأكيد الدفع"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        {!result && !isSearching && !code && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="rounded-full bg-muted p-4">
              <SearchX className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">ابحث عن كود سحب لعرض تفاصيله</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Printable receipt for paid cashout code (سحب نقدي) ───────────────

function CashoutPayReceipt({
  receipt,
  agentName,
  onPayAnother,
}: {
  receipt: PayReceipt
  agentName: string
  onPayAnother: () => void
}) {
  const receiptSlipRef = useRef<HTMLDivElement>(null)
  const currency = receipt.currency || "—"

  return (
    <div className="space-y-4">
      {/* Toolbar — hidden when printing */}
      <div className="flex flex-col gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="icon-container bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">تم دفع كود السحب بنجاح</h2>
            <p className="text-sm text-muted-foreground">يمكنك طباعة الإيصال أو دفع كود آخر</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onPayAnother} className="h-10">
            <RotateCcw className="h-4 w-4" />
            دفع كود آخر
          </Button>
          <Button
            onClick={() => window.print()}
            className="h-10 font-semibold bg-gradient-to-r from-primary to-emerald-600 hover:to-emerald-700"
          >
            <Printer className="h-4 w-4" />
            طباعة الإيصال
          </Button>
          <SharePdfButton
            slipRef={receiptSlipRef}
            filename={`cashout-${receipt.code || "receipt"}`}
          />
        </div>
      </div>

      {/* Printable slip — compact one-column cashier receipt */}
      <div className="print-area max-w-sm mx-auto">
        <div ref={receiptSlipRef} className="print-slip rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
          {/* Boxed header: brand + logo */}
          <div className="border-b-2 border-dashed border-border/40 bg-muted/30 px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-extrabold text-primary leading-tight">شمول كاش — وكيل</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">سحب نقدي</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="شمول كاش" className="h-10 w-10 object-contain shrink-0" />
          </div>

          {/* Body — one column */}
          <div className="p-4 space-y-3">
            {/* Banner divider */}
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 bg-primary rounded-full" />
              <span className="text-[11px] font-extrabold text-primary">إيصال سحب نقدي</span>
              <div className="h-1 flex-1 bg-primary rounded-full" />
            </div>

            {/* Amount — compact tinted box */}
            <div className="mx-auto flex items-center justify-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Coins className="h-4 w-4" />
              </span>
              <span className="flex min-h-[2rem] items-center gap-1.5">
                <span className="whitespace-nowrap font-mono text-lg font-extrabold leading-none text-foreground" dir="ltr">
                  {receipt.amount.toLocaleString("en-US")}
                </span>
                <span className="whitespace-nowrap text-[10px] font-bold text-muted-foreground" dir="ltr">
                  {currency}
                </span>
              </span>
            </div>

            {/* Rows */}
            <div className="rounded-lg border border-border/40 bg-card px-3 divide-y divide-border/40">
              <div className="flex items-center justify-between gap-4 py-2">
                <span className="text-[11px] font-bold text-muted-foreground">الكود</span>
                <span className="text-sm font-mono font-semibold text-foreground" dir="ltr">{receipt.code}</span>
              </div>
              {receipt.walletName && (
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-[11px] font-bold text-muted-foreground">صاحب المحفظة</span>
                  <span className="text-sm font-semibold text-foreground">{receipt.walletName}</span>
                </div>
              )}
              {receipt.mobile && (
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-[11px] font-bold text-muted-foreground">رقم الجوال</span>
                  <span className="text-sm font-mono font-semibold text-foreground" dir="ltr">{receipt.mobile}</span>
                </div>
              )}
              {receipt.transactionId != null && (
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-[11px] font-bold text-muted-foreground">رقم العملية</span>
                  <span className="text-sm font-mono font-semibold text-foreground" dir="ltr">{String(receipt.transactionId)}</span>
                </div>
              )}
            </div>

            {/* Signature block */}
            {/* Signature block */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-[11px] font-bold text-muted-foreground" style={{ textAlign: "center" }}>
                  اسم المستلم
                </p>
                <div className="h-4" />
                <div className="border-b border-border mx-4" />
                <div className="h-2" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-muted-foreground" style={{ textAlign: "center" }}>
                  التوقيع
                </p>
                <div className="h-4" />
                <div className="border-b border-border mx-4" />
                <div className="h-2" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-dashed border-border/40 bg-muted/20 px-4 py-2.5 text-[10px] text-muted-foreground">
            <div className="flex items-center justify-between gap-2 whitespace-nowrap">
              <p>
                تم السحب عبر الوكيل: <span className="font-semibold text-foreground">{agentName}</span>
              </p>
              <p className="font-mono font-semibold text-foreground whitespace-nowrap" dir="ltr">
                {formatReceiptTimestamp(receipt.paidAt)}
              </p>
            </div>
            <div className="mt-2 border-t border-border/40 pt-2 text-center">
              <p className="font-medium text-muted-foreground">هذا الإيصال سند إثبات لعملية السحب</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
