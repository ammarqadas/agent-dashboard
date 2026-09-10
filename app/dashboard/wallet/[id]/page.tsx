"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { WalletView } from "@/components/wallet-view"
import { WalletIdentity } from "@/components/wallet-identity"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api"
import type { LinkedIdentity } from "@/components/identity"

export default function WalletDetailPage() {
  const params = useParams()
  const walletId = params.id as string
  const [wallet, setWallet] = useState(null as any)
  const [identity, setIdentity] = useState<LinkedIdentity | null>(null)
  const [isIdentityLoading, setIsIdentityLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (walletId) {
      loadWallet()
    }
  }, [walletId])

  const loadWallet = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.getWallet(walletId, 3)
      if (response.success) {
        const walletData: any = response.data || response
        setWallet(walletData)
        const identityRef = walletData?.identityLink?.identityRef
        if (!identityRef) {
          setIdentity(null)
          return
        }
        setIsIdentityLoading(true)
        const identityResponse = await apiClient.getLinkedIdentity(identityRef)
        const linkedIdentity = identityResponse.data || identityResponse.identity || null
        setIdentity(identityResponse.success && linkedIdentity
          ? {
              ...linkedIdentity,
              documentRef: linkedIdentity.documentRef || walletData.identityLink.documentRef || null,
            }
          : null)
        setIsIdentityLoading(false)
      }
    } catch (err) {
      console.error("Failed to load wallet:", err)
    } finally {
      setIsLoading(false)
      setIsIdentityLoading(false)
    }
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
            <p className="text-lg font-semibold text-destructive">المحفظة غير موجودة</p>
            <p className="text-sm text-muted-foreground mt-2">لم يتم العثور على المحفظة المطلوبة</p>
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

      {/* Wallet summary + activation */}
      <WalletView wallet={wallet} identity={identity} isIdentityLoading={isIdentityLoading} onActivated={loadWallet} showDetails={false} showIdentity={false} />

      {/* Identity update */}
      <WalletIdentity wallet={wallet} identity={identity} onUpdated={loadWallet} />
    </div>
  )
}
