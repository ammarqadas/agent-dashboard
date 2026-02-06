import { TransactionsList } from "@/components/transactions-list"

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
        <p className="text-muted-foreground">
          View transaction history and filter by wallet
        </p>
      </div>
      <TransactionsList />
    </div>
  )
}


