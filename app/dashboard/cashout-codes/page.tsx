import { CashoutCodes } from "@/components/cashout-codes"

export default function CashoutCodesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">أكواد السحب</h2>
        <p className="text-muted-foreground">
          إنشاء ودفع وإدارة أكواد السحب
        </p>
      </div>
      <CashoutCodes />
    </div>
  )
}
