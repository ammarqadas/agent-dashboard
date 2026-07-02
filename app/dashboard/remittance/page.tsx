import { RemittanceForm } from "@/components/dashboard/remittance-form"

export default function RemittancePage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">إرسال حوالة</h1>
        <p className="text-muted-foreground mt-1">
          إرسال حوالة مالية فورية
        </p>
      </div>
      <RemittanceForm />
    </div>
  )
}