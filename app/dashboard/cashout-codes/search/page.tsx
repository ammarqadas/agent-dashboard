import { CashoutCodeSearch } from "@/components/cashout-codes"

export default function CashoutCodeSearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">بحث عن كود سحب</h2>
        <p className="text-muted-foreground">
          ابحث عن كود سحب باستخدام رقم الكود
        </p>
      </div>
      <CashoutCodeSearch />
    </div>
  )
}
