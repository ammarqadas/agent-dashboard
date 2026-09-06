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
  Printer,
  AlertTriangle,
  FileImage,
  PenLine,
  KeyRound,
  Send,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api"
import { formatDate, formatTime, pickString } from "@/lib/utils"
import { DateInput, isValidDateInput, dateInputToISO, isoToDateInput } from "@/components/ui/date-input"
import {
  IdentityImagesSection,
  useIdentityImages,
  type IdentityImageFiles,
  type IdentityImageSlot,
} from "@/components/identity"

type IdentityStatus = "new" | "existing" | "manual_review"

type IdentityPreview = {
  fullName?: string
  mobile?: string
  documentId?: string
  type?: "national" | "passport"
  numberMasked?: string
  issueDate?: string
  expiryDate?: string
  issuePlace?: string
  hasFrontImage?: boolean
  hasBackImage?: boolean
}

type SearchResult = {
  searchToken: string
  reference: string
  networkKey: string
  status?: string
  amount?: number
  currencyCode?: string
  senderName?: string
  senderMobile?: string
  receiverName?: string
  receiverMobile?: string
  identityStatus: IdentityStatus
  identityNextAction?: string
  candidateToken?: string
  identity?: IdentityPreview
}

type PayResult = {
  txId: number
  expressid: string
  amount: number
  commission: number
  totalAmount: number
  status: string
}

type IdentityAuthorization = {
  token: string
  idempotencyKey: string
}

function identityBlockedMessage(status: string): string {
  switch (status) {
    case "existing":
      return "هوية المستلم موثقة مسبقاً ويتطلب الدفع تحققاً عبر رمز OTP"
    case "manual_review":
      return "الحوالة قيد المراجعة اليدوية — تعذر إتمام الدفع"
    default:
      return "تعذر تحديد متطلبات الهوية — يرجى البحث من جديد"
  }
}

// Single source of truth for what each identity decision requires before payout:
// - existing: identity + document on file → OTP only.
// - new:      no identity record → collect identity + upload images.
// - manual_review / unknown: blocked.
function identityFlow(status: IdentityStatus): {
  otp: boolean
  upload: boolean
  blocked: boolean
} {
  switch (status) {
    case "existing":
      return { otp: true, upload: false, blocked: false }
    case "new":
      return { otp: false, upload: true, blocked: false }
    default:
      return { otp: false, upload: false, blocked: true }
  }
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `pay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`
}

const ID_TYPE_LABELS: Record<"national" | "passport", string> = {
  national: "بطاقة شخصية",
  passport: "جواز سفر",
}

function identityDateValue(value?: string): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatIdentityDate(value?: string): string {
  return identityDateValue(value) || "—"
}


// ─── Step 1: Search Remittance Card ───────────────────────────────────

