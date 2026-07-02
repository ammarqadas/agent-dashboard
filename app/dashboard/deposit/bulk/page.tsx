import { WalletBulkDeposit } from "@/components/dashboard/wallet-bulk-deposit"

export default function BulkDepositPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">إيداع جماعي</h1>
        <p className="text-muted-foreground mt-1">
          رفع ملف لإيداع مبالغ لعدة محافظ دفعة واحدة
        </p>
      </div>
      <WalletBulkDeposit />
    </div>
  )
}