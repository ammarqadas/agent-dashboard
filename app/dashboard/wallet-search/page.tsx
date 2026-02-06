import { WalletSearch } from "@/components/wallet-search"

export default function WalletSearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Search Wallet</h2>
        <p className="text-muted-foreground">
          Search for customer wallets by mobile number
        </p>
      </div>
      <WalletSearch />
    </div>
  )
}


