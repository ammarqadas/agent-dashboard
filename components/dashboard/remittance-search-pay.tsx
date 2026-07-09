"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  CreditCard,
  RotateCcw,
  Calendar,
  X,
  Send,
} from "lucide-react"
import { toast } from "sonner"
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

// ─── Step 1: Search Remittance Card ───────────────────────────────────

function SearchRemittanceCard({
  networks,
  selectedNetwork,
  remittanceId,
  isSearching,
  searchResult,
  onNetworkChange,
  onRemittanceIdChange,
  onSubmit,
}: {
  networks: any[]
  selectedNetwork: string
  remittanceId: string
  isSearching: boolean
  searchResult: SearchResult | null
  onNetworkChange: (v: string) => void
  onRemittanceIdChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <Card className="rounded-xl border border-border/60">
      <CardHeader className="pb-5 border-b border-border/40 bg-gradient-to-br from-primary/5 via-primary/[0.08] to-transparent">
        <div className="flex items-center gap-3">
          <div className="icon-container">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">بحث عن حوالة</CardTitle>
              <Badge variant="secondary" className="text-xs">بحث</Badge>
            </div>
            <CardDescription>
              اختر الشبكة وأدخل رقم الحوالة للبحث
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="form-field">
              <Label htmlFor="network" className="text-sm font-medium">الشبكة</Label>
              <Select value={selectedNetwork} onValueChange={onNetworkChange} disabled={!!searchResult}>
                <SelectTrigger className="text-right [&>span]:text-right">
                  {networks.length === 0 ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>جاري التحميل...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder="اختر الشبكة" />
                  )}
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
              <div className="input-icon-wrapper">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  id="remittanceId"
                  placeholder="أدخل رقم الحوالة"
                  value={remittanceId}
                  onChange={(e) => onRemittanceIdChange(e.target.value)}
                  disabled={!!searchResult}
                  dir="ltr"
                  className="pr-10 font-mono"
                />
              </div>
            </div>
          </div>

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
  )
}

// ─── Step 2: Remittance Result + Identity + Preview Sidebar ───────────

