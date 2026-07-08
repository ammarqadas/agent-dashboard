import { WalletCreate } from "@/components/wallet-create"

export default function WalletCreatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">إنشاء محفظة</h2>
        <p className="text-muted-foreground">
          إنشاء محفظة جديدة للعميل
        </p>
      </div>
      <WalletCreate />
    </div>
  )
}
