"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api"
import { formatReceiptTimestamp, pickString } from "@/lib/utils"
import { DateInput, isValidDateInput, dateInputToISO, isoToDateInput } from "@/components/ui/date-input"
import { SharePdfButton } from "@/components/receipt/share-pdf-button"
import {
  IdentityImagesSection,
  IdentityDetailsGrid,
  useIdentityImages,
  type IdentityImageFiles,
  type IdentityImageSlot,
} from "@/components/identity"

type IdentityStatus = "new" | "existing" | "ambiguous"

type IdentityNextAction = "pay" | "confirm_identity" | "collect_identity"

type IdentityDocument = {
  documentId?: string
  type?: "national" | "passport"
  numberMasked?: string
  issueDate?: string
  expiryDate?: string
  issuePlace?: string
  hasFrontImage?: boolean
  hasBackImage?: boolean
}

type IdentityPreview = IdentityDocument & {
  fullName?: string
  mobile?: string
  documentId?: string
  status?: string
}

type IdentityCandidate = {
  identityId: string
  status?: string
  preview?: { fullName?: string; mobile?: string }
  documents?: IdentityDocument[]
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
  identityNextAction?: IdentityNextAction
  candidates: IdentityCandidate[]
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
  identityId: string
  idempotencyKey: string
}

type PaymentState = "idle" | "submitting" | "checking" | "uncertain" | "in_progress" | "failed"

const PAYOUT_ATTEMPT_TTL_MS = 24 * 60 * 60 * 1000

function identityBlockedMessage(): string {
  return "تعذر تحديد متطلبات الهوية — يرجى البحث من جديد"
}

// Single source of truth for what each identity decision requires before payout:
// - existing:  one identity on file → the search already bound a payout token.
// - ambiguous: several identities on file → the agent picks one, then pays.
// - new:       no identity record → collect identity + upload images.
// - unknown:   blocked.
function identityFlow(status: IdentityStatus): {
  upload: boolean
  blocked: boolean
  select: boolean
} {
  switch (status) {
    case "existing":
      return { upload: false, blocked: false, select: false }
    case "ambiguous":
      return { upload: false, blocked: false, select: true }
    case "new":
      return { upload: true, blocked: false, select: false }
    default:
      return { upload: false, blocked: true, select: false }
  }
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `pay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`
}

function payoutAttemptStorageKey(result: SearchResult): string {
  return `remittance-payout:${result.networkKey}:${result.reference}`
}

function getOrCreatePayoutKey(result: SearchResult): string {
  const storageKey = payoutAttemptStorageKey(result)
  try {
    const stored = JSON.parse(sessionStorage.getItem(storageKey) || "null") as {
      key?: string
      createdAt?: number
    } | null
    if (
      stored?.key &&
      typeof stored.createdAt === "number" &&
      Date.now() - stored.createdAt < PAYOUT_ATTEMPT_TTL_MS
    ) {
      return stored.key
    }
  } catch {}

  const key = newIdempotencyKey()
  try {
    sessionStorage.setItem(storageKey, JSON.stringify({ key, createdAt: Date.now() }))
  } catch {}
  return key
}

const ID_TYPE_LABELS: Record<"national" | "passport", string> = {
  national: "بطاقة شخصية",
  passport: "جواز سفر",
}

