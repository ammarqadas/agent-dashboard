import { WalletDeposit } from "@/components/wallet-deposit"

export default function DepositPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Deposit to Wallet</h2>
        <p className="text-muted-foreground">
          Add funds to a customer wallet
        </p>
      </div>
      <WalletDeposit />
    </div>
  )
}


