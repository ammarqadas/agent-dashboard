"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Coins } from "lucide-react"
import { apiClient, type AgentCommissionGroup } from "@/lib/api"
import { sumCommissionAmounts } from "@/lib/commission-amount"

export function DashboardCommissions() {
  const [groups, setGroups] = useState<AgentCommissionGroup[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    apiClient.getAgentCommissions().then((response) => {
      if (!response.success || !response.data) throw new Error("Failed to load commissions")
      if (active) setGroups(response.data.groups.filter((group) => group.mode === "payable"))
    }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [])

  const currencies = new Map<string, AgentCommissionGroup[]>()
  for (const group of groups || []) {
    const items = currencies.get(group.currencyCode) || []
    items.push(group)
    currencies.set(group.currencyCode, items)
  }

  return (
    <section aria-labelledby="dashboard-commissions-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="dashboard-commissions-title" className="section-title">العمولات المعلقة</h2>
        <Link href="/dashboard/account" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          عرض الحساب <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        تُضاف العمولات إلى رصيدك بعد تنفيذ التسوية وفق الحد الأدنى ومدة الانتظار المحددين.
        {" "}<Link href="/dashboard/account#settlement-rules" className="font-medium text-primary hover:underline">قواعد التسوية</Link>
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">تعذر تحميل العمولات المعلقة.</p>
      ) : groups === null ? (
        <p role="status" className="text-sm text-muted-foreground">جاري تحميل العمولات...</p>
      ) : currencies.size === 0 ? (
        <p className="dash-stat-card text-sm text-muted-foreground">لا توجد عمولات معلقة.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from(currencies, ([currency, items]) => {
            const eligible = items.filter((group) => group.eligible)
            return (
              <Link key={currency} href="/dashboard/account" className="dash-stat-card block min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-center gap-3">
                  <div className="icon-container shrink-0"><Coins className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">إجمالي العمولات المعلقة</p>
                    <p className="break-all text-lg font-bold text-primary" dir="ltr">{sumCommissionAmounts(items)} {currency}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                  <span>عدد العمليات: {items.reduce((count, group) => count + group.legs, 0)}</span>
                  <span>مؤهل للتسوية: <span dir="ltr">{sumCommissionAmounts(eligible)} {currency}</span></span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