function SearchRemittanceCard({
  networks,
  selectedNetwork,
  inputRemittanceId,
  isSearching,
  searchResult,
  onNetworkChange,
  onRemittanceIdChange,
  onSubmit,
}: {
  networks: any[]
  selectedNetwork: string
  inputRemittanceId: string
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
              <Label htmlFor="inputRemittanceId" className="text-sm font-medium">رقم الحوالة (Express ID)</Label>
              <div className="input-icon-wrapper">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  id="inputRemittanceId"
                  placeholder="أدخل رقم الحوالة"
                  value={inputRemittanceId}
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
  issueDate,
  expiryDate,
  issuePlace,
  frontPreview,
  backPreview,
  identityLocked,
  identityComplete,
  isPaying,
  isSendingOtp,
  networks,
  onIdNumberChange,
  onIdTypeChange,
  onIssueDateChange,
  onExpiryDateChange,
  onIssuePlaceChange,
  imageFiles,
  onImageChange,
  onPaySubmit,
  onSendOtp,
  onReset,
}: {
  searchResult: SearchResult
  idNumber: string
  idType: "national" | "passport"
  issueDate: string
  expiryDate: string
  issuePlace: string
  frontPreview: string | null
  backPreview: string | null
  identityLocked: boolean
  identityComplete: boolean
  isPaying: boolean
  isSendingOtp: boolean
  networks: any[]
  onIdNumberChange: (v: string) => void
  onIdTypeChange: (v: "national" | "passport") => void
  onIssueDateChange: (v: string) => void
  onExpiryDateChange: (v: string) => void
  onIssuePlaceChange: (v: string) => void
  imageFiles: IdentityImageFiles
  onImageChange: (slot: IdentityImageSlot, file: File | null) => void
  onPaySubmit: (e: React.FormEvent) => void
  onSendOtp: () => void
  onReset: () => void
}) {
  const networkName = networks.find(n => n.key === searchResult.networkKey)?.name || searchResult.networkKey
  const flow = identityFlow(searchResult.identityStatus)

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
                  {searchResult.identityStatus === "existing"
                    ? "تحقق من هوية المستلم عبر رمز OTP ثم أكمل الدفع"
                    : "تأكد من البيانات ثم أدخل هوية المستلم وصورها للدفع"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Remittance Info: wider sender/receiver cards + amount strip */}
            <div className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
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
              </div>

              {/* Amount strip */}
              <div className="dash-stat-card flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-2 text-amber-600">
                  <Coins className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">المبلغ</span>
                </div>
                <div className="flex items-baseline gap-2" dir="ltr">
                  <span className="text-2xl font-bold font-mono text-foreground">
                    {searchResult.amount?.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground">{searchResult.currencyCode}</span>
                </div>
              </div>
            </div>

            {/* Identity: OTP for an existing identity (or to resolve its document), otherwise collect a new identity. */}
            {flow.otp ? (
              <form onSubmit={onPaySubmit} className="space-y-5">
                <div className={`rounded-xl border p-4 ${identityLocked ? "border-emerald-500/40 bg-emerald-50" : "border-primary/30 bg-primary/5"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${identityLocked ? "bg-emerald-600 text-white" : "bg-primary/10 text-primary"}`}>
                      {identityLocked ? <ShieldCheck className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-sm font-bold">
                          {identityLocked ? "تم التحقق من هوية المستلم" : "هوية المستلم موثقة مسبقاً"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {identityLocked
                            ? "يمكنك الآن متابعة دفع الحوالة"
                            : `سيتم إرسال رمز تحقق إلى ${searchResult.identity?.mobile || searchResult.receiverMobile || "رقم المستلم"}`}
                        </p>
                      </div>

                      {searchResult.identity && (
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border/50 bg-background/70 px-3 py-2.5">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs font-bold text-primary">الاسم</span>
                            <span className="text-sm font-semibold">{searchResult.identity?.fullName || "—"}</span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs font-bold text-primary">رقم الهوية</span>
                            <span className="text-sm font-mono font-semibold" dir="ltr">{searchResult.identity?.numberMasked || "—"}</span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs font-bold text-primary">نوع الهوية</span>
                            <span className="text-sm font-semibold">{searchResult.identity?.type ? ID_TYPE_LABELS[searchResult.identity.type] : "—"}</span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs font-bold text-primary">تاريخ الانتهاء</span>
                            <span className="text-sm font-mono font-semibold" dir="ltr">{formatIdentityDate(searchResult.identity?.expiryDate)}</span>
                          </div>
                        </div>
                      )}

                      {!identityLocked && (
                        <Button
                          type="button"
                          onClick={onSendOtp}
                          disabled={isSendingOtp}
                          className="h-10 w-full sm:w-auto"
                        >
                          {isSendingOtp ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          {isSendingOtp ? "جاري إرسال الرمز..." : "إرسال رمز التحقق"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={onReset} className="h-11">
                    <RotateCcw className="h-4 w-4" />
                    بحث جديد
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPaying || !identityComplete}
                    className="h-11 flex-1 font-semibold bg-gradient-to-r from-primary to-emerald-600 hover:to-emerald-700"
                  >
                    <Coins className="h-4 w-4" />
                    دفع الحوالة
                  </Button>
                </div>
              </form>
            ) : flow.blocked ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-50 p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-700">لا يمكن إتمام الدفع</p>
                  <p className="text-sm text-amber-700/80 mt-0.5">
                    {identityBlockedMessage(searchResult.identityStatus)}
                  </p>
                </div>
              </div>
            ) : (
            <form onSubmit={onPaySubmit}>
              <div className="form-section space-y-3">
                <Label className="form-section-title">
                  <CreditCard className="h-4 w-4" />
                  هوية المستلم
                </Label>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="form-field">
                    <Label htmlFor="idNumber" className="text-sm font-medium">
                      رقم الهوية <span className="text-destructive">*</span>
                    </Label>
                    <div className="input-icon-wrapper">
                      <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <Input
                        id="idNumber"
                        placeholder="أدخل رقم الهوية"
                        value={idNumber}
                        onChange={(e) => onIdNumberChange(e.target.value)}
                        disabled={identityLocked}
                        dir="ltr"
                        className="pr-10 font-mono"
                      />
                    </div>
                  </div>
                  <div className="form-field">
                    <Label htmlFor="idType" className="text-sm font-medium">
                      نوع الهوية <span className="text-destructive">*</span>
                    </Label>
                    <Select value={idType} onValueChange={(v) => onIdTypeChange(v as "national" | "passport")} disabled={identityLocked}>
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
                    <Label htmlFor="issueDate" className="text-sm font-medium">
                      تاريخ الإصدار <span className="text-destructive">*</span>
                    </Label>
                    <div className="input-icon-wrapper">
                      <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <DateInput
                        id="issueDate"
                        value={issueDate}
                        onChange={(e) => onIssueDateChange(e.target.value)}
                        disabled={identityLocked}
                        className="pr-10"
                      />
                    </div>
                  </div>
                  <div className="form-field">
                    <Label htmlFor="expiryDate" className="text-sm font-medium">
                      تاريخ الانتهاء <span className="text-destructive">*</span>
                    </Label>
                    <div className="input-icon-wrapper">
                      <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <DateInput
                        id="expiryDate"
                        value={expiryDate}
                        onChange={(e) => onExpiryDateChange(e.target.value)}
                        disabled={identityLocked}
                        className="pr-10"
                      />
                    </div>
                  </div>
                  <div className="form-field md:col-span-2">
                    <Label htmlFor="issuePlace" className="text-sm font-medium">
                      جهة الإصدار <span className="text-destructive">*</span>
                    </Label>
                    <div className="input-icon-wrapper">
                      <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <Input
                        id="issuePlace"
                        placeholder="مثال: صنعاء"
                        value={issuePlace}
                        onChange={(e) => onIssuePlaceChange(e.target.value)}
                        disabled={identityLocked}
                        className="pr-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Identity Images (mandatory front/back) */}
                <div className="space-y-2 pt-1">
                  <Label className="text-sm font-medium">
                    صور الهوية <span className="text-destructive">*</span>
                  </Label>
                  <IdentityImagesSection
                    slots={["front", "back"]}
                    files={imageFiles}
                    previews={{ front: frontPreview, back: backPreview, selfie: null }}
                    onImageChange={onImageChange}
                    required={{ front: true, back: true }}
                    locked={identityLocked}
                    columns={2}
                  />
                </div>
              </div>

              {!identityComplete && !identityLocked && (
                <p className="text-xs text-amber-600 flex items-center gap-1.5 mt-3">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  أكمل بيانات الهوية وارفع صور الوجه والخلف لتفعيل زر الدفع
                </p>
              )}
              {identityLocked && (
                <p className="text-xs text-emerald-600 flex items-center gap-1.5 mt-3">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  تم اعتماد بيانات الهوية — إعادة المحاولة تستخدم نفس ترخيص الدفع
                </p>
              )}

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
                  disabled={isPaying || !identityComplete}
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
            )}
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

            {(idNumber || idType || issueDate || expiryDate || issuePlace) && (
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
                    <span>{ID_TYPE_LABELS[idType]}</span>
                  </div>
                  {issueDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">الإصدار</span>
                      <span className="font-mono text-xs" dir="ltr">{issueDate}</span>
                    </div>
                  )}
                  {expiryDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">انتهاء</span>
                      <span className="font-mono text-xs" dir="ltr">{expiryDate}</span>
                    </div>
                  )}
                  {issuePlace && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">جهة الإصدار</span>
                      <span className="text-xs">{issuePlace}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(frontPreview || backPreview) && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileImage className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-bold tracking-wide text-muted-foreground">صور الهوية</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">أمام</p>
                    {frontPreview ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={frontPreview} alt="هوية - أمام" className="h-16 w-full rounded-md border object-cover" />
                    ) : (
                      <div className="h-16 rounded-md border border-dashed" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">خلف</p>
                    {backPreview ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={backPreview} alt="هوية - خلف" className="h-16 w-full rounded-md border object-cover" />
                    ) : (
                      <div className="h-16 rounded-md border border-dashed" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Existing Identity OTP Dialog ─────────────────────────────────────

function IdentityOtpDialog({
  open,
  onOpenChange,
  destinationMasked,
  otp,
  resendSeconds,
  isSending,
  isVerifying,
  isPaying,
  paymentAuthorized,
  onOtpChange,
  onResend,
  onVerify,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  destinationMasked?: string
  otp: string
  resendSeconds: number
  isSending: boolean
  isVerifying: boolean
  isPaying: boolean
  paymentAuthorized: boolean
  onOtpChange: (value: string) => void
  onResend: () => void
  onVerify: (event: React.FormEvent) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={onVerify} className="space-y-5">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <KeyRound className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">التحقق من هوية المستلم</DialogTitle>
            <DialogDescription className="text-center">
              أدخل رمز التحقق المرسل إلى
              <span className="mr-1 font-mono font-semibold text-foreground" dir="ltr">
                {destinationMasked || "رقم المستلم"}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="identityOtp">رمز التحقق</Label>
            <Input
              id="identityOtp"
              value={otp}
              onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              dir="ltr"
              autoFocus
              className="h-12 text-center font-mono text-xl tracking-[0.45em]"
              disabled={isVerifying || isPaying || paymentAuthorized}
            />
            <p className="text-center text-xs text-muted-foreground">
              الرمز صالح لمدة خمس دقائق
            </p>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="submit"
              disabled={isVerifying || isPaying || (!paymentAuthorized && otp.length !== 6)}
              className="w-full"
            >
              {(isVerifying || isPaying) && <Loader2 className="h-4 w-4 animate-spin" />}
              {isVerifying
                ? "جاري التحقق..."
                : isPaying
                  ? "جاري الدفع..."
                  : "تحقق ومتابعة الدفع"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onResend}
              disabled={isSending || isVerifying || isPaying || paymentAuthorized || resendSeconds > 0}
              className="w-full"
            >
              {isSending && <Loader2 className="h-4 w-4 animate-spin" />}
              {resendSeconds > 0
                ? `إعادة الإرسال بعد ${resendSeconds} ثانية`
                : "إعادة إرسال الرمز"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Pay Confirmation Dialog ──────────────────────────────────────────

function PayConfirmDialog({
  open,
  onOpenChange,
  searchResult,
  idNumber,
  idType,
  issueDate,
  expiryDate,
  issuePlace,
  frontPreview,
  backPreview,
  isPaying,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  searchResult: SearchResult | null
  idNumber: string
  idType: "national" | "passport"
  issueDate: string
  expiryDate: string
  issuePlace: string
  frontPreview: string | null
  backPreview: string | null
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
            راجع بيانات الحوالة وهوية المستلم قبل الدفع
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
                <span>{ID_TYPE_LABELS[idType]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">تاريخ الإصدار</span>
                <span className="font-mono" dir="ltr">{issueDate || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">تاريخ الانتهاء</span>
                <span className="font-mono" dir="ltr">{expiryDate || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">جهة الإصدار</span>
                <span>{issuePlace || "—"}</span>
              </div>
            </div>
            {(frontPreview || backPreview) && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                  <FileImage className="h-3.5 w-3.5" /> صور الهوية المرفقة
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">الوجه (أمام)</p>
                    {frontPreview ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={frontPreview} alt="هوية - أمام" className="h-24 w-full rounded-md border object-cover" />
                    ) : (
                      <div className="h-24 rounded-md border border-dashed" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">الظهر (خلف)</p>
                    {backPreview ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={backPreview} alt="هوية - خلف" className="h-24 w-full rounded-md border object-cover" />
                    ) : (
                      <div className="h-24 rounded-md border border-dashed" />
                    )}
                  </div>
                </div>
              </div>
            )}
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

// ─── Step 3: Printable Payment Receipt Slip ───────────────────────────

function PaySuccessReceipt({
  payResult,
  searchResult,
  frontPreview,
  backPreview,
  networkName,
  agentName,
  paidAt,
  onReset,
}: {
  payResult: PayResult
  searchResult: SearchResult | null
  frontPreview: string | null
  backPreview: string | null
  networkName: string
  agentName: string
  paidAt: Date
  onReset: () => void
}) {
  const currency = searchResult?.currencyCode || ""
  const fmt = (n?: number) => n?.toLocaleString() ?? "—"

  return (
    <div className="space-y-4">
      {/* Toolbar — hidden when printing */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="icon-container bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">تم الدفع بنجاح</h2>
              <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">مكتمل</Badge>
            </div>
            <p className="text-sm text-muted-foreground">يمكنك طباعة الإيصال أو بدء بحث جديد</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onReset} className="h-10">
            <RotateCcw className="h-4 w-4" />
            بحث جديد
          </Button>
          <Button
            onClick={() => window.print()}
            className="h-10 font-semibold bg-gradient-to-r from-primary to-emerald-600 hover:to-emerald-700"
          >
            <Printer className="h-4 w-4" />
            طباعة الإيصال
          </Button>
        </div>
      </div>

      {/* Printable slip — A5 remittance document */}
      <div className="print-area max-w-2xl mx-auto">
        <div className="print-slip rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
          {/* Boxed header: brand + network | logo */}
          <div className="border-b-2 border-dashed border-border/40 bg-muted/30 px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-extrabold text-primary leading-tight">شمول كاش — وكيل</p>
              <p className="text-[11px] font-bold text-muted-foreground mt-0.5">
                الشبكة: <span className="font-semibold text-foreground">{networkName || "—"}</span>
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="شمول كاش" className="h-10 w-10 object-contain shrink-0" />
          </div>

          {/* Document body */}
          <div className="p-4 space-y-3">
            {/* Banner divider */}
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 bg-primary rounded-full" />
              <span className="text-xs font-extrabold text-primary">إيصال صرف حوالة</span>
              <div className="h-1 flex-1 bg-primary rounded-full" />
            </div>

            {/* IDs (right, 2 rows) + Amount (left, compact) */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground">
                  رقم الحوالة:{" "}
                  <span className="text-sm font-extrabold font-mono text-foreground" dir="ltr">
                    {payResult.expressid || "—"}
                  </span>
                </p>
                <p className="text-[11px] font-bold text-muted-foreground">
                  رقم العملية:{" "}
                  <span className="text-sm font-extrabold font-mono text-foreground" dir="ltr">
                    #{payResult.txId}
                  </span>
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Coins className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-bold text-primary leading-tight">المبلغ المصروف</p>
                  <p className="whitespace-nowrap font-mono text-base font-extrabold text-foreground leading-tight" dir="ltr">
                    {fmt(payResult.totalAmount)}{" "}
                    <span className="text-[10px] font-bold text-muted-foreground">{currency}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Content card: sender / receiver sections */}
            <div className="rounded-lg border border-border/40 bg-muted/40 p-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/40 bg-card p-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary mb-1">
                    <User className="h-3.5 w-3.5" /> المرسل
                  </div>
                  <p className="text-sm font-semibold text-foreground">{searchResult?.senderName || "—"}</p>
                  <p className="text-xs font-mono font-semibold text-foreground mt-0.5" dir="ltr">
                    {searchResult?.senderMobile || "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/40 bg-card p-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary mb-1">
                    <User className="h-3.5 w-3.5" /> المستلم
                  </div>
                  <p className="text-sm font-semibold text-foreground">{searchResult?.receiverName || "—"}</p>
                  <p className="text-xs font-mono font-semibold text-foreground mt-0.5" dir="ltr">
                    {searchResult?.receiverMobile || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Identity images + handwritten name + signature — one section, 3 columns */}
            <div className="rounded-lg border border-border/40 bg-card p-3 space-y-2.5">
              <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-primary">
                <CreditCard className="h-3.5 w-3.5" />
                هوية المستلم
              </h4>
              <div className="grid grid-cols-3 gap-3">
              <div>
                {frontPreview ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={frontPreview}
                    alt="هوية المستلم - أمام"
                    className="h-24 w-full rounded-md border-2 border-border/70 object-cover"
                  />
                ) : (
                  <div className="h-24 rounded-md border-2 border-dashed border-border/60" />
                )}
              </div>
              <div>
                {backPreview ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={backPreview}
                    alt="هوية المستلم - خلف"
                    className="h-24 w-full rounded-md border-2 border-border/70 object-cover"
                  />
                ) : (
                  <div className="h-24 rounded-md border-2 border-dashed border-border/60" />
                )}
              </div>
              <div className="flex flex-col justify-center gap-4">
                <div>
                  <div className="border-t border-dotted border-foreground/50" />
                  <p className="text-[10px] font-bold text-muted-foreground text-center mt-1">اسم المستلم (بخط اليد)</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <PenLine className="h-3 w-3 text-muted-foreground shrink-0" />
                    <div className="flex-1 border-t border-dotted border-foreground/50" />
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground text-center mt-1">توقيع المستلم</p>
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Document footer: agent + note + date/time */}
          <div className="border-t-2 border-dashed border-border/40 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
            <span>
              تم الصرف بواسطة: <span className="font-semibold text-foreground">{agentName || "—"}</span>
            </span>
            <span>هذا الإيصال سند إثبات لعملية الدفع</span>
            <span className="font-mono font-semibold text-foreground text-[10px] whitespace-nowrap shrink-0" dir="ltr">
              {formatDate(paidAt)} · {formatTime(paidAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────

// Backend pay payloads vary in shape/key casing — normalize into PayResult
// and fall back to the searched remittance id so the receipt is never blank.
function normalizePayResult(data: unknown, searchResult: SearchResult | null): PayResult {
  const d = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>
  const amount = Number(d.amount ?? searchResult?.amount ?? 0)
  return {
    txId: Number(pickString(d, ["txId", "transactionId", "transaction_id", "operationId", "operation_id", "id"]) ?? 0),
    expressid:
      pickString(d, ["expressid", "expressId", "expressID", "remittanceId", "remittance_id", "reference"]) ||
      searchResult?.reference ||
      "",
    amount,
    commission: Number(d.commission ?? d.fee ?? 0),
    totalAmount: Number(d.totalAmount ?? d.total_amount ?? d.total ?? amount),
    status: String(d.status ?? ""),
  }
}

export function RemittanceSearchPay() {
  const [networks, setNetworks] = useState<any[]>([])
  const [selectedNetwork, setSelectedNetwork] = useState("")
  const [inputRemittanceId, setInputRemittanceId] = useState("")

  const [isSearching, setIsSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)

  const [idNumber, setIdNumber] = useState("")
  const [idType, setIdType] = useState<"national" | "passport">("national")
  const [issueDate, setIssueDate] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [issuePlace, setIssuePlace] = useState("")

  const identityImages = useIdentityImages(["front", "back"])
  // Stored document images for existing identities (remote proxy URLs, per search)
  const [storedDocPreviews, setStoredDocPreviews] = useState<{ front: string | null; back: string | null }>({ front: null, back: null })
  // Newly uploaded/captured images win over the stored document images
  const frontPreview = identityImages.previews.front || storedDocPreviews.front
  const backPreview = identityImages.previews.back || storedDocPreviews.back

  // Identity payout authorization — kept in memory only:
  // the token is consumed by the first payout attempt; the idempotency key
  // stays fixed so retries of the same payout reuse it.
  const [identityAuth, setIdentityAuth] = useState<IdentityAuthorization | null>(null)

  const [isPaying, setIsPaying] = useState(false)
  const [payResult, setPayResult] = useState<PayResult | null>(null)
  const [paidAt, setPaidAt] = useState<Date>(new Date())

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showOtpDialog, setShowOtpDialog] = useState(false)
  const [otp, setOtp] = useState("")
  const [otpDestination, setOtpDestination] = useState("")
  const [otpResendSeconds, setOtpResendSeconds] = useState(0)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [isNetworksLoading, setIsNetworksLoading] = useState(true)
  const [agentName, setAgentName] = useState("")

  useEffect(() => {
    try {
      const agentUser = JSON.parse(sessionStorage.getItem("agentUser") || "{}")
      setAgentName(agentUser.name || "وكيل")
    } catch {
      setAgentName("وكيل")
    }
  }, [])

  const networkName = searchResult
    ? networks.find(n => n.key === searchResult.networkKey)?.name || searchResult.networkKey
    : ""

  const flow = searchResult ? identityFlow(searchResult.identityStatus) : null
  const identityLocked = !!identityAuth
  const identityComplete = Boolean(
    flow &&
      (flow.upload
        ? idNumber.trim() &&
          issueDate &&
          expiryDate &&
          issuePlace.trim() &&
          identityImages.files.front &&
          identityImages.files.back
        : identityAuth)
  )

  useEffect(() => {
    if (otpResendSeconds <= 0) return
    const timer = window.setTimeout(
      () => setOtpResendSeconds((seconds) => Math.max(0, seconds - 1)),
      1000
    )
    return () => window.clearTimeout(timer)
  }, [otpResendSeconds])

  useEffect(() => {
    const fetchNetworks = async () => {
      setIsNetworksLoading(true)
      try {
        const response = await apiClient.getDistWallets()
        if (response.success && response.docs) {
          const agentUser = JSON.parse(sessionStorage.getItem("agentUser") || "{}")
          const allowedNetworks: any[] = agentUser.allowedNetworks || []
          const filtered = allowedNetworks.length > 0
            ? response.docs.filter((n: any) => allowedNetworks.some((a: any) => a.key === n.key))
            : response.docs
          setNetworks(filtered)
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
    setIsSearching(true)

    try {
      if (!selectedNetwork) {
        toast.error("الرجاء اختيار الشبكة")
        setIsSearching(false)
        return
      }
      if (!inputRemittanceId.trim()) {
        toast.error("الرجاء إدخال رقم الحوالة")
        setIsSearching(false)
        return
      }

      const response = await apiClient.agentRemittanceSearch(selectedNetwork, inputRemittanceId.trim())

      if (response.success) {
        const d: any = response.data || {}
        const rem: any = d.remittance || {}
        const dec: any = d.identityDecision || {}
        setIdentityAuth(null)
        setOtp("")
        setOtpDestination("")
        setOtpResendSeconds(0)
        setStoredDocPreviews({ front: null, back: null })
        if (dec.status === "existing" && dec.identity) {
          setIdNumber(String(dec.identity.numberMasked || ""))
          setIdType(dec.identity.type === "passport" ? "passport" : "national")
          setIssueDate(isoToDateInput(dec.identity.issueDate))
          setExpiryDate(isoToDateInput(dec.identity.expiryDate))
          setIssuePlace(String(dec.identity.issuePlace || ""))
          // Existing-identity payouts have no local uploads: fetch the stored
          // document images through the cookie-authenticated proxy so the
          // printed receipt isn't blank.
          const imageBase = `/api/proxy/agent/remittance/identity/document-image?searchToken=${encodeURIComponent(String(d.searchToken || ""))}`
          if (dec.identity.hasFrontImage) {
            setStoredDocPreviews(prev => ({ ...prev, front: `${imageBase}&slot=front` }))
          }
          if (dec.identity.hasBackImage) {
            setStoredDocPreviews(prev => ({ ...prev, back: `${imageBase}&slot=back` }))
          }
        }
        setSearchResult({
          searchToken: String(d.searchToken || ""),
          reference: String(rem.reference || inputRemittanceId.trim()),
          networkKey: String(rem.networkKey || selectedNetwork),
          status: rem.status,
          amount: rem.amount,
          currencyCode: rem.currencyCode,
          senderName: rem.sender?.name ?? rem.senderName,
          senderMobile: pickString(rem.sender, ["mobile", "phone", "msisdn"]) || pickString(rem, ["senderMobile", "sender_mobile"]),
          receiverName: rem.receiver?.name ?? rem.receiverName,
          receiverMobile: pickString(rem.receiver, ["mobile", "phone", "msisdn"]) || pickString(rem, ["receiverMobile", "receiver_mobile"]),
          identityStatus: (dec.status || "manual_review") as IdentityStatus,
          identityNextAction: dec.nextAction,
          candidateToken: dec.candidateToken,
          identity: dec.identity,
        })
      } else {
        toast.error(response.message || "لم يتم العثور على الحوالة")
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء البحث")
    } finally {
      setIsSearching(false)
    }
  }

  const handleSendOtp = async () => {
    if (!searchResult || !flow?.otp) return
    if (!searchResult.candidateToken) {
      toast.error("رمز مرشح الهوية غير متاح، يرجى البحث من جديد")
      return
    }

    setIsSendingOtp(true)
    try {
      const response = await apiClient.agentRemittanceIdentityOtpSend(
        searchResult.searchToken,
        searchResult.candidateToken
      )
      if (!response.success) {
        toast.error(response.message || "تعذر إرسال رمز التحقق")
        return
      }
      const data = response.data || (response as any)
      setOtp("")
      setOtpDestination(String(data.destinationMasked || searchResult.receiverMobile || ""))
      setOtpResendSeconds(Number(data.resendAfterSeconds) || 60)
      setShowOtpDialog(true)
      toast.success("تم إرسال رمز التحقق إلى المستلم")
    } catch (error: any) {
      toast.error(error.message || "تعذر إرسال رمز التحقق")
    } finally {
      setIsSendingOtp(false)
    }
  }

  const submitAuthorizedPayout = async (
    auth: IdentityAuthorization,
    closeConfirmationOnFailure: boolean
  ) => {
    if (!searchResult) return false

    setIsPaying(true)
    try {
      const response = await apiClient.agentRemittancePay(
        searchResult.networkKey,
        {
          searchToken: searchResult.searchToken,
          inputRemittanceId: searchResult.reference,
          identityAuthorizationToken: auth.token,
        },
        auth.idempotencyKey
      )

      if (response.success) {
        setPayResult(normalizePayResult(response.data, searchResult))
        setPaidAt(new Date())
        setShowConfirmDialog(false)
        setShowOtpDialog(false)
        return true
      }

      if (response.code === "PAYMENT_IN_PROGRESS") {
        toast.warning("الدفع قيد المعالجة حالياً — لا تُعد المحاولة الآن، تحقق من الحوالة بعد قليل")
        if (closeConfirmationOnFailure) setShowConfirmDialog(false)
        return false
      }
      if (response.code === "IDEMPOTENCY_KEY_REUSED") {
        toast.error("مفتاح العملية مستخدم لحوالة أخرى — ابحث عن الحوالة من جديد لبدء عملية جديدة")
        if (closeConfirmationOnFailure) setShowConfirmDialog(false)
        return false
      }

      toast.error(
        response.code === "UPSTREAM_TIMEOUT" || response.code === "CLIENT_TIMEOUT"
          ? "انتهت مهلة الاستجابة وقد تكون الحوالة صُرفت. أعد المحاولة من نفس الصفحة للتحقق باستخدام نفس مفتاح العملية."
          : response.message || "فشل في دفع الحوالة"
      )
      if (closeConfirmationOnFailure) setShowConfirmDialog(false)
      return false
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء الدفع")
      if (closeConfirmationOnFailure) setShowConfirmDialog(false)
      return false
    } finally {
      setIsPaying(false)
    }
  }

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!searchResult || !flow?.otp) return
    if (identityAuth) {
      await submitAuthorizedPayout(identityAuth, false)
      return
    }
    if (!/^\d{6}$/.test(otp)) {
      toast.error("أدخل رمز التحقق المكون من 6 أرقام")
      return
    }

    setIsVerifyingOtp(true)
    try {
      const response = await apiClient.agentRemittanceIdentityOtpVerify(
        searchResult.searchToken,
        otp
      )
      const data = response.data || (response as any)
      if (!response.success || !data.identityAuthorizationToken) {
        toast.error(response.message || "رمز التحقق غير صحيح أو منتهي")
        return
      }
      const auth = {
        token: String(data.identityAuthorizationToken),
        idempotencyKey: newIdempotencyKey(),
      }
      setIdentityAuth(auth)
      setOtp("")
      setIsVerifyingOtp(false)
      await submitAuthorizedPayout(auth, false)
    } catch (error: any) {
      toast.error(error.message || "تعذر التحقق من الرمز")
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchResult) return
    if (flow?.otp) {
      if (!identityAuth) {
        toast.error("يجب التحقق من هوية المستلم عبر رمز OTP أولاً")
        return
      }
      await submitAuthorizedPayout(identityAuth, false)
      return
    }
    if (!flow?.upload) {
      toast.error(identityBlockedMessage(searchResult.identityStatus))
      return
    }
    if (!idNumber.trim()) {
      toast.error("الرجاء إدخال رقم هوية المستلم")
      return
    }
    if (!isValidDateInput(issueDate)) {
      toast.error("أدخل تاريخ إصدار الهوية كاملاً بصيغة DD-MM-YYYY")
      return
    }
    if (!isValidDateInput(expiryDate)) {
      toast.error("أدخل تاريخ انتهاء الهوية كاملاً بصيغة DD-MM-YYYY")
      return
    }
    if (!issuePlace.trim()) {
      toast.error("الرجاء إدخال جهة إصدار الهوية")
      return
    }
    if (!identityImages.files.front || !identityImages.files.back) {
      toast.error("الرجاء رفع صورتي الهوية (الوجه والخلف)")
      return
    }
    setShowConfirmDialog(true)
  }

  const handleConfirmPay = async () => {
    if (!searchResult || !flow || flow.blocked) return
    if (
      flow?.upload &&
      (!identityImages.files.front ||
        !identityImages.files.back ||
        !idNumber.trim() ||
        !isValidDateInput(issueDate) ||
        !isValidDateInput(expiryDate) ||
        !issuePlace.trim())
    )
      return
    setIsPaying(true)

    try {
      // 1) Identity upload → short-lived payout authorization token.
      //    Skipped entirely when retrying a payout that already uploaded.
      let auth = identityAuth
      if (!auth && flow?.upload) {
        const uploadRes = await apiClient.agentRemittanceIdentityUpload({
          searchToken: searchResult.searchToken,
          type: idType,
          idNumber: idNumber.trim(),
          issueDate: dateInputToISO(issueDate),
          expiryDate: dateInputToISO(expiryDate),
          issuePlace: issuePlace.trim(),
          front: identityImages.files.front!,
          back: identityImages.files.back!,
        })
        const uploadPayload: any = uploadRes.data || uploadRes
        const uploadToken = uploadRes.success
          ? uploadPayload.identityAuthorizationToken
          : undefined
        if (!uploadToken) {
          toast.error(uploadRes.message || "فشل رفع بيانات الهوية")
          setShowConfirmDialog(false)
          return
        }
        auth = { token: String(uploadToken), idempotencyKey: newIdempotencyKey() }
        setIdentityAuth(auth)
      }
      if (!auth) {
        toast.error("يجب التحقق من هوية المستلم قبل الدفع")
        setShowConfirmDialog(false)
        return
      }

      await submitAuthorizedPayout(auth, true)
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء الدفع")
      setShowConfirmDialog(false)
    } finally {
      setIsPaying(false)
    }
  }

  const handleReset = () => {
    setInputRemittanceId("")
    setSearchResult(null)
    setPayResult(null)
    setIdNumber("")
    setIdType("national")
    setIssueDate("")
    setExpiryDate("")
    setIssuePlace("")
    identityImages.reset()
    setStoredDocPreviews({ front: null, back: null })
    setIdentityAuth(null)
    setShowOtpDialog(false)
    setOtp("")
    setOtpDestination("")
    setOtpResendSeconds(0)
  }

  // Step 3: Pay success — printable receipt slip
  if (payResult) {
    return (
      <PaySuccessReceipt
        payResult={payResult}
        searchResult={searchResult}
        frontPreview={frontPreview}
        backPreview={backPreview}
        networkName={networkName}
        agentName={agentName}
        paidAt={paidAt}
        onReset={handleReset}
      />
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
          issueDate={issueDate}
          expiryDate={expiryDate}
          issuePlace={issuePlace}
          frontPreview={frontPreview}
          backPreview={backPreview}
          identityLocked={identityLocked}
          identityComplete={identityComplete}
          isPaying={isPaying}
          isSendingOtp={isSendingOtp}
          networks={networks}
          onIdNumberChange={setIdNumber}
          onIdTypeChange={(v) => setIdType(v)}
          onIssueDateChange={setIssueDate}
          onExpiryDateChange={setExpiryDate}
          onIssuePlaceChange={setIssuePlace}
          imageFiles={identityImages.files}
          onImageChange={identityImages.set}
          onPaySubmit={handlePaySubmit}
          onSendOtp={handleSendOtp}
          onReset={handleReset}
        />

        <IdentityOtpDialog
          open={showOtpDialog}
          onOpenChange={setShowOtpDialog}
          destinationMasked={otpDestination}
          otp={otp}
          resendSeconds={otpResendSeconds}
          isSending={isSendingOtp}
          isVerifying={isVerifyingOtp}
          isPaying={isPaying}
          paymentAuthorized={!!identityAuth}
          onOtpChange={setOtp}
          onResend={handleSendOtp}
          onVerify={handleVerifyOtp}
        />

        <PayConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          searchResult={searchResult}
          idNumber={idNumber}
          idType={idType}
          issueDate={issueDate}
          expiryDate={expiryDate}
          issuePlace={issuePlace}
          frontPreview={frontPreview}
          backPreview={backPreview}
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
      inputRemittanceId={inputRemittanceId}
      isSearching={isSearching}
      searchResult={searchResult}
      onNetworkChange={setSelectedNetwork}
      onRemittanceIdChange={setInputRemittanceId}
      onSubmit={handleSearch}
    />
  )
}
