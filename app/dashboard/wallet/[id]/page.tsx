"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { WalletView } from "@/components/wallet-view"
import { WalletIdentity } from "@/components/wallet-identity"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api"
import type { WalletIdentitySaveResult } from "@/lib/api"
import type { LinkedIdentity } from "@/components/identity"
import { toast } from "sonner"

export default function WalletDetailPage() {
  const params = useParams()
  const walletId = params.id as string
  const [wallet, setWallet] = useState(null as any)
  const [identity, setIdentity] = useState<LinkedIdentity | null>(null)
  const [isIdentityLoading, setIsIdentityLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [walletError, setWalletError] = useState("")
  const [identityError, setIdentityError] = useState("")
  const [activating, setActivating] = useState(false)
  const [documentBusy, setDocumentBusy] = useState(false)
  const [documentDirty, setDocumentDirty] = useState(false)
  const walletRequest = useRef<AbortController | null>(null)
  const identityRequest = useRef<AbortController | null>(null)
  const currentWalletId = useRef(walletId)
  const mounted = useRef(false)
  currentWalletId.current = walletId

  const loadIdentity = useCallback(async (walletData: any) => {
    if (!mounted.current || String(walletData.id || walletData._id) !== currentWalletId.current) return
    identityRequest.current?.abort()
    const controller = new AbortController()
    identityRequest.current = controller
    const identityRef = walletData.identityLink?.identityRef
    setIdentityError("")
    if (!identityRef) {
      setIdentity(null)
      setIsIdentityLoading(false)
      return
    }
    setIdentity(previous => previous?.id === identityRef ? previous : null)
    setIsIdentityLoading(true)
    try {
      const response = await apiClient.getLinkedIdentity(identityRef, controller.signal)
      if (controller.signal.aborted) return
      const linked = response.data || response.identity
      if (!response.success || !linked) {
        setIdentityError(response.message || "تعذر تحميل وثيقة الهوية")
        return
      }
      setIdentity({ ...linked, documentRef: linked.documentRef || walletData.identityLink.documentRef || null })
    } catch {
      if (!controller.signal.aborted) setIdentityError("تعذر تحميل وثيقة الهوية")
    } finally {
      if (!controller.signal.aborted) setIsIdentityLoading(false)
    }
  }, [])

  const loadWallet = useCallback(async () => {
    if (!mounted.current || currentWalletId.current !== walletId) return
    walletRequest.current?.abort()
    const controller = new AbortController()
    walletRequest.current = controller
    setWalletError("")
    try {
      const response = await apiClient.getWallet(walletId, 0, controller.signal)
      if (controller.signal.aborted || currentWalletId.current !== walletId) return
      if (!response.success || !response.data) {
        setWalletError(response.message || "تعذر تحميل المحفظة")
        return
      }
      setWallet(response.data)
      void loadIdentity(response.data)
    } catch {
      if (!controller.signal.aborted) setWalletError("تعذر تحميل المحفظة")
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [walletId, loadIdentity])

  useEffect(() => {
    mounted.current = true
    setWallet(null)
    setIdentity(null)
    setIsLoading(true)
    setDocumentDirty(false)
    setDocumentBusy(false)
    setActivating(false)
    void loadWallet()
    return () => {
      mounted.current = false
      walletRequest.current?.abort()
      identityRequest.current?.abort()
    }
  }, [loadWallet])

  const identitySaved = useCallback((result: WalletIdentitySaveResult) => {
    if (!mounted.current || result.walletId !== currentWalletId.current) return
    setWallet((previous: any) => ({ ...previous, identityLink: result.identityLink }))
    setIdentity(result.identity)
    setIdentityError("")
  }, [])

  const activate = async () => {
    if (!wallet || documentDirty || documentBusy || isIdentityLoading) return
    setActivating(true)
    setWalletError("")
    try {
      const response = await apiClient.updateWallet(walletId, { active: true })
      if (!mounted.current || currentWalletId.current !== walletId) return
      if (!response.success) { setWalletError(response.message || "تعذر تفعيل المحفظة"); return }
      setWallet((previous: any) => ({ ...previous, active: true }))
      toast.success("تم تفعيل المحفظة")
    } catch { setWalletError("تعذر تفعيل المحفظة") }
    finally { if (mounted.current && currentWalletId.current === walletId) setActivating(false) }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">جاري تحميل بيانات المحفظة...</p>
        </div>
      </div>
    )
  }

  if (!wallet) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p role="alert" className="text-lg font-semibold text-destructive">{walletError || "لم يتم العثور على المحفظة المطلوبة"}</p>
            <Button className="mt-3" variant="outline" onClick={() => void loadWallet()}>إعادة المحاولة</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">تفاصيل المحفظة</h2>
        <p className="text-muted-foreground">عرض وإدارة معلومات المحفظة والهوية</p>
      </div>

      {walletError && <p role="alert" className="text-sm text-destructive">{walletError}</p>}
      <WalletView wallet={wallet} identity={identity} isIdentityLoading={isIdentityLoading} showDetails={false} showIdentity={false} />

      {identityError && <div role="alert" className="space-y-2 rounded-lg border border-destructive/20 p-4"><p className="text-sm text-destructive">{identityError}</p><Button variant="outline" onClick={() => void loadIdentity(wallet)}>إعادة تحميل وثيقة الهوية</Button></div>}
      {wallet.identityLink?.identityRef && !identity ? !identityError && <Card><CardContent className="flex items-center gap-2 py-6"><Loader2 className="h-4 w-4 animate-spin" />جاري تحميل وثيقة الهوية...</CardContent></Card>
        : <WalletIdentity key={`document-${walletId}`} wallet={{ ...wallet, active: wallet.active !== false || activating }} identity={identity} loading={isIdentityLoading || Boolean(identityError)} onSaved={identitySaved} onBusyChange={setDocumentBusy} onDirtyChange={setDocumentDirty} />}

      {wallet.active === false && <Card>
        <CardHeader><CardTitle>تفعيل المحفظة</CardTitle><CardDescription>احفظ البيانات الشخصية وبيانات الوثيقة أولاً؛ التفعيل إجراء مستقل ويوقف إمكانية التعديل من الوكيل.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {!wallet.identityLink?.identityRef && <p className="text-sm text-muted-foreground">سجّل هوية العميل قبل تفعيل المحفظة.</p>}
          {documentDirty && <p className="text-sm text-muted-foreground">احفظ التعديلات أو تراجع عنها قبل التفعيل.</p>}
          <Button onClick={activate} disabled={activating || !wallet.identityLink?.identityRef || isIdentityLoading || Boolean(identityError) || documentBusy || documentDirty}>{activating && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}تفعيل المحفظة</Button>
        </CardContent>
      </Card>}
    </div>
  )
}
