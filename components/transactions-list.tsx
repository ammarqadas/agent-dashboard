"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api"
import { ArrowUpCircle, ArrowDownCircle, RefreshCcw, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function TransactionsList() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filterWalletId, setFilterWalletId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [currencyMap, setCurrencyMap] = useState<Record<string, string>>({})
  const [agentAccountIds, setAgentAccountIds] = useState<Set<string | number>>(new Set())
  const [accountMap, setAccountMap] = useState<Record<string, string>>({})

  useEffect(() => {
    loadCurrencies()
    loadAgentAccounts()
    loadTransactions()
  }, [])

  useEffect(() => {
    // Load account details when transactions change
    if (transactions.length > 0) {
      loadAccountDetails()
    }
  }, [transactions])

  const loadCurrencies = async () => {
    try {
      const response = await apiClient.getCurrencies()
      if (response.success) {
        const list = (response.data || response.currencies || response.docs || []) as any[]
        const map: Record<string, string> = {}
        list.forEach((c: any) => {
          const idKey = c.id != null ? String(c.id) : undefined
          const code = c.code || c.symbol || c.name || (idKey ? `#${idKey}` : "")
          if (idKey && code) {
            map[idKey] = code
          }
        })
        setCurrencyMap(map)
      }
    } catch (err) {
      console.error("Failed to load currencies for transactions:", err)
      // non-blocking: we can still show raw IDs
    }
  }

  const loadAgentAccounts = async () => {
    try {
      const response = await apiClient.getAgentAccount()
      if (response.success) {
        const accounts = (response.accounts || response.docs || response.data || []) as any[]
        const accountIds = new Set<string | number>()
        const accountNameMap: Record<string, string> = {}
        accounts.forEach((acc: any) => {
          if (acc.id != null) {
            accountIds.add(acc.id)
            const idKey = String(acc.id)
            accountNameMap[idKey] = acc.name || acc.accountName || `حساب #${acc.id}`
          }
        })
        setAgentAccountIds(accountIds)
        setAccountMap(prev => ({ ...prev, ...accountNameMap }))
      }
    } catch (err) {
      console.error("Failed to load agent accounts:", err)
      // non-blocking: we can still determine sign based on operation type
    }
  }

  const loadAccountDetails = async () => {
    try {
      // Collect unique account IDs from transactions
      const accountIds = new Set<string | number>()
      transactions.forEach((tx: any) => {
        if (tx.sourceAccount) {
          const id = typeof tx.sourceAccount === 'object' ? tx.sourceAccount.id : tx.sourceAccount
          if (id && !accountMap[String(id)]) accountIds.add(id)
        }
        if (tx.destinationAccount) {
          const id = typeof tx.destinationAccount === 'object' ? tx.destinationAccount.id : tx.destinationAccount
          if (id && !accountMap[String(id)]) accountIds.add(id)
        }
      })

      if (accountIds.size === 0) return

      // Fetch account details for each unique ID (batch in parallel)
      const accountPromises = Array.from(accountIds).map(async (id) => {
        try {
          const response = await apiClient.getAccount(id)
          if (response.success && (response.data || response)) {
            const acc = (response.data || response) as any
            const idKey = String(id)
            return {
              id: idKey,
              name: acc.name || acc.accountName || `حساب #${id}`,
            }
          }
        } catch (err) {
          // Silently fail for individual accounts
          console.debug(`Account ${id} not found or error:`, err)
        }
        return null
      })

      const accountDetails = await Promise.all(accountPromises)
      const newAccountMap: Record<string, string> = {}
      accountDetails.forEach((acc) => {
        if (acc) {
          newAccountMap[acc.id] = acc.name
        }
      })
      if (Object.keys(newAccountMap).length > 0) {
        setAccountMap(prev => ({ ...prev, ...newAccountMap }))
      }
    } catch (err) {
      console.error("Failed to load account details:", err)
    }
  }

  const loadTransactions = async (walletIdFilter?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.getTransactions({
        walletId: walletIdFilter,
        limit: 100,
      })
      if (response.success) {
        setTransactions(response.transactions || response.docs || [])
      } else {
        setError(response.message || "فشل في تحميل العمليات")
      }
    } catch (err) {
      console.error("Failed to load transactions:", err)
      setError("حدث خطأ أثناء تحميل العمليات")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilter = () => {
    if (filterWalletId.trim()) {
      loadTransactions(filterWalletId.trim())
    } else {
      loadTransactions()
    }
  }

  const getStatusBadge = (status: string) => {
    const statusLabels: Record<string, string> = {
      completed: "مكتمل",
      pending: "معلق",
      failed: "فشل",
    }
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
    }
    return <Badge variant={variants[status] || "outline"}>{statusLabels[status] || status}</Badge>
  }

  const getOperationLabel = (operation: string, tx?: any) => {
    // If operation is missing or invalid, try to infer from transaction data
    if (!operation || operation === "N/A" || operation === "مكتمل") {
      if (tx) {
        // Try to infer from description
        const description = (tx.description || "").toLowerCase()
        if (description.includes("deposit") || description.includes("إيداع")) {
          operation = "deposit"
        } else if (description.includes("cashout") || description.includes("سحب")) {
          operation = "cash_out"
        } else if (description.includes("transfer") || description.includes("تحويل")) {
          operation = "transfer"
        } else if (description.includes("withdrawal") || description.includes("سحب")) {
          operation = "withdrawal"
        }
        
        // If still no operation, check account relationships
        if (!operation || operation === "N/A" || operation === "مكتمل") {
          const sourceId = typeof tx.sourceAccount === 'object' ? tx.sourceAccount?.id : tx.sourceAccount
          const destId = typeof tx.destinationAccount === 'object' ? tx.destinationAccount?.id : tx.destinationAccount
          const sourceIdStr = sourceId ? String(sourceId) : null
          const destIdStr = destId ? String(destId) : null
          const isFromAgent = sourceIdStr && agentAccountIds.has(sourceIdStr)
          const isToAgent = destIdStr && agentAccountIds.has(destIdStr)
          
          // If from agent to wallet, likely a deposit
          if (isFromAgent && !isToAgent) {
            operation = "deposit"
          }
        }
      }
    }
    
    // Check if it's a deposit to wallet (not agent account)
    if (operation === "deposit" && tx) {
      const destId = typeof tx.destinationAccount === 'object' ? tx.destinationAccount?.id : tx.destinationAccount
      const destIdStr = destId ? String(destId) : null
      const isToAgent = destIdStr && agentAccountIds.has(destIdStr)
      
      // If deposit is NOT to an agent account, it's a deposit to wallet
      if (!isToAgent) {
        return "ايداع محفظة عميل"
      }
    }
    
    const labels: Record<string, string> = {
      deposit: "إيداع",
      withdrawal: "سحب",
      withdraw: "سحب",
      transfer: "تحويل",
      cashout: "صرف كود",
      "cash_out": "دفع كود سحب",
      "cashout-create": "إنشاء كود سحب",
      "cashout-pay": "دفع كود سحب",
      payment: "دفع",
      refund: "استرداد",
    }
    return labels[operation] || operation || "N/A"
  }

  const getAccountName = (account: any) => {
    if (!account) return "—"
    let accountId: string | number | undefined
    
    if (typeof account === "object") {
      accountId = account.id
      // If account object has name, use it
      if (account.name || account.accountName) {
        return account.name || account.accountName
      }
    } else {
      accountId = account
    }
    
    // Check if we have the account name in our map
    if (accountId) {
      const idKey = String(accountId)
      if (accountMap[idKey]) {
        return accountMap[idKey]
      }
    }
    
    // Fallback to ID
    return `#${accountId || account}`
  }

  const getCurrencyCode = (currency: any) => {
    if (!currency) return "—"
    if (typeof currency === "object") {
      const idKey = currency.id != null ? String(currency.id) : undefined
      const mapped = idKey ? currencyMap[idKey] : undefined
      return mapped || currency.code || currency.symbol || (idKey ? `#${idKey}` : "—")
    }
    const key = String(currency)
    return currencyMap[key] || key
  }

  // Determine if transaction is credit or debit from agent's perspective
  const isCredit = (tx: any) => {
    // Get account IDs
    const sourceId = typeof tx.sourceAccount === 'object' ? tx.sourceAccount?.id : tx.sourceAccount
    const destId = typeof tx.destinationAccount === 'object' ? tx.destinationAccount?.id : tx.destinationAccount
    
    const sourceIdStr = sourceId ? String(sourceId) : null
    const destIdStr = destId ? String(destId) : null
    
    // Check if this is an agent transaction
    const isFromAgent = sourceIdStr && agentAccountIds.has(sourceIdStr)
    const isToAgent = destIdStr && agentAccountIds.has(destIdStr)
    
    // Cashout code payment: should be green + (credit)
    if (tx.operationType === "cash_out" || tx.operationType === "cashout-pay") {
      return true
    }
    
    // Deposit operations
    if (tx.operationType === "deposit") {
      // Deposit to agent account: should be green + (credit)
      if (isToAgent) {
        return true
      }
      // Deposit to wallet (not agent account): should be red - (debit)
      return false
    }
    
    // For other operations, use account direction:
    // If money is coming TO agent account, it's a credit (positive)
    if (isToAgent && !isFromAgent) {
      return true
    }
    // If money is going FROM agent account, it's a debit (negative)
    if (isFromAgent && !isToAgent) {
      return false
    }
    // If both are agent accounts, default to credit
    if (isFromAgent && isToAgent) {
      return true
    }
    
    // For non-agent transactions, use operation type
    const creditOperations = ["refund"]
    return creditOperations.includes(tx.operationType)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">سجل العمليات</h2>
          <p className="text-muted-foreground">
            عرض سجل العمليات المالية
          </p>
        </div>
        <Button onClick={() => loadTransactions(filterWalletId.trim() || undefined)} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="ml-2 h-4 w-4" />
          )}
          تحديث
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>خطأ</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border bg-card/80 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>سجل العمليات</CardTitle>
              <CardDescription>جميع العمليات المالية الخاصة بحسابك</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Input
                placeholder="تصفية حسب رقم المحفظة"
                value={filterWalletId}
                onChange={(e) => setFilterWalletId(e.target.value)}
                className="flex-1 sm:w-48"
                dir="ltr"
              />
              <Button onClick={handleFilter} disabled={isLoading}>
                تصفية
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap px-6">العملية</TableHead>
                    <TableHead className="whitespace-nowrap px-6">المبلغ</TableHead>
                    <TableHead className="whitespace-nowrap px-6">العملة</TableHead>
                    <TableHead className="px-6">من حساب</TableHead>
                    <TableHead className="px-6">إلى حساب</TableHead>
                    <TableHead className="px-6">الوصف</TableHead>
                    <TableHead className="whitespace-nowrap px-6">الحالة</TableHead>
                    <TableHead className="whitespace-nowrap px-6">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        لا توجد عمليات لعرضها
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx: any) => {
                      const credit = isCredit(tx)
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="whitespace-nowrap px-6">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-normal whitespace-nowrap">
                                {getOperationLabel(tx.operationType, tx)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-6">
                            <div className={`flex items-center gap-1 font-semibold ${credit ? "text-emerald-600" : "text-red-600"}`}>
                              {credit ? (
                                <ArrowDownCircle className="h-4 w-4" />
                              ) : (
                                <ArrowUpCircle className="h-4 w-4" />
                              )}
                              <span dir="ltr">
                                {credit ? "+" : "-"}{Math.abs(tx.amount || 0).toFixed(2)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-6">
                            <Badge variant="secondary">
                              {getCurrencyCode(tx.currency)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm px-6">
                            {getAccountName(tx.sourceAccount)}
                          </TableCell>
                          <TableCell className="text-sm px-6">
                            {getAccountName(tx.destinationAccount)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground px-6 max-w-md" title={tx.description || ""}>
                            <div className="truncate">
                              {tx.description || "—"}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-6">{getStatusBadge(tx.status || "completed")}</TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap px-6" dir="ltr">
                            {tx.createdAt
                              ? new Date(tx.createdAt).toLocaleString("ar-EG", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}



