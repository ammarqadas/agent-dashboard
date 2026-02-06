import { CashoutCodes } from "@/components/cashout-codes"

export default function CashoutCodesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Cashout Codes</h2>
        <p className="text-muted-foreground">
          Manage cashout codes - create, search, and pay
        </p>
      </div>
      <CashoutCodes />
    </div>
  )
}


