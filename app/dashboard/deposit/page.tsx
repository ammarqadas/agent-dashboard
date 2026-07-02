import { WalletDeposit } from "@/components/wallet-deposit"

export default function DepositPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">إيداع رصيد</h1>
        <p className="text-muted-foreground mt-1">
          إضافة رصيد إلى محفظة العميل
        </p>
      </div>
      <WalletDeposit />
    </div>
  )
}