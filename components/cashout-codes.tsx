"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiClient } from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, Info, XCircle } from "lucide-react"

export function CashoutCodes() {
  const [searchCode, setSearchCode] = useState("")
  const [searchResult, setSearchResult] = useState<any>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [codes, setCodes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currencies, setCurrencies] = useState<any[]>([])
  const [createForm, setCreateForm] = useState({
    mobile: "",
    amount: "",
    currency: "",
  })
  const [isCreating, setIsCreating] = useState(false)
  const [activeTab, setActiveTab] = useState("list")
  const [notice, setNotice] = useState<
    | { type: "info" | "success" | "error"; title: string; message?: string }
    | null
  >(null)

  const showNotice = (
    type: "info" | "success" | "error",
    title: string,
    message?: string
  ) => {
    setNotice({ type, title, message })
    // auto-hide
    window.clearTimeout((showNotice as any)._t)
    ;(showNotice as any)._t = window.setTimeout(() => setNotice(null), 5000)
  }

  useEffect(() => {
    loadCashoutCodes()
    loadCurrencies()
  }, [statusFilter])

  const loadCurrencies = async () => {
    try {
      const response = await apiClient.getCurrencies()
      if (response.success && response.docs) {
        setCurrencies(response.docs)
      }
    } catch (err) {
      console.error("Failed to fetch currencies:", err)
    }
  }

  const loadCashoutCodes = async () => {
    setIsLoading(true)
    try {
      // #region agent log
      const tokenBeforeList = typeof window !== 'undefined' ? localStorage.getItem('agentToken') : null
      fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'cashout-codes.tsx:78',message:'loadCashoutCodes called',data:{hasToken:!!tokenBeforeList,tokenLength:tokenBeforeList?.length||0,statusFilter},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      const status = statusFilter === "all" ? undefined : statusFilter
      const response = await apiClient.listCashoutCodes(status)
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'cashout-codes.tsx:82',message:'loadCashoutCodes response',data:{success:response.success,message:response.message,hasToken:!!tokenBeforeList},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      if (response.success) {
        setCodes(response.cashoutCodes || response.docs || [])
      }
    } catch (err) {
      console.error("Failed to load cashout codes:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSearching(true)
    try {
      const response = await apiClient.searchCashoutCode(searchCode.trim())
      if (response.success) {
        setSearchResult(response.cashoutCode)
        showNotice("success", "Cashout code found", `Code ${searchCode.trim()} loaded.`)
      } else {
        setSearchResult(null)
        showNotice("error", "Not found", response.message || "Cashout code not found")
      }
    } catch (err) {
      console.error("Search failed:", err)
      showNotice("error", "Search failed", "Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  const handlePayCode = async (code: string) => {
    if (!confirm("Are you sure you want to pay this cashout code?")) return

    try {
      const response = await apiClient.payCashoutCode(code)
      if (response.success) {
        showNotice("success", "Paid successfully", `Cashout code ${code} was paid.`)
        loadCashoutCodes()
        if (searchResult?.code === code) {
          handleSearch({ preventDefault: () => {} } as any)
        }
      } else {
        showNotice("error", "Payment failed", response.message || "Failed to pay cashout code")
      }
    } catch (err) {
      console.error("Pay failed:", err)
      showNotice("error", "Payment error", "An error occurred while paying the code.")
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      const amount = parseFloat(createForm.amount)
      if (isNaN(amount) || amount <= 0) {
        showNotice("error", "مبلغ غير صحيح", "يرجى إدخال مبلغ صحيح.")
        setIsCreating(false)
        return
      }

      // #region agent log
      const tokenBeforeCreate = typeof window !== 'undefined' ? localStorage.getItem('agentToken') : null
      fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'cashout-codes.tsx:138',message:'Before createCashoutCode',data:{hasToken:!!tokenBeforeCreate,tokenLength:tokenBeforeCreate?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      const response = await apiClient.createCashoutCode(
        createForm.mobile,
        amount,
        createForm.currency
      )

      // #region agent log
      const tokenAfterCreate = typeof window !== 'undefined' ? localStorage.getItem('agentToken') : null
      fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'cashout-codes.tsx:148',message:'After createCashoutCode',data:{success:response.success,hasToken:!!tokenAfterCreate,tokenLength:tokenAfterCreate?.length||0,tokenChanged:tokenBeforeCreate!==tokenAfterCreate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      if (response.success) {
        const createdCode = response.code || response.result?.code
        const currencyCode = currencies.find(c => String(c.id) === createForm.currency)?.code || ""
        const walletInfo = response.result?.wallet
        
        // Enhanced success message with details
        const messageParts: string[] = []
        if (createdCode) messageParts.push(`الكود: ${createdCode}`)
        messageParts.push(`المبلغ: ${amount.toLocaleString('en-US')} ${currencyCode}`)
        if (walletInfo?.name) messageParts.push(`العميل: ${walletInfo.name}`)
        if (walletInfo?.mobile) messageParts.push(`الجوال: ${walletInfo.mobile}`)
        
        showNotice("success", "تم إنشاء كود السحب بنجاح", messageParts.join(" | "))
        setCreateForm({ mobile: "", amount: "", currency: "" })
        
        // #region agent log
        const tokenBeforeLoad = typeof window !== 'undefined' ? localStorage.getItem('agentToken') : null
        fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'cashout-codes.tsx:149',message:'Before loadCashoutCodes call',data:{hasToken:!!tokenBeforeLoad,tokenLength:tokenBeforeLoad?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        
        // Refresh the list
        await loadCashoutCodes()
        
        // Switch to list tab to show the new code
        setTimeout(() => setActiveTab("list"), 100)
      } else {
        showNotice("error", "فشل الإنشاء", response.message || "فشل في إنشاء كود السحب")
      }
    } catch (err) {
      console.error("Create failed:", err)
      showNotice("error", "خطأ في الإنشاء", "حدث خطأ أثناء إنشاء الكود. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsCreating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      pending: "secondary",
      expired: "destructive",
    }
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>
  }

  return (
    <div className="space-y-6">
      {notice && (
        <Alert variant={notice.type === "error" ? "destructive" : "default"}>
          {notice.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : notice.type === "error" ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
          <div>
            <AlertTitle>{notice.title}</AlertTitle>
            {notice.message ? (
              <AlertDescription>{notice.message}</AlertDescription>
            ) : null}
          </div>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">قائمة الأكواد</TabsTrigger>
          <TabsTrigger value="search">بحث عن كود</TabsTrigger>
          <TabsTrigger value="create">إنشاء كود</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card className="border bg-card/80 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cashout Codes</CardTitle>
                  <CardDescription>عرض وإدارة أكواد السحب</CardDescription>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="تصفية حسب الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="pending">معلّق</SelectItem>
                    <SelectItem value="paid">مدفوع</SelectItem>
                    <SelectItem value="expired">منتهي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          لا توجد أكواد
                        </TableCell>
                      </TableRow>
                    ) : (
                      codes.map((code: any) => (
                        <TableRow key={code.id}>
                          <TableCell className="font-mono">{code.code}</TableCell>
                          <TableCell>{code.amount}</TableCell>
                          <TableCell>
                            {typeof code.currency === "object"
                              ? code.currency.code
                              : code.currency}
                          </TableCell>
                          <TableCell>{getStatusBadge(code.status)}</TableCell>
                          <TableCell>
                            {typeof code.wallet === "object"
                              ? code.wallet.mobile || code.wallet.name
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {new Date(code.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {code.status === "pending" && (
                              <Button
                                size="sm"
                                onClick={() => handlePayCode(code.code)}
                              >
                                دفع
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card className="border bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle>بحث عن كود سحب</CardTitle>
              <CardDescription>ابحث عن كود سحب باستخدام رقم الكود</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="code" className="text-right block">كود السحب</Label>
                      <Input
                        id="code"
                        type="text"
                        placeholder="أدخل كود السحب"
                        value={searchCode}
                        onChange={(e) => setSearchCode(e.target.value)}
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSearching} className="min-w-40">
                    {isSearching ? "جاري البحث..." : "بحث"}
                  </Button>
                </div>
              </form>

              {searchResult && (
                <div className="mt-6 p-4 border rounded-lg space-y-2">
                  <h3 className="font-semibold">Code Details</h3>
                  <p><strong>Code:</strong> {searchResult.code}</p>
                  <p><strong>Amount:</strong> {searchResult.amount}</p>
                  <p><strong>Currency:</strong>{" "}
                    {typeof searchResult.currency === "object"
                      ? searchResult.currency.code
                      : searchResult.currency}
                  </p>
                  <p><strong>Status:</strong> {getStatusBadge(searchResult.status)}</p>
                  <p><strong>Wallet:</strong>{" "}
                    {typeof searchResult.wallet === "object"
                      ? `${searchResult.wallet.name} (${searchResult.wallet.mobile})`
                      : "N/A"}
                  </p>
                  {searchResult.status === "pending" && (
                    <Button
                      onClick={() => handlePayCode(searchResult.code)}
                      className="mt-4"
                    >
                      دفع الكود
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card className="border bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle>إنشاء كود سحب</CardTitle>
              <CardDescription>إنشاء كود سحب جديد للعميل</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="mobile" className="text-right block">جوال العميل</Label>
                      <Input
                        id="mobile"
                        type="tel"
                        placeholder="أدخل رقم جوال العميل"
                        value={createForm.mobile}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, mobile: e.target.value })
                        }
                        required
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-right block">المبلغ</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={createForm.amount}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, amount: e.target.value })
                        }
                        required
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency" className="text-right block">العملة</Label>
                      <Select
                        value={createForm.currency}
                        onValueChange={(value) =>
                          setCreateForm({ ...createForm, currency: value })
                        }
                        required
                      >
                        <SelectTrigger className="text-right [&>span]:text-right">
                          <SelectValue placeholder="اختر العملة" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((curr) => (
                            <SelectItem key={curr.id} value={String(curr.id)} className="text-right">
                              {curr.code} - {curr.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" className="min-w-40" disabled={isCreating}>
                    {isCreating ? "جاري الإنشاء..." : "إنشاء كود"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