function RemittanceResultStep({
  searchResult,
  idNumber,
  idType,
  expdate,
  isPaying,
  networks,
  onIdNumberChange,
  onIdTypeChange,
  onExpdateChange,
  onPaySubmit,
  onReset,
}: {
  searchResult: SearchResult
  idNumber: string
  idType: "national" | "passport"
  expdate: string
  isPaying: boolean
  networks: any[]
  onIdNumberChange: (v: string) => void
  onIdTypeChange: (v: "national" | "passport") => void
  onExpdateChange: (v: string) => void
  onPaySubmit: (e: React.FormEvent) => void
  onReset: () => void
}) {
  const networkName = networks.find(n => n.key === searchResult.networkKey)?.name || searchResult.networkKey

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left: Remittance Info + Identity Form */}
      <div className="lg:col-span-2">
        <Card className="rounded-xl border border-border/60">
          <CardHeader className="pb-5 border-b border-border/40 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="icon-container bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">بيانات الحوالة</CardTitle>
                  <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">تأكيد</Badge>
                </div>
                <CardDescription>
                  تأكد من البيانات ثم أدخل هوية المستلم للدفع
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Remittance Info Cards */}
            <div className="grid md:grid-cols-3 gap-3">
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
            <form onSubmit={onPaySubmit}>
              <div className="form-section space-y-4">
                <Label className="form-section-title">
                  <CreditCard className="h-4 w-4" />
                  هوية المستلم
                </Label>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="form-field">
                    <Label htmlFor="idNumber" className="text-sm font-medium">رقم الهوية</Label>
                    <div className="input-icon-wrapper">
                      <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <Input
                        id="idNumber"
                        placeholder="أدخل رقم الهوية"
                        value={idNumber}
                        onChange={(e) => onIdNumberChange(e.target.value)}
                        dir="ltr"
                        className="pr-10 font-mono"
                      />
                    </div>
                  </div>
                  <div className="form-field">
                    <Label htmlFor="idType" className="text-sm font-medium">نوع الهوية</Label>
                    <Select value={idType} onValueChange={(v) => onIdTypeChange(v as "national" | "passport")}>
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
                    <div className="input-icon-wrapper">
                      <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <Input
                        id="expdate"
                        type="date"
                        value={expdate}
                        onChange={(e) => onExpdateChange(e.target.value)}
                        dir="ltr"
                        className="pr-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onReset}
                  className="h-11"
                >
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    <span>بحث جديد</span>
                  </div>
                </Button>
                <Button
                  type="submit"
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
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right: Preview Sidebar — printed slip style */}
      <div className="lg:col-span-1">
        <Card className="rounded-xl border border-border/60 lg:sticky lg:top-24">
          <CardHeader className="pb-3 border-b-2 border-dashed border-border/30">
            <CardTitle className="text-sm flex items-center gap-2 font-bold">
              <Coins className="h-4 w-4 text-primary" />
              ملخص الحوالة
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-dashed divide-border/30 [&>*]:py-3 [&>*:first-child]:pt-0">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold tracking-wide text-muted-foreground">المرسل</span>
              </div>
              <p className="text-sm font-medium">{searchResult.senderName}</p>
              {searchResult.senderMobile && (
                <p className="font-mono text-xs mt-0.5 text-muted-foreground" dir="ltr">{searchResult.senderMobile}</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold tracking-wide text-muted-foreground">المستلم</span>
              </div>
              <p className="text-sm font-medium">{searchResult.receiverName}</p>
              {searchResult.receiverMobile && (
                <p className="font-mono text-xs mt-0.5 text-muted-foreground" dir="ltr">{searchResult.receiverMobile}</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold tracking-wide text-muted-foreground">المبلغ</span>
              </div>
              <p className="text-lg font-bold font-mono" dir="ltr">
                {searchResult.amount?.toLocaleString()}
                <span className="text-sm font-medium text-muted-foreground mr-1">{searchResult.currencyCode}</span>
              </p>
            </div>

            {networkName && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[11px] font-bold tracking-wide text-muted-foreground">الشبكة</span>
                </div>
                <p className="text-sm">{networkName}</p>
              </div>
            )}

            {(idNumber || idType || expdate) && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-bold tracking-wide text-muted-foreground">هوية المستلم</span>
                </div>
                <div className="space-y-1">
                  {idNumber && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">الرقم</span>
                      <span className="font-mono text-xs" dir="ltr">{idNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">النوع</span>
                    <span>{idType === "national" ? "بطاقة شخصية" : "جواز سفر"}</span>
                  </div>
                  {expdate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">انتهاء</span>
                      <span className="font-mono text-xs" dir="ltr">{expdate}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Pay Confirmation Dialog ──────────────────────────────────────────

function PayConfirmDialog({
  open,
  onOpenChange,
  searchResult,
  idNumber,
  idType,
  expdate,
  isPaying,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  searchResult: SearchResult | null
  idNumber: string
  idType: "national" | "passport"
  expdate: string
  isPaying: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                  <User className="h-3.5 w-3.5" /> المرسل
                </div>
                <div className="font-medium">{searchResult.senderName}</div>
                <div className="font-mono text-xs" dir="ltr">{searchResult.senderMobile}</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                  <User className="h-3.5 w-3.5" /> المستلم
                </div>
                <div className="font-medium">{searchResult.receiverName}</div>
                <div className="font-mono text-xs" dir="ltr">{searchResult.receiverMobile}</div>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                <Coins className="h-3.5 w-3.5" /> المبلغ
              </div>
              <div className="font-mono font-bold text-lg">
                {searchResult.amount?.toLocaleString()} {searchResult.currencyCode}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                <CreditCard className="h-3.5 w-3.5" /> هوية المستلم
              </div>
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
            onClick={onConfirm}
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
  )
}

// ─── Main Component ───────────────────────────────────────────────────

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

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isNetworksLoading, setIsNetworksLoading] = useState(true)
  const [successDismissed, setSuccessDismissed] = useState(false)

  useEffect(() => {
    const fetchNetworks = async () => {
      setIsNetworksLoading(true)
      try {
        const response = await apiClient.getDistWallets()
        if (response.success && response.docs) {
          setNetworks(response.docs)
        }
      } catch (err) {
        console.error("Failed to fetch networks:", err)
      } finally {
        setIsNetworksLoading(false)
      }
    }
    fetchNetworks()
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setSearchResult(null)
    setPayResult(null)
    setSuccessDismissed(false)
    setIsSearching(true)

    try {
      if (!selectedNetwork) {
        toast.error("الرجاء اختيار الشبكة")
        setIsSearching(false)
        return
      }
      if (!remittanceId.trim()) {
        toast.error("الرجاء إدخال رقم الحوالة")
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
        toast.error(response.message || "لم يتم العثور على الحوالة")
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء البحث")
    } finally {
      setIsSearching(false)
    }
  }

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowConfirmDialog(true)
  }

  const handleConfirmPay = async () => {
    if (!searchResult) return
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
        setTimeout(() => setSuccessDismissed(true), 8000)
      } else {
        toast.error(response.message || "فشل في دفع الحوالة")
        setShowConfirmDialog(false)
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء الدفع")
      setShowConfirmDialog(false)
    } finally {
      setIsPaying(false)
    }
  }

  const handleReset = () => {
    setRemittanceId("")
    setSearchResult(null)
    setPayResult(null)
    setSuccessDismissed(false)
    setIdNumber("")
    setIdType("national")
    setExpdate("")
  }

  // Step 3: Pay success — compact & inline card
  if (payResult && !successDismissed) {
    return (
      <Card className="rounded-xl border border-border/60">
        <CardHeader className="pb-5 border-b border-border/40 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="icon-container bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">تم الدفع بنجاح</CardTitle>
                  <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">مكتمل</Badge>
                </div>
                <CardDescription>تفاصيل عملية الدفع</CardDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSuccessDismissed(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
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
              <div className="text-lg font-bold font-mono">
                {payResult.amount?.toLocaleString()}{" "}
                <span className="text-sm font-medium text-muted-foreground">{searchResult?.currencyCode}</span>
              </div>
            </div>
            <div className="dash-stat-card">
              <div className="text-xs text-muted-foreground mb-1">العمولة</div>
              <div className="text-lg font-bold font-mono">{payResult.commission?.toLocaleString()}</div>
            </div>
          </div>
          <div className="dash-stat-card border-primary/20 bg-primary/5">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">الإجمالي</span>
              <span className="text-xl font-bold font-mono text-primary">
                {payResult.totalAmount?.toLocaleString()}
              </span>
            </div>
          </div>
          <Button onClick={handleReset} variant="outline" className="w-full h-11 font-semibold">
            <RotateCcw className="ml-2 h-4 w-4" />
            بحث عن حوالة جديدة
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Step 2: Search result + identity form with preview sidebar
  if (searchResult) {
    return (
      <>
        <RemittanceResultStep
          searchResult={searchResult}
          idNumber={idNumber}
          idType={idType}
          expdate={expdate}
          isPaying={isPaying}
          networks={networks}
          onIdNumberChange={setIdNumber}
          onIdTypeChange={(v) => setIdType(v)}
          onExpdateChange={setExpdate}
          onPaySubmit={handlePaySubmit}
          onReset={handleReset}
        />

        <PayConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          searchResult={searchResult}
          idNumber={idNumber}
          idType={idType}
          expdate={expdate}
          isPaying={isPaying}
          onConfirm={handleConfirmPay}
        />
      </>
    )
  }

  // Step 1: Search form
  return (
    <SearchRemittanceCard
      networks={networks}
      selectedNetwork={selectedNetwork}
      remittanceId={remittanceId}
      isSearching={isSearching}
      searchResult={searchResult}
      onNetworkChange={setSelectedNetwork}
      onRemittanceIdChange={setRemittanceId}
      onSubmit={handleSearch}
    />
  )
}
