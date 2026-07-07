import { CashoutCodeCreate } from "@/components/cashout-codes"

export default function CashoutCodeCreatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">إنشاء كود سحب</h2>
        <p className="text-muted-foreground">
          إنشاء كود سحب جديد للعميل
        </p>
      </div>
      <CashoutCodeCreate />
    </div>
  )
}
