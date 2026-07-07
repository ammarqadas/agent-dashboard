"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useCashoutCodeSearch, useCashoutCodePay } from "./useCashoutCodes"
import { CashoutCodeStatusBadge } from "./CashoutCodeStatusBadge"
import { SearchX, X, Clock, Search } from "lucide-react"
import { toast } from "sonner"
import type { CashoutCode } from "./types"

const HISTORY_KEY = "cashout-search-history"
const MAX_HISTORY = 5

function getHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]")
  } catch {
    return []
  }
}

function addToHistory(code: string) {
  const history = getHistory().filter((h) => h !== code)
  history.unshift(code)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
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
  const [history, setHistory] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const { result, isSearching, search, clearResult } = useCashoutCodeSearch()
  const { pay, isPaying } = useCashoutCodePay()

  useEffect(() => {
    inputRef.current?.focus()
    setHistory(getHistory())
  }, [])

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    const found = await search(trimmed)
    if (found) {
      addToHistory(trimmed)
      setHistory(getHistory())
      toast.success("تم العثور على الكود", { description: `كود ${trimmed} موجود.` })
    } else {
      toast.error("غير موجود", { description: "كود السحب غير موجود" })
    }
  }, [code, search])

  const handleHistoryClick = useCallback(async (item: string) => {
    setCode(item)
    const found = await search(item)
    if (found) {
      setHistory(getHistory())
      toast.success("تم العثور على الكود", { description: `كود ${item} موجود.` })
    } else {
      toast.error("غير موجود", { description: "كود السحب غير موجود" })
    }
  }, [search])

  const handlePay = useCallback(async (codeValue: string) => {
    if (!confirm("هل أنت متأكد من دفع كود السحب؟")) return
    const result = await pay(codeValue)
    if (result.success) {
      toast.success(result.message)
      handleSearch({ preventDefault: () => {} } as React.FormEvent)
    } else {
      toast.error(result.message)
    }
  }, [pay, handleSearch])

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
      <CardContent className="space-y-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="space-y-2">
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
                  className="pl-8"
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
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSearching || !code.trim()} className="min-w-40">
              {isSearching ? "جاري البحث..." : "بحث"}
            </Button>
          </div>
        </form>

        {history.length > 0 && !result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>عمليات البحث السابقة</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleHistoryClick(item)}
                  className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-3 py-1.5 text-sm font-mono text-foreground hover:bg-muted transition-colors"
                >
                  <Search className="h-3 w-3" />
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div className="rounded-lg border p-5 space-y-4">
            <h3 className="font-semibold text-lg">تفاصيل الكود</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="text-sm text-muted-foreground">الكود</span>
                <p className="font-mono font-medium">{result.code}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">المبلغ</span>
                <p className="font-medium">{result.amount}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">العملة</span>
                <p className="font-medium">{resolveCurrency(result)}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">الحالة</span>
                <div className="mt-0.5"><CashoutCodeStatusBadge status={result.status} /></div>
              </div>
              <div className="sm:col-span-2">
                <span className="text-sm text-muted-foreground">المحفظة</span>
                <p className="font-medium">{resolveWallet(result)}</p>
              </div>
            </div>
            {result.status === "pending" && (
              <div className="flex justify-end pt-2 border-t">
                <Button onClick={() => handlePay(result.code)} disabled={isPaying} className="min-w-32">
                  {isPaying ? "جاري الدفع..." : "دفع الكود"}
                </Button>
              </div>
            )}
          </div>
        )}

        {!result && !isSearching && !code && history.length === 0 && (
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
