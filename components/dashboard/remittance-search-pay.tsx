"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Search,
  User,
  Coins,
  Loader2,
  CheckCircle2,
  XCircle,
  CreditCard,
  RotateCcw,
} from "lucide-react"
import { apiClient } from "@/lib/api"

type SearchResult = {
  networkKey: string
  searchToken: string
  [key: string]: any
}

type PayResult = {
  txId: number
  expressid: string
  amount: number
  commission: number
  totalAmount: number
  status: string
}

export function RemittanceSearchPay() {
  const [networks, setNetworks] = useState<any[]>([])
  const [selectedNetwork, setSelectedNetwork] = useState("")
  const [remittanceId, setRemittanceId] = useState("")

  const [isSearching, setIsSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)

  const [idNumber, setIdNumber] = useState("")
  const [idType, setIdType] = useState<"national" | "passport">("national")
  const [expdate, setExpdate] = useState("")

  const [isPaying, setIsPaying] = useState(false)
  const [payResult, setPayResult] = useState<PayResult | null>(null)

  const [error, setError] = useState("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  useEffect(() => {
    const fetchNetworks = async () => {
      try {
        const response = await apiClient.getDistWallets()
        if (response.success && response.docs) {
          setNetworks(response.docs)
        }
      } catch (err) {
        console.error("Failed to fetch networks:", err)
      }
    }
    fetchNetworks()
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSearchResult(null)
    setPayResult(null)
    setIsSearching(true)

    try {
      if (!selectedNetwork) {
        setError("الرجاء اختيار الشبكة")
        setIsSearching(false)
        return
      }
      if (!remittanceId.trim()) {
        setError("الرجاء إدخال رقم الحوالة")
        setIsSearching(false)
        return
      }

      const response = await apiClient.agentRemittanceSearch(selectedNetwork, remittanceId.trim())

      if (response.success) {
        const { success, message, ...data } = response
        setSearchResult({
          ...data,
          networkKey: data.networkKey || selectedNetwork,
          searchToken: data.searchToken,
        } as SearchResult)
      } else {
        setError(response.message || "لم يتم العثور على الحوالة")
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء البحث")
    } finally {
      setIsSearching(false)
    }
  }

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setShowConfirmDialog(true)
  }

  const handleConfirmPay = async () => {
    if (!searchResult) return
    setError("")
    setIsPaying(true)

    try {
      const payload = {
        searchToken: searchResult.searchToken,
        amount: searchResult.amount,
        currency: searchResult.currencyCode,
        senderName: searchResult.senderName,
        senderMobile: searchResult.senderMobile,
        receiverName: searchResult.receiverName,
        receiverMobile: searchResult.receiverMobile,
        ...(idNumber.trim() ? { idNumber: idNumber.trim() } : {}),
        ...(idType ? { type: idType } : {}),
        ...(expdate ? { expdate } : {}),
      }

      const response = await apiClient.agentRemittancePay(searchResult.networkKey, payload)

      if (response.success) {
        setPayResult(response.data as unknown as PayResult)
        setShowConfirmDialog(false)
      } else {
        setError(response.message || "فشل في دفع الحوالة")
        setShowConfirmDialog(false)
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء الدفع")
      setShowConfirmDialog(false)
    } finally {
      setIsPaying(false)
    }
  }

  const handleReset = () => {
    setRemittanceId("")
    setSearchResult(null)
    setPayResult(null)
    setError("")
    setIdNumber("")
    setIdType("national")
    setExpdate("")
  }

  return (
    <>
      <div className="space-y-6">
        {/* Step 1: Search */}
        {!payResult && (
          <Card className="rounded-xl border border-border/60">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="icon-container">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">بحث عن حوالة</CardTitle>
                  <CardDescription>
                    اختر الشبكة وأدخل رقم الحوالة للبحث
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSearch} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="form-field">
                    <Label htmlFor="network" className="text-sm font-medium">الشبكة</Label>
                    <Select value={selectedNetwork} onValueChange={setSelectedNetwork} disabled={!!searchResult}>
                      <SelectTrigger className="text-right [&>span]:text-right">
                        <SelectValue placeholder="اختر الشبكة" />
                      </SelectTrigger>
                      <SelectContent>
                        {networks.map((network) => (
                          <SelectItem key={network.key} value={network.key} className="text-right">
                            {network.name || network.key}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="form-field">
                    <Label htmlFor="remittanceId" className="text-sm font-medium">رقم الحوالة (Express ID)</Label>
                    <Input
                      id="remittanceId"
                      placeholder="أدخل رقم الحوالة"
                      value={remittanceId}
                      onChange={(e) => setRemittanceId(e.target.value)}
                      disabled={!!searchResult}
                      dir="ltr"
                      className="font-mono"
                    />
                  </div>
                </div>

                {error && !searchResult && (
                  <Alert variant="destructive" className="rounded-xl">
                    <XCircle className="h-4 w-4" />
                    <div className="font-medium">{error}</div>
                  </Alert>
                )}

                {!searchResult && (
                  <Button
                    type="submit"
                    disabled={isSearching}
                    className="w-full h-11 font-semibold"
                  >
                    {isSearching ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>جاري البحث...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        <span>بحث</span>
                      </div>
                    )}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {/* Search Result + Identity Form */}
        {searchResult && !payResult && (
          <Card className="rounded-xl border border-border/60">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="icon-container bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">بيانات الحوالة</CardTitle>
                  <CardDescription>
                    تأكد من البيانات ثم أدخل هوية المستلم للدفع
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Remittance Info Cards */}
              <div className="grid md:grid-cols-3 gap-3">
                {/* Sender */}
                <div className="dash-stat-card space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <User className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">المرسل</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">الاسم</span>
                      <span className="text-sm font-semibold">{searchResult.senderName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">الجوال</span>
                      <span className="text-sm font-mono font-medium" dir="ltr">{searchResult.senderMobile}</span>
                    </div>
                  </div>
                </div>

                {/* Receiver */}
                <div className="dash-stat-card space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <User className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">المستلم</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">الاسم</span>
                      <span className="text-sm font-semibold">{searchResult.receiverName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">الجوال</span>
                      <span className="text-sm font-mono font-medium" dir="ltr">{searchResult.receiverMobile}</span>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="dash-stat-card space-y-3">
                  <div className="flex items-center gap-2 text-amber-600">
                    <Coins className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">المبلغ</span>
                  </div>
                  <div className="pt-2">
                    <div className="text-2xl font-bold font-mono text-foreground" dir="ltr">
                      {searchResult.amount?.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{searchResult.currencyCode}</div>
                  </div>
                </div>
              </div>

              {/* Identity Form */}
              <div className="form-section space-y-4">
                <Label className="form-section-title">
                  <CreditCard className="h-4 w-4" />
                  هوية المستلم
                </Label>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="form-field">
                    <Label htmlFor="idNumber" className="text-sm font-medium">رقم الهوية</Label>
                    <Input
                      id="idNumber"
                      placeholder="أدخل رقم الهوية"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      dir="ltr"
                      className="font-mono"
                    />
                  </div>
                  <div className="form-field">
                    <Label htmlFor="idType" className="text-sm font-medium">نوع الهوية</Label>
                    <Select value={idType} onValueChange={(v) => setIdType(v as "national" | "passport")}>
                      <SelectTrigger className="text-right [&>span]:text-right">
                        <SelectValue placeholder="اختر النوع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="national" className="text-right">بطاقة شخصية</SelectItem>
                        <SelectItem value="passport" className="text-right">جواز سفر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="form-field">
                    <Label htmlFor="expdate" className="text-sm font-medium">تاريخ الانتهاء</Label>
                    <Input
                      id="expdate"
                      type="date"
                      value={expdate}
                      onChange={(e) => setExpdate(e.target.value)}
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <XCircle className="h-4 w-4" />
                  <div className="font-medium">{error}</div>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="h-11"
                >
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    <span>بحث جديد</span>
                  </div>
                </Button>
                <Button
                  onClick={handlePaySubmit}
                  disabled={isPaying}
                  className="flex-1 h-11 font-semibold bg-gradient-to-r from-primary to-emerald-600 hover:to-emerald-700"
                >
                  {isPaying ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>جاري الدفع...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4" />
                      <span>دفع الحوالة</span>
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pay Success */}
        {payResult && (
          <Card className="rounded-xl border border-border/60">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="icon-container bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">تم الدفع بنجاح</CardTitle>
                  <CardDescription>
                    تفاصيل عملية الدفع
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="dash-stat-card">
                  <div className="text-xs text-muted-foreground mb-1">رقم العملية</div>
                  <div className="text-lg font-bold font-mono">{payResult.txId}</div>
                </div>
                <div className="dash-stat-card">
                  <div className="text-xs text-muted-foreground mb-1">رقم الحوالة</div>
                  <div className="text-lg font-bold font-mono">{payResult.expressid}</div>
                </div>
                <div className="dash-stat-card">
                  <div className="text-xs text-muted-foreground mb-1">المبلغ</div>
                  <div className="text-lg font-bold font-mono">{payResult.amount?.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">{searchResult?.currencyCode}</span></div>
                </div>
                <div className="dash-stat-card">
                  <div className="text-xs text-muted-foreground mb-1">العمولة</div>
                  <div className="text-lg font-bold font-mono">{payResult.commission?.toLocaleString()}</div>
                </div>
              </div>
              <div className="dash-stat-card border-primary/20 bg-primary/5">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">الإجمالي</span>
                  <span className="text-xl font-bold font-mono text-primary">{payResult.totalAmount?.toLocaleString()}</span>
                </div>
              </div>

              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full h-11 font-semibold"
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  <span>بحث عن حوالة جديدة</span>
                </div>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              تأكيد الدفع
            </DialogTitle>
            <DialogDescription>
              راجع بيانات الحوالة قبل الدفع
            </DialogDescription>
          </DialogHeader>

          {searchResult && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <div className="text-xs font-bold text-muted-foreground">المرسل</div>
                  <div className="font-medium">{searchResult.senderName}</div>
                  <div className="font-mono text-xs" dir="ltr">{searchResult.senderMobile}</div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <div className="text-xs font-bold text-muted-foreground">المستلم</div>
                  <div className="font-medium">{searchResult.receiverName}</div>
                  <div className="font-mono text-xs" dir="ltr">{searchResult.receiverMobile}</div>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">المبلغ</span>
                  <span className="font-mono font-bold text-lg">{searchResult.amount?.toLocaleString()} {searchResult.currencyCode}</span>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <div className="text-xs font-bold text-muted-foreground">هوية المستلم</div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">رقم الهوية</span>
                  <span className="font-mono" dir="ltr">{idNumber || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">النوع</span>
                  <span>{idType === "national" ? "بطاقة شخصية" : "جواز سفر"}</span>
                </div>
                {expdate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">تاريخ الانتهاء</span>
                    <span className="font-mono" dir="ltr">{expdate}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" disabled={isPaying}>
                إلغاء
              </Button>
            </DialogClose>
            <Button
              onClick={handleConfirmPay}
              disabled={isPaying}
              className="bg-gradient-to-r from-primary to-emerald-600 hover:to-emerald-700"
            >
              {isPaying ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري الدفع...</span>
                </div>
              ) : (
                <span>تأكيد الدفع</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
