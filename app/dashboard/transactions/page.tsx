import { Suspense } from "react"
import { TransactionsList } from "@/components/transactions-list"

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-muted-foreground">جاري التحميل...</div>}>
      <TransactionsList />
    </Suspense>
  )
}
