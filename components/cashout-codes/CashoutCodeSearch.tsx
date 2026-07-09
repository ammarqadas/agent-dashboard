"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useCashoutCodeSearch, useCashoutCodePay } from "./useCashoutCodes"
import { CashoutCodeStatusBadge } from "./CashoutCodeStatusBadge"
import { SearchX, X, Loader2 } from "lucide-react"
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

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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
    const result = await pay(payDialogCode)
    if (result.success) {
      toast.success(result.message)
      handleSearch({ preventDefault: () => {} } as React.FormEvent)
    } else {
      toast.error(result.message)
    }
    setPayDialogCode(null)
  }, [payDialogCode, pay, handleSearch])

  const handleClear = () => {
    setCode("")
    clearResult()
    inputRef.current?.focus()
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
