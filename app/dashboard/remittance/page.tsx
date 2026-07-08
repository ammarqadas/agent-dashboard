import { RemittanceForm } from "@/components/dashboard/remittance-form"

export default function RemittancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">حوالة الى حساب</h1>
        <p className="text-muted-foreground mt-1">
          حوالة فورية الى حساب
        </p>
      </div>
      <RemittanceForm />
    </div>
  )
}