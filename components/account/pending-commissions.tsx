"use client"

import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { apiClient, type AgentCommissionGroup, type AgentCommissionSummary } from "@/lib/api"
import { sumCommissionAmounts } from "@/lib/commission-amount"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function PendingCommissions() {
  const [summary, setSummary] = useState<AgentCommissionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadSummary = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await apiClient.getAgentCommissions()
      if (!response.success || !response.data) throw new Error(response.message || "تعذر تحميل العمولات المعلقة")
      setSummary(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل العمولات المعلقة")
    } finally { setLoading(false) }
  }

  useEffect(() => { void loadSummary() }, [])

  const currencies = new Map<string, AgentCommissionGroup[]>()
  for (const group of summary?.groups || []) {
    if (group.mode === "tracking") continue
    const groups = currencies.get(group.currencyCode) || []
    groups.push(group)
    currencies.set(group.currencyCode, groups)
  }
  const automaticTypes = summary ? [
    summary.automatic.collecting && "التحصيل",
    summary.automatic.paying && "الصرف",
  ].filter(Boolean).join(" و") : ""
  const automaticEnabled = summary && summary.automatic.enabled && !summary.automatic.dryRun && automaticTypes

  return (
    <Card id="pending-commissions" className="scroll-mt-20 rounded-xl border border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title">العمولات المعلقة</h2>
          <Button variant="outline" size="sm" disabled={loading} onClick={() => void loadSummary()}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="sr-only">تحديث العمولات</span>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">العمولات أدناه غير مضافة إلى رصيدك المتاح بعد.</p>
        {summary && (
          <div id="settlement-rules" className="scroll-mt-20 rounded-lg border border-primary/15 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground">حدود وقواعد التسوية التلقائية</p>
            <p className="mt-1">تُقيّم أهلية كل نوع وحساب وعملة ومصدر تمويل بشكل مستقل. تصبح العمولات مؤهلة عند بلوغ الحد الأدنى للعملة أو بعد {summary.maximumWaitDays} أيام من أقدم عمولة مؤهلة، بشرط إعداد الحد الأدنى.</p>
            <p className="mt-1">تُضاف العمولات إلى رصيد الحساب بعد تنفيذ التسوية، وليس بمجرد بلوغ الحد الأدنى. طلب التسوية اليدوية غير متاح للوكيل.</p>
            <p className="mt-1">
              {automaticEnabled
                ? `التسوية التلقائية مفعّلة لعمولات ${automaticTypes}.`
                : summary.automatic.enabled && summary.automatic.dryRun
                  ? "التسوية التلقائية تعمل في وضع تجريبي ولا تنفّذ الدفع."
                  : "التسوية التلقائية غير مفعّلة حالياً."}
            </p>
            {automaticEnabled && summary.automatic.nextRunAt && !Number.isNaN(Date.parse(summary.automatic.nextRunAt)) && (
              <p className="mt-1">موعد التشغيل القادم: {new Date(summary.automatic.nextRunAt).toLocaleString("ar-YE", { timeZone: "Asia/Aden" })} (توقيت عدن).</p>
            )}
          </div>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {loading && <p role="status" className="text-sm text-muted-foreground">جاري تحميل العمولات...</p>}
        {!loading && !error && summary && currencies.size === 0 && <p className="text-sm text-muted-foreground py-4 text-center">لا توجد عمولات معلقة.</p>}
        {summary && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(currencies, ([currency, groups]) => {
              const eligible = groups.filter((group) => group.mode === "payable" && group.eligible)
              const count = groups.reduce((total, group) => total + group.legs, 0)
              const thresholds = Array.from(new Set(groups.map((group) => group.threshold == null ? "غير مُعدّ" : `${sumCommissionAmounts([{ ...group, total: group.threshold }])} ${currency}`)))
              return (
                <div key={currency} className="stat-card !p-3 min-w-0 space-y-3">
                  <h3 className="text-sm font-semibold" dir="ltr">{currency}</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2"><dt className="text-muted-foreground">إجمالي العمولات</dt><dd className="font-bold text-primary break-all" dir="ltr">{sumCommissionAmounts(groups)} {currency}</dd></div>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2"><dt className="text-muted-foreground">مؤهل للتسوية</dt><dd className="font-semibold break-all" dir="ltr">{sumCommissionAmounts(eligible)} {currency}</dd></div>
                    <div className="flex items-baseline justify-between gap-x-2 text-xs text-muted-foreground"><dt>عدد العمليات</dt><dd>{count}</dd></div>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs text-muted-foreground"><dt>الحد الأدنى للتسوية</dt><dd dir="auto">{thresholds.join("، ")}</dd></div>
                  </dl>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
