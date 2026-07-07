"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { CashoutCodeRow } from "./CashoutCodeRow"
import { useCashoutCodesList, useCashoutCodePay } from "./useCashoutCodes"
import { RefreshCcw, Inbox, Plus } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

const PAGE_SIZES = [10, 25, 50]

export function CashoutCodeList() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const { data: codes, total, isLoading, error, refetch } = useCashoutCodesList(statusFilter, page, pageSize)
  const { pay, isPaying } = useCashoutCodePay()

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const handlePay = useCallback(async (code: string) => {
    if (!confirm("هل أنت متأكد من دفع كود السحب؟")) return
    const result = await pay(code)
    if (result.success) {
      toast.success(result.message)
      refetch()
    } else {
      toast.error(result.message)
    }
  }, [pay, refetch])

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value))
    setPage(1)
  }

  return (
    <Card className="border bg-card/80 shadow-sm">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>أكواد السحب</CardTitle>
            <CardDescription>عرض وإدارة أكواد السحب</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="تصفية حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="pending">معلّق</SelectItem>
                <SelectItem value="paid">مدفوع</SelectItem>
                <SelectItem value="expired">منتهي</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={refetch} disabled={isLoading}>
              <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={refetch}>إعادة المحاولة</Button>
          </div>
        ) : isLoading ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الكود</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>العملة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>المحفظة</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-5 w-20 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : codes.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="rounded-full bg-muted p-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">لا توجد أكواد</p>
              <p className="text-sm text-muted-foreground mt-1">
                {statusFilter === "all" ? "لم يتم إنشاء أي كود سحب بعد" : `لا توجد أكواد بحالة "${statusFilter === "pending" ? "معلّق" : statusFilter === "paid" ? "مدفوع" : "منتهي"}"`}
              </p>
            </div>
            <Link href="/dashboard/cashout-codes/create">
              <Button>
                <Plus className="h-4 w-4 ml-1" />
                إنشاء كود جديد
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>العملة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المحفظة</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code: any) => (
                  <CashoutCodeRow key={code.id} code={code} onPay={handlePay} />
                ))}
              </TableBody>
            </Table>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>عرض</span>
                <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((s) => (
                      <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>من أصل {total}</span>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  السابق
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    className="min-w-9"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ))}
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  التالي
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
