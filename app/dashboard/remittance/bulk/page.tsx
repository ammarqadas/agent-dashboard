import { BulkRemittanceForm } from "@/components/dashboard/bulk-remittance-form"

export default function BulkRemittancePage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">حوالات جماعية</h1>
        <p className="text-muted-foreground mt-1">
          إرسال عدة حوالات دفعة واحدة عبر ملف
        </p>
      </div>
      <BulkRemittanceForm />
    </div>
  )
}