function fullIdentityImageUrl(preview: string): string {
  if (!preview.includes("/agent/remittance/identity/document-image")) return preview
  return `${preview}${preview.includes("?") ? "&" : "?"}variant=content`
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

const STATUS_BADGES: Record<string, string> = {
  verified: "هوية موثقة",
  pending: "قيد المراجعة",
  rejected: "مرفوضة",
}

// Lets the agent disambiguate between the identities matched by the search.
// The selected identity is what the payout is authorized against.
function IdentityCandidatePicker({
  candidates,
  selectedId,
  disabled,
  onSelect,
}: {
  candidates: IdentityCandidate[]
  selectedId: string
  disabled?: boolean
  onSelect: (identityId: string) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-muted-foreground">الهويات المطابقة</p>
      <div className="space-y-2" role="radiogroup" aria-label="الهويات المطابقة">
        {candidates.map((candidate) => {
          const document = candidate.documents?.[0]
          const active = String(candidate.identityId) === String(selectedId)
          return (
            <button
              key={candidate.identityId}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onSelect(String(candidate.identityId))}
              className={`w-full rounded-xl border p-3 text-start transition-colors disabled:opacity-60 ${
                active
                  ? "border-emerald-500 bg-emerald-100/60"
                  : "border-border/70 bg-background/80 hover:border-primary/40"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    active ? "border-emerald-600 bg-emerald-600" : "border-border"
                  }`}
                  aria-hidden="true"
                >
                  {active && <CheckCircle2 className="h-3 w-3 text-white" />}
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">
                      {candidate.preview?.fullName || "—"}
                    </p>
                    {candidate.status && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        {STATUS_BADGES[candidate.status] || candidate.status}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {candidate.preview?.mobile && (
                      <span className="font-mono" dir="ltr">{candidate.preview.mobile}</span>
                    )}
                    {document?.type && <span>{ID_TYPE_LABELS[document.type]}</span>}
                    {document?.numberMasked && (
                      <span className="font-mono" dir="ltr">{document.numberMasked}</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

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
  paymentBlocked,
  isConfirming,
  confirmIdNumber,
  networks,
  selectedIdentityId,
  selectedStatus,
  identityDetails,
  onCandidateSelect,
  onConfirmIdNumberChange,
  onConfirmIdentity,
  onIdNumberChange,
  onIdTypeChange,
  onIssueDateChange,
  onExpiryDateChange,
  onIssuePlaceChange,
  imageFiles,
  onImageChange,
  onPaySubmit,
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
  paymentBlocked: boolean
  isConfirming: boolean
  confirmIdNumber: string
  networks: any[]
  selectedIdentityId: string
  selectedStatus?: string
  identityDetails: {
    fullName?: string
    idNumber?: string
    type?: "national" | "passport"
    issueDate?: string
    expiryDate?: string
    issuePlace?: string
  }
  onCandidateSelect: (identityId: string) => void
  onConfirmIdNumberChange: (v: string) => void
  onConfirmIdentity: () => void
  onIdNumberChange: (v: string) => void
  onIdTypeChange: (v: "national" | "passport") => void
  onIssueDateChange: (v: string) => void
  onExpiryDateChange: (v: string) => void
  onIssuePlaceChange: (v: string) => void
  imageFiles: IdentityImageFiles
  onImageChange: (slot: IdentityImageSlot, file: File | null) => void
  onPaySubmit: (e: React.FormEvent) => void
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
                  {flow.upload
                    ? "تأكد من البيانات ثم أدخل هوية المستلم وصورها للدفع"
                    : flow.select
                      ? "تطابق أكثر من هوية مع المستلم — تحقق برقم الهوية ثم أكمل الدفع"
                      : "راجع هوية المستلم المسجلة وتحقق من رقم هويتها ثم أكمل الدفع"}
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

            {/* Identity on file: the search already bound a payout authorization
                token — the agent reviews it (and picks a candidate when several
                identities match) then pays. */}
            {!flow.upload && !flow.blocked ? (
              <form onSubmit={onPaySubmit} className="space-y-5">
                {flow.select && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-50 p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-700">تم العثور على عدة هويات مطابقة</p>
                      <p className="text-sm text-amber-700/80 mt-0.5">
                        اختر هوية المستلم الصحيحة قبل إتمام الدفع
                      </p>
                    </div>
                  </div>
                )}

                <div className="overflow-hidden rounded-2xl border border-emerald-500/40 bg-emerald-50/70">
                  <div className="space-y-4 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold">هوية المستلم مسجلة مسبقاً</p>
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">
                            {STATUS_BADGES[selectedStatus || ""] || "مسجلة"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {flow.select
                            ? "طابق أكثر من هوية مع بيانات المستلم — تحقق برقم هوية المستلم لتحديد الهوية الصحيحة."
                            : "تم العثور على هوية مرتبطة ببيانات المستلم. تحقق برقم هوية المستلم قبل الدفع."}
                        </p>
                      </div>
                    </div>

                    {flow.select && (
                      <IdentityCandidatePicker
                        candidates={searchResult.candidates}
                        selectedId={selectedIdentityId}
                        disabled={identityLocked || isConfirming || isPaying || paymentBlocked}
                        onSelect={onCandidateSelect}
                      />
                    )}

                    <IdentityDetailsGrid details={identityDetails} />
                  </div>

                  <div className={`border-t px-4 py-3 sm:px-5 ${identityLocked ? "border-emerald-500/20 bg-emerald-100/50" : "border-primary/15 bg-background/70"}`}>
                    {identityLocked ? (
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">تم التحقق من رقم هوية المستلم</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            الحوالة جاهزة للدفع — الترخيص مرتبط بالهوية ويُستخدم لمرة واحدة
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                            1
                          </div>
                          <div>
                            <p className="text-sm font-bold">تحقق من هوية المستلم</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              أدخل رقم الهوية كما هو مدوّن في بطاقة المستلم لمطابقته مع السجل
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={confirmIdNumber}
                            onChange={(event) => onConfirmIdNumberChange(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault()
                                onConfirmIdentity()
                              }
                            }}
                            placeholder="رقم الهوية"
                            dir="ltr"
                            inputMode="text"
                            autoComplete="off"
                            disabled={isConfirming || isPaying || paymentBlocked}
                            className="flex-1 font-mono"
                            aria-label="رقم هوية المستلم للتحقق"
                          />
                          <Button
                            type="button"
                            onClick={onConfirmIdentity}
                            disabled={isConfirming || isPaying || paymentBlocked || !confirmIdNumber.trim()}
                            className="h-10 shrink-0"
                          >
                            {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            {isConfirming ? "جاري التحقق..." : "تحقق"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <Button type="button" variant="outline" onClick={onReset} disabled={isPaying || paymentBlocked} className="h-11 sm:w-auto">
                    <RotateCcw className="h-4 w-4" />
                    بحث جديد
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPaying || paymentBlocked || !identityComplete}
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
                    {identityBlockedMessage()}
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
                  disabled={isPaying || paymentBlocked}
                  className="h-11"
                >
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    <span>بحث جديد</span>
                  </div>
                </Button>
                <Button
                  type="submit"
                  disabled={isPaying || paymentBlocked || !identityComplete}
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
                  {!flow.upload && !flow.blocked && (
                    <Badge className="mr-auto h-5 border-emerald-200 bg-emerald-50 px-1.5 text-[9px] text-emerald-700 hover:bg-emerald-50">
                      {STATUS_BADGES[selectedStatus || ""] || "مسجلة"}
                    </Badge>
                  )}
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
                      <button
                        type="button"
                        onClick={() => window.open(fullIdentityImageUrl(frontPreview), "_blank")}
                        className="block w-full overflow-hidden rounded-lg border bg-muted/20 p-1 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label="عرض صورة الهوية الأمامية بالحجم الكامل"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={frontPreview} alt="هوية - أمام" className="aspect-[1.58/1] w-full object-contain" />
                      </button>
                    ) : (
                      <div className="aspect-[1.58/1] rounded-md border border-dashed" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">خلف</p>
                    {backPreview ? (
                      <button
                        type="button"
                        onClick={() => window.open(fullIdentityImageUrl(backPreview), "_blank")}
                        className="block w-full overflow-hidden rounded-lg border bg-muted/20 p-1 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label="عرض صورة الهوية الخلفية بالحجم الكامل"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={backPreview} alt="هوية - خلف" className="aspect-[1.58/1] w-full object-contain" />
                      </button>
                    ) : (
                      <div className="aspect-[1.58/1] rounded-md border border-dashed" />
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
  const receiptSlipRef = useRef<HTMLDivElement>(null)

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
          <SharePdfButton
            slipRef={receiptSlipRef}
            filename={`pay-remittance-${payResult.expressid || payResult.txId || "receipt"}`}
          />
        </div>
      </div>

      {/* Printable slip — A5 remittance document */}
      <div className="print-area max-w-2xl mx-auto">
        <div ref={receiptSlipRef} className="print-slip rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
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

          {/* Document footer: agent + timestamp + proof */}
          <div className="border-t-2 border-dashed border-border/40 bg-muted/20 px-4 py-2.5 text-[10px] text-muted-foreground">
            <div className="flex items-center justify-between gap-2 whitespace-nowrap">
              <span>
                تم الصرف عبر الوكيل: <span className="font-semibold text-foreground">{agentName || "—"}</span>
              </span>
              <span className="font-mono font-semibold text-foreground whitespace-nowrap" dir="ltr">
                {formatReceiptTimestamp(paidAt)}
              </span>
            </div>
            <div className="mt-2 border-t border-border/40 pt-2 text-center">
              <span className="font-medium text-muted-foreground">هذا الإيصال سند إثبات لعملية الدفع</span>
            </div>
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
  const [paymentState, setPaymentState] = useState<PaymentState>("idle")
  const [paymentMessage, setPaymentMessage] = useState("")
  const payoutInFlightRef = useRef(false)
  const authorizationInFlightRef = useRef(false)
  const recoveryTimerRef = useRef<number | null>(null)
  const [payResult, setPayResult] = useState<PayResult | null>(null)
  const [paidAt, setPaidAt] = useState<Date>(new Date())

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isNetworksLoading, setIsNetworksLoading] = useState(true)
  const [agentName, setAgentName] = useState("")

  // Ambiguous matches: the identity the payout is currently authorized against
  // (bound at search time) vs. the one the agent picked in the list.
  const [selectedIdentityId, setSelectedIdentityId] = useState("")
  // Full ID number typed by the agent from the receiver's physical card.
  const [confirmIdNumber, setConfirmIdNumber] = useState("")
  const [isConfirming, setIsConfirming] = useState(false)

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
  const paymentUnresolved = ["uncertain", "checking", "in_progress"].includes(paymentState)

  // Details of the candidate currently selected in the ambiguous picker (falls
  // back to the identity matched by the search).
  const selectedCandidate = searchResult?.candidates.find(
    (candidate) => String(candidate.identityId) === String(selectedIdentityId),
  )
  const selectedStatus = selectedCandidate?.status ?? searchResult?.identity?.status
  const identityDetails = {
    fullName:
      selectedCandidate?.preview?.fullName ||
      searchResult?.identity?.fullName ||
      searchResult?.receiverName,
    idNumber:
      selectedCandidate?.documents?.[0]?.numberMasked ?? searchResult?.identity?.numberMasked,
    type:
      selectedCandidate?.documents?.[0]?.type ?? searchResult?.identity?.type,
    issueDate:
      selectedCandidate?.documents?.[0]?.issueDate ?? searchResult?.identity?.issueDate,
    expiryDate:
      selectedCandidate?.documents?.[0]?.expiryDate ?? searchResult?.identity?.expiryDate,
    issuePlace:
      selectedCandidate?.documents?.[0]?.issuePlace ?? searchResult?.identity?.issuePlace,
  }
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
    const unresolved = ["submitting", "checking", "uncertain", "in_progress"].includes(paymentState)
    if (!unresolved) return
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warnBeforeLeave)
    return () => window.removeEventListener("beforeunload", warnBeforeLeave)
  }, [paymentState])

  useEffect(() => () => {
    if (recoveryTimerRef.current !== null) window.clearTimeout(recoveryTimerRef.current)
  }, [])

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



  // Existing-identity payouts have no local uploads: the stored document images
  // are served through the cookie-authenticated proxy so the printed receipt
  // isn't blank. The proxy resolves the document from the search workflow, so
  // the same URL follows whichever candidate is currently authorized — `version`
  // only defeats the browser cache after a re-selection.
  const storedPreviews = (
    searchToken: string,
    doc: IdentityDocument | undefined,
  ): { front: string | null; back: string | null } => {
    const imageBase = `/api/proxy/agent/remittance/identity/document-image?searchToken=${encodeURIComponent(
      searchToken,
    )}&v=${Date.now()}`
    return {
      front: doc?.hasFrontImage ? `${imageBase}&slot=front` : null,
      back: doc?.hasBackImage ? `${imageBase}&slot=back` : null,
    }
  }

  // Fill the identity form fields from a stored document (existing/ambiguous
  // identity, or a candidate the agent picked).
  const applyIdentityPreview = (doc: IdentityDocument) => {
    setIdNumber(String(doc.numberMasked || ""))
    setIdType(doc.type === "passport" ? "passport" : "national")
    setIssueDate(isoToDateInput(doc.issueDate))
    setExpiryDate(isoToDateInput(doc.expiryDate))
    setIssuePlace(String(doc.issuePlace || ""))
  }

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
        const searchToken = String(d.searchToken || "")
        const status = (dec.status || "") as IdentityStatus
        const candidates: IdentityCandidate[] = Array.isArray(dec.candidates) ? dec.candidates : []
        const identity = dec.identity as IdentityPreview | undefined

        setIdentityAuth(null)
        setPaymentState("idle")
        setPaymentMessage("")
        setStoredDocPreviews({ front: null, back: null })
        setSelectedIdentityId("")

        const result: SearchResult = {
          searchToken,
          reference: String(rem.reference || inputRemittanceId.trim()),
          networkKey: String(rem.networkKey || selectedNetwork),
          status: rem.status,
          amount: rem.amount,
          currencyCode: rem.currencyCode,
          senderName: rem.sender?.name ?? rem.senderName,
          senderMobile: pickString(rem.sender, ["mobile", "phone", "msisdn"]) || pickString(rem, ["senderMobile", "sender_mobile"]),
          receiverName: rem.receiver?.name ?? rem.receiverName,
          receiverMobile: pickString(rem.receiver, ["mobile", "phone", "msisdn"]) || pickString(rem, ["receiverMobile", "receiver_mobile"]),
          identityStatus: status,
          identityNextAction: dec.nextAction,
          candidates,
          identity,
        }
        setSearchResult(result)

        // Existing / ambiguous: the identity is on file but the payout token is
        // NOT issued here — the agent must confirm the receiver's full ID
        // number first (handleConfirmIdentity). Document images are hidden
        // until confirmation succeeds so the number can't be read off the
        // screen instead of the receiver's physical card; details shown are
        // the matched identity (first candidate when ambiguous).
        if (identity) {
          applyIdentityPreview(identity)
        }
        const boundId = status === "ambiguous" ? String(candidates[0]?.identityId ?? "") : ""
        setSelectedIdentityId(boundId)
        setConfirmIdNumber("")
      } else {
        toast.error(response.message || "لم يتم العثور على الحوالة")
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء البحث")
    } finally {
      setIsSearching(false)
    }
  }

  // Confirms the receiver's identity by the full document number read off the
  // physical card. On a match the server binds the payout to that identity and
  // returns the single-use authorization token; for an ambiguous match the
  // entered number — not the highlighted card — decides who gets paid.
  const handleConfirmIdentity = async () => {
    if (!searchResult || isConfirming || isPaying) return
    const entered = confirmIdNumber.trim()
    if (!entered) {
      toast.error("أدخل رقم هوية المستلم كما هو مدوّن في بطاقته")
      return
    }
    setIsConfirming(true)
    try {
      const response = await apiClient.agentRemittanceIdentityConfirm(
        searchResult.searchToken,
        entered,
      )
      const data: any = response.data || {}
      if (!response.success || !data.identityAuthorizationToken || !data.identityId) {
        if (response.code === "IDENTITY_CONFIRM_LOCKED") {
          toast.error("تم قفل التحقق بعد محاولات فاشلة متكررة — ابحث عن الحوالة من جديد")
          handleReset()
          return
        }
        toast.error(
          response.code === "IDENTITY_CONFIRM_MISMATCH"
            ? "رقم الهوية غير مطابق للمستلم"
            : response.message || "تعذر التحقق من رقم الهوية",
        )
        return
      }
      const auth = {
        token: String(data.identityAuthorizationToken),
        identityId: String(data.identityId),
        idempotencyKey: getOrCreatePayoutKey(searchResult),
      }
      setIdentityAuth(auth)
      // Confirmation succeeded — now it's safe to reveal the stored document
      // images. The confirmed identity decides the payout: if it differs from
      // the card the agent was previewing, snap the display to the paid one.
      const confirmedId = String(data.identityId)
      const confirmedDoc =
        searchResult.candidates.find((c) => String(c.identityId) === confirmedId)
          ?.documents?.[0] ?? searchResult.identity
      if (confirmedId !== selectedIdentityId) {
        setSelectedIdentityId(confirmedId)
      }
      if (confirmedDoc) {
        applyIdentityPreview(confirmedDoc)
        setStoredDocPreviews(storedPreviews(searchResult.searchToken, confirmedDoc))
      }
      setConfirmIdNumber("")
      toast.success("تم التحقق من هوية المستلم — جاهز للدفع")
    } catch (error: any) {
      toast.error(error.message || "تعذر التحقق من رقم الهوية")
    } finally {
      setIsConfirming(false)
    }
  }

  const submitAuthorizedPayout = async (
    auth: IdentityAuthorization,
    closeConfirmationOnFailure: boolean,
    recoveryCheck = false,
  ) => {
    if (!searchResult || payoutInFlightRef.current) return false
    if (recoveryCheck && recoveryTimerRef.current !== null) {
      window.clearTimeout(recoveryTimerRef.current)
      recoveryTimerRef.current = null
    }

    payoutInFlightRef.current = true
    setIsPaying(true)
    setPaymentState(recoveryCheck ? "checking" : "submitting")
    setPaymentMessage(recoveryCheck ? "جاري التحقق من نتيجة عملية الدفع السابقة..." : "جاري تنفيذ عملية الدفع...")
    let scheduleRecovery = false
    try {
      const response = await apiClient.agentRemittancePay(
        searchResult.networkKey,
        {
          searchToken: searchResult.searchToken,
          inputRemittanceId: searchResult.reference,
          identityAuthorizationToken: auth.token,
          identityId: auth.identityId,
        },
        auth.idempotencyKey
      )

      if (response.success) {
        setPaymentState("idle")
        setPaymentMessage("")
        setPayResult(normalizePayResult(response.data, searchResult))
        setPaidAt(new Date())
        setShowConfirmDialog(false)
        return true
      }

      if (response.code === "PAYMENT_IN_PROGRESS") {
        setPaymentState("in_progress")
        setPaymentMessage("عملية الدفع قيد المعالجة. لا تبدأ عملية جديدة؛ تحقق من النتيجة بعد قليل.")
        toast.warning("الدفع قيد المعالجة حالياً — لا تُعد المحاولة الآن، تحقق من الحوالة بعد قليل")
        setShowConfirmDialog(false)
        return false
      }
      if (response.code === "IDEMPOTENCY_KEY_REUSED") {
        setPaymentState("failed")
        setPaymentMessage("تعذر متابعة العملية لأن مفتاحها مرتبط بحوالة أخرى. ابحث عن الحوالة من جديد.")
        toast.error("مفتاح العملية مستخدم لحوالة أخرى — ابحث عن الحوالة من جديد لبدء عملية جديدة")
        if (closeConfirmationOnFailure) setShowConfirmDialog(false)
        return false
      }

      if (
        response.code === "UPSTREAM_TIMEOUT" ||
        response.code === "CLIENT_TIMEOUT" ||
        response.code === "UPSTREAM_UNAVAILABLE"
      ) {
        setPaymentState("uncertain")
        setPaymentMessage("انتهت مهلة الاستجابة وقد تكون الحوالة صُرفت. سيتم التحقق تلقائياً بنفس مفتاح العملية.")
        setShowConfirmDialog(false)
        scheduleRecovery = !recoveryCheck
        toast.warning("انتهت مهلة الاستجابة. لا تُعد الدفع؛ جارٍ التحقق من النتيجة بنفس مفتاح العملية.")
        return false
      }

      setPaymentState("failed")
      setPaymentMessage(response.message || "فشل في دفع الحوالة")
      toast.error(response.message || "فشل في دفع الحوالة")
      if (closeConfirmationOnFailure) setShowConfirmDialog(false)
      return false
    } catch (error: any) {
      setPaymentState("failed")
      setPaymentMessage(error.message || "حدث خطأ أثناء الدفع")
      toast.error(error.message || "حدث خطأ أثناء الدفع")
      if (closeConfirmationOnFailure) setShowConfirmDialog(false)
      return false
    } finally {
      payoutInFlightRef.current = false
      setIsPaying(false)
      if (scheduleRecovery) {
        recoveryTimerRef.current = window.setTimeout(() => {
          recoveryTimerRef.current = null
          void submitAuthorizedPayout(auth, false, true)
        }, 2500)
      }
    }
  }

  const handleCandidateSelect = (identityId: string) => {
    if (!searchResult || isConfirming || isPaying) return
    if (identityId === selectedIdentityId) return
    // Display-only until the ID-number confirmation succeeds — the entered
    // number decides the payout, so candidate cards must not reveal their
    // stored document images beforehand.
    setSelectedIdentityId(identityId)
    const candidate = searchResult.candidates.find((c) => String(c.identityId) === identityId)
    const doc = candidate?.documents?.[0]
    if (doc) {
      applyIdentityPreview(doc)
    }
  }

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchResult || !flow) return
    if (flow.blocked) {
      toast.error(identityBlockedMessage())
      return
    }
    // Identity already on file: the authorization token was bound to the identity
    // at search time (or re-bound when the agent picked another candidate).
    if (!flow.upload) {
      if (!identityAuth) {
        toast.error("لا يوجد ترخيص دفع مرتبط بالهوية — يرجى البحث من جديد")
        return
      }
      setShowConfirmDialog(true)
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
    if (!searchResult || !flow || flow.blocked || authorizationInFlightRef.current) return
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
    authorizationInFlightRef.current = true
    setIsPaying(true)

    try {
      // Existing/ambiguous: the token was minted by the ID-number confirmation
      // and is already bound to the confirmed identity.
      let auth = identityAuth
      // 1) Identity upload → short-lived payout authorization token.
      //    Skipped entirely when retrying a payout that already uploaded.
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
        auth = {
          token: String(uploadToken),
          identityId: String(uploadPayload.identityId || ""),
          idempotencyKey: getOrCreatePayoutKey(searchResult),
        }
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
      authorizationInFlightRef.current = false
      setIsPaying(false)
    }
  }

  const handleReset = () => {
    if (paymentUnresolved || isPaying) {
      toast.warning("تحقق من نتيجة عملية الدفع الحالية قبل بدء بحث جديد")
      return
    }
    if (recoveryTimerRef.current !== null) {
      window.clearTimeout(recoveryTimerRef.current)
      recoveryTimerRef.current = null
    }
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
    setPaymentState("idle")
    setPaymentMessage("")
    setSelectedIdentityId("")
    setConfirmIdNumber("")
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
        {paymentState !== "idle" && (
          <Alert
            variant={paymentState === "failed" ? "destructive" : "default"}
            className={`mb-4 ${paymentUnresolved ? "border-amber-400 bg-amber-50 text-amber-900" : ""}`}
          >
            {paymentState === "checking" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertTitle>
              {paymentState === "checking"
                ? "جاري التحقق من نتيجة الدفع"
                : paymentState === "in_progress"
                  ? "الدفع قيد المعالجة"
                  : paymentState === "uncertain"
                    ? "نتيجة الدفع غير مؤكدة"
                    : paymentState === "submitting"
                      ? "جاري تنفيذ الدفع"
                      : "تعذر إتمام الدفع"}
            </AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{paymentMessage}</span>
              {paymentUnresolved && identityAuth && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPaying || paymentState === "checking"}
                  onClick={() => void submitAuthorizedPayout(identityAuth, false, true)}
                  className="shrink-0 bg-background"
                >
                  {isPaying && <Loader2 className="h-4 w-4 animate-spin" />}
                  التحقق من نتيجة الدفع
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

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
          paymentBlocked={paymentUnresolved}
          isConfirming={isConfirming}
          confirmIdNumber={confirmIdNumber}
          networks={networks}
          selectedIdentityId={selectedIdentityId}
          selectedStatus={selectedStatus}
          identityDetails={identityDetails}
          onCandidateSelect={handleCandidateSelect}
          onConfirmIdNumberChange={setConfirmIdNumber}
          onConfirmIdentity={handleConfirmIdentity}
          onIdNumberChange={setIdNumber}
          onIdTypeChange={(v) => setIdType(v)}
          onIssueDateChange={setIssueDate}
          onExpiryDateChange={setExpiryDate}
          onIssuePlaceChange={setIssuePlace}
          imageFiles={identityImages.files}
          onImageChange={identityImages.set}
          onPaySubmit={handlePaySubmit}
          onReset={handleReset}
        />

        <PayConfirmDialog
          open={showConfirmDialog}
          onOpenChange={(open) => {
            if (!open && isPaying) return
            setShowConfirmDialog(open)
          }}
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
