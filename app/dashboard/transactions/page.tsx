import { TransactionsList } from "@/components/transactions-list"

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground">
          عرض سجل العمليات المالية
        </p>
      </div>
      <TransactionsList />
    </div>
  )
}
