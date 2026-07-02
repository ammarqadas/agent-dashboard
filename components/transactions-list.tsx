"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api"
import { ArrowDownLeft, ArrowUpRight, RefreshCcw, Loader2, Inbox } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function TransactionsList() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.getTransactions({
        limit: 100,
      })
      if (response.success) {
        setTransactions(response.transactions || response.docs || [])
      } else {
        setError(response.message || "فشل في تحميل العمليات")
      }
    } catch (err) {
      console.error("Failed to load transactions:", err)
      setError("حدث خطأ أثناء تحميل العمليات")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusLabels: Record<string, string> = {
      completed: "مكتمل",
      pending: "معلق",
      failed: "فشل",
    }
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
    }
    const dotColors: Record<string, string> = {
      completed: "bg-emerald-500",
      pending: "bg-amber-500",
      failed: "bg-red-500",
    }
    const dotColor = dotColors[status] || "bg-muted-foreground"
    return (
      <Badge variant={variants[status] || "outline"} className="gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
        {statusLabels[status] || status}
      </Badge>
    )
  }

  const getOperationLabel = (operation: string) => {
    const labels: Record<string, string> = {
      deposit: "إيداع",
      withdrawal: "سحب",
      withdraw: "سحب",
      transfer: "تحويل",
      cashout: "صرف كود",
      "cash_out": "دفع كود سحب",
      "cashout-create": "إنشاء كود سحب",
      "cashout-pay": "دفع كود سحب",
      payment: "دفع",
      refund: "استرداد",
    }
    return labels[operation] || operation || "—"
  }

  // Backend /agent/transactions endpoint provides direction directly
  const isCredit = (tx: any) => tx.direction === "credit"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">سجل العمليات</h2>
          <p className="text-muted-foreground">
            عرض سجل العمليات المالية
          </p>
        </div>
        <Button onClick={loadTransactions} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="ml-2 h-4 w-4" />
          )}
          تحديث
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>خطأ</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle>سجل العمليات</CardTitle>
          <CardDescription>جميع العمليات المالية الخاصة بحسابك</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">جاري تحميل العمليات...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Inbox className="h-8 w-8 opacity-60" />
              </div>
              <p className="font-medium">لا توجد عمليات لعرضها</p>
              <p className="text-xs">ستظهر هنا جميع العمليات المالية الخاصة بحسابك</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="whitespace-nowrap px-3 py-3">العملية</TableHead>
                    <TableHead className="whitespace-nowrap px-3 py-3">المبلغ</TableHead>
                    <TableHead className="px-3 py-3">من حساب</TableHead>
                    <TableHead className="px-3 py-3">إلى حساب</TableHead>
                    <TableHead className="px-3 py-3">الوصف</TableHead>
                    <TableHead className="whitespace-nowrap px-3 py-3">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx: any, idx: number) => {
                    const credit = isCredit(tx)
                    const formattedAmount = new Intl.NumberFormat("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(Math.abs(tx.amount || 0))
                    const currencyCode =
                      typeof tx.currency === "object" && tx.currency
                        ? tx.currency.code || `حساب #${tx.currency.id}`
                        : "—"
                    return (
                      <TableRow
                        key={tx.id}
                        className={`table-row-hover transition-colors ${idx % 2 === 1 ? "bg-muted/20" : ""}`}
                      >
                        <TableCell className="whitespace-nowrap px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-normal whitespace-nowrap">
                              {getOperationLabel(tx.operationType)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-3 py-3">
                          <div
                            className={`inline-flex items-center gap-1.5 font-bold text-base ${
                              credit ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {credit ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                            <span dir="ltr">
                              {credit ? "+" : "−"}
                              {formattedAmount}
                              {currencyCode !== "—" && (
                                <span className="text-xs font-medium opacity-70 ms-1">
                                  {currencyCode}
                                </span>
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm px-3 py-3">
                          {tx.sourceAccount || "—"}
                        </TableCell>
                        <TableCell className="text-sm px-3 py-3">
                          {tx.destinationAccount || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground px-3 py-3 max-w-xs" title={tx.description || ""}>
                          <div className="truncate">
                            {tx.description || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap px-3 py-3" dir="ltr">
                          {tx.createdAt
                            ? new Date(tx.createdAt).toLocaleString("en-GB", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
