import { RemittanceSearchPay } from "@/components/dashboard/remittance-search-pay"

export default function RemittanceSearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">بحث ودفع حوالة</h1>
        <p className="text-muted-foreground mt-1">
          البحث عن حوالة ودفعها بهوية المستلم
        </p>
      </div>
      <RemittanceSearchPay />
    </div>
  )
}
