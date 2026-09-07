"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import * as XLSX from "xlsx"
import { ArrowLeft, Download, Inbox, Loader2, RefreshCcw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiClient } from "@/lib/api"

type Account = { id: number | string; name: string; code: string }
type Currency = { id: number | string; code: string; name: string }
type Row = {
  id: number | string
  createdAt: string
  operationType: string
  status: string
  description: string
  counterparty: Account | null
  reportAccount: Account | null
  direction: "credit" | "debit" | "internal" | null
  credit: number
  debit: number
  currencyCode: string
  references: { value: string }[]
}

const OPERATIONS = [
  ["deposit", "إيداع"],
  ["withdrawal", "سحب"],
  ["transfer", "تحويل"],
  ["remittance", "حوالة"],
  ["payment", "دفع"],
  ["currency_exchange", "صرف عملة"],
  ["bank_transfer", "تحويل بنكي"],
  ["reversal", "عكس عملية"],
  ["fee", "رسوم"],
  ["settlement", "تسوية"],
  ["cash_out", "سحب نقدي"],
  ["commission", "عمولة"],
  ["topup", "شحن"],
  ["other", "أخرى"],
  ["manual", "قيد بسيط"],
] as const

const operationLabel = (operation: string) =>
  OPERATIONS.find(([value]) => value === operation)?.[1] || operation

const number = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const accountLabel = (account: Account | null) =>
  account ? `${account.name}${account.code ? ` (${account.code})` : ""}` : "—"

const statusBadge = (status: string) => {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    completed: { label: "مكتمل", variant: "default" },
    pending: { label: "معلق", variant: "secondary" },
    failed: { label: "فشل", variant: "destructive" },
    cancelled: { label: "ملغي", variant: "outline" },
  }
  const item = config[status] || { label: status, variant: "outline" as const }
  return <Badge variant={item.variant}>{item.label}</Badge>
}

const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    completed: "مكتمل",
    pending: "معلق",
    failed: "فشل",
    cancelled: "ملغي",
  }
  return labels[status] || status
}

const directionLabel = (direction: Row["direction"]) => {
  const labels: Record<NonNullable<Row["direction"]>, string> = {
    credit: "وارد",
    debit: "صادر",
    internal: "داخلي",
  }
  return direction ? labels[direction] : "—"
}

