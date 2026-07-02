import { WalletSearch } from "@/components/wallet-search"

export default function WalletSearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">بحث عن محفظة</h2>
        <p className="text-muted-foreground">
          البحث عن محافظ العملاء برقم الجوال
        </p>
      </div>
      <WalletSearch />
    </div>
  )
}