export function TransactionsList() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currencyId = searchParams.get("currencyId") || ""
  const from = searchParams.get("from") || ""
  const to = searchParams.get("to") || ""
  const operation = searchParams.get("operation") || ""
  const page = Math.max(1, Number(searchParams.get("page")) || 1)

  const [rows, setRows] = useState<Row[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [selectedCurrencyId, setSelectedCurrencyId] = useState("")
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const setParams = useCallback(
    (changes: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(changes).forEach(([key, value]) => {
        if (value) params.set(key, value)
        else params.delete(key)
      })
      router.replace(`${pathname}?${params}`, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    apiClient.getTransactions({
      page,
      limit: 25,
      sort: "-createdAt",
      currencyId: currencyId || undefined,
      from: from || undefined,
      to: to || undefined,
      operation: operation || undefined,
    }).then((response) => {
      if (!active) return
      if (!response.success) {
        setError(response.message || "فشل في تحميل العمليات")
        return
      }
      setRows(response.rows || [])
      setCurrencies(response.context?.currencies || [])
      setSelectedCurrencyId(String(response.context?.selectedCurrencyId || ""))
      setTotal(response.pagination?.totalDocs ?? response.pagination?.total ?? 0)
      setTotalPages(Math.max(1, response.pagination?.totalPages || 1))
    }).catch(() => {
      if (active) setError("حدث خطأ أثناء تحميل العمليات")
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [currencyId, from, operation, page, reloadKey, to])

  const exportReport = async () => {
    setExporting(true)
    setError(null)
    try {
      const exportRows: Row[] = []
      let exportPage = 1
      let hasNextPage = true

      while (hasNextPage) {
        const response = await apiClient.getTransactions({
          page: exportPage,
          limit: 100,
          sort: "-createdAt",
          currencyId: selectedCurrencyId || currencyId || undefined,
          from: from || undefined,
          to: to || undefined,
          operation: operation || undefined,
        })
        if (!response.success) throw new Error(response.message || "فشل تصدير التقرير")

        exportRows.push(...(response.rows || []))
        hasNextPage = Boolean(response.pagination?.hasNextPage)
        exportPage += 1
      }

      const worksheet = XLSX.utils.json_to_sheet(exportRows.map((row) => ({
        "مدين": row.debit || "",
        "دائن": row.credit || "",
        "الحالة": statusLabel(row.status),
        "الوصف": row.description || "",
        "الطرف المقابل": accountLabel(row.counterparty),
        "الحساب": accountLabel(row.reportAccount),
        "العملية": operationLabel(row.operationType),
        "الاتجاه": directionLabel(row.direction),
        "المرجع": row.references.map((reference) => reference.value).join(" | "),
        "التاريخ": row.createdAt ? new Date(row.createdAt).toLocaleString("en-GB") : "",
        "رقم العملية": String(row.id),
      })))
      worksheet["!cols"] = [
        { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 35 }, { wch: 28 },
        { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 26 }, { wch: 22 }, { wch: 14 },
      ]
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "كشف الحساب")
      XLSX.writeFile(workbook, `agent-report-${selectedCurrencyId || currencyId || "all"}.xlsx`)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "فشل تصدير التقرير")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">المحاسبة</p>
          <h1 className="text-2xl font-bold tracking-tight">كشف الحساب</h1>
          <p className="text-sm text-muted-foreground">العمليات التفصيلية للحساب المحدد</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/account"><ArrowLeft className="ml-2 h-4 w-4" />الحسابات</Link>
          </Button>
          <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)} disabled={loading}>
            <RefreshCcw className={`ml-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />تحديث
          </Button>
        </div>
      </div>

      {currencies.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="العملات">
          {currencies.map((currency) => {
            const id = String(currency.id)
            const selected = id === selectedCurrencyId
            return (
              <Button
                key={id}
                variant={selected ? "default" : "outline"}
                onClick={() => setParams({ currencyId: id, page: "1" })}
                className="h-auto min-w-28 flex-col items-start gap-0.5 py-2"
              >
                <strong dir="ltr">{currency.code || currency.name}</strong>
                <span className="text-xs font-normal opacity-75">{currency.name}</span>
              </Button>
            )
          })}
        </div>
      )}

      <Card>
        <CardContent className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="grid gap-1 text-xs font-bold text-muted-foreground">
            من تاريخ
            <Input className="h-9" type="date" value={from} max={to || undefined} onChange={(event) => setParams({ from: event.target.value, page: "1" })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-muted-foreground">
            إلى تاريخ
            <Input className="h-9" type="date" value={to} min={from || undefined} onChange={(event) => setParams({ to: event.target.value, page: "1" })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-muted-foreground">
            العملية
            <Select value={operation || "all"} onValueChange={(value) => setParams({ operation: value === "all" ? "" : value, page: "1" })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل العمليات</SelectItem>
                {OPERATIONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <div className="flex items-end">
            <Button variant="outline" className="h-9 w-full" onClick={() => setParams({ from: "", to: "", operation: "", page: "1" })}>مسح الفلاتر</Button>
          </div>
        </CardContent>
      </Card>

      {error && <Alert variant="destructive"><AlertTitle>خطأ</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 p-4">
          <div>
            <CardTitle>سجل العمليات</CardTitle>
            <CardDescription>{total.toLocaleString("en-US")} عملية مطابقة</CardDescription>
          </div>
          <Button variant="outline" onClick={exportReport} disabled={exporting || loading}>
            {exporting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Download className="ml-2 h-4 w-4" />}
            تصدير Excel
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin text-primary" />جاري تحميل العمليات...</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground"><Inbox className="h-8 w-8" />لا توجد عمليات لعرضها</div>
          ) : (
            <>
              <div className="-mx-4 overflow-x-auto px-4">
                <Table className="min-w-[1100px] text-xs">
                  <TableHeader><TableRow>
                    <TableHead className="h-10 px-2 whitespace-nowrap">مدين</TableHead><TableHead className="h-10 px-2 whitespace-nowrap">دائن</TableHead><TableHead className="h-10 px-2 whitespace-nowrap">الحالة</TableHead><TableHead className="h-10 px-2 whitespace-nowrap">الوصف</TableHead><TableHead className="h-10 px-2 whitespace-nowrap">الطرف المقابل</TableHead><TableHead className="h-10 px-2 whitespace-nowrap">الحساب</TableHead><TableHead className="h-10 px-2 whitespace-nowrap">العملية</TableHead><TableHead className="h-10 px-2 whitespace-nowrap">الاتجاه</TableHead><TableHead className="h-10 px-2 whitespace-nowrap">المرجع</TableHead><TableHead className="h-10 px-2 whitespace-nowrap">التاريخ</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{rows.map((row) => (
                    <TableRow key={String(row.id)}>
                      <TableCell className="px-2 py-2.5 whitespace-nowrap font-bold text-red-600"><span dir="ltr">{row.debit ? number.format(row.debit) : "—"}</span></TableCell>
                      <TableCell className="px-2 py-2.5 whitespace-nowrap font-bold text-emerald-600"><span dir="ltr">{row.credit ? number.format(row.credit) : "—"}</span></TableCell>
                      <TableCell className="px-2 py-2.5">{statusBadge(row.status)}</TableCell>
                      <TableCell className="max-w-[12rem] truncate px-2 py-2.5 whitespace-nowrap" title={row.description}>{row.description || "—"}</TableCell>
                      <TableCell className="max-w-[11rem] truncate px-2 py-2.5 whitespace-nowrap" title={accountLabel(row.counterparty)}>{accountLabel(row.counterparty)}</TableCell>
                      <TableCell className="max-w-[11rem] truncate px-2 py-2.5 whitespace-nowrap" title={accountLabel(row.reportAccount)}>{accountLabel(row.reportAccount)}</TableCell>
                      <TableCell className="px-2 py-2.5 whitespace-nowrap"><Badge variant="outline">{operationLabel(row.operationType)}</Badge></TableCell>
                      <TableCell className="px-2 py-2.5 whitespace-nowrap">{directionLabel(row.direction)}</TableCell>
                      <TableCell className="max-w-[9rem] truncate px-2 py-2.5 font-mono whitespace-nowrap" title={row.references.map((ref) => ref.value).join(" | ")}>{row.references.map((ref) => ref.value).join(" | ") || "—"}</TableCell>
                      <TableCell className="px-2 py-2.5 whitespace-nowrap text-muted-foreground"><span dir="ltr">{new Date(row.createdAt).toLocaleString("en-GB")} · #{String(row.id)}</span></TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <span className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setParams({ page: String(page - 1) })}>السابق</Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setParams({ page: String(page + 1) })}>التالي</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
