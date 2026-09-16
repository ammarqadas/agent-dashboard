"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LinkedIdentityView } from "@/components/identity"
import type { LinkedIdentity } from "@/components/identity"
import { useRouter } from "next/navigation"

interface WalletViewProps {
  wallet: any
  showDetails?: boolean
  showIdentity?: boolean
  identity?: LinkedIdentity | null
  isIdentityLoading?: boolean
}

export function WalletView({ wallet, showDetails = true, showIdentity = true, identity, isIdentityLoading }: WalletViewProps) {
  const router = useRouter()
  const [walletData, setWalletData] = useState(wallet)

  // Stay in sync when the parent reloads the wallet (e.g. after identity save).
  useEffect(() => setWalletData(wallet), [wallet])

  const walletId = walletData.id || walletData._id
  const walletName = walletData.name || "N/A"
  const walletMobile = walletData.mobile || "N/A"
  const isActive = walletData.active !== false
  const identityRef = walletData?.identityLink?.identityRef
  const imageBase = identityRef
    ? `/api/proxy/agent/identities/${encodeURIComponent(String(identityRef))}/document-image`
    : undefined

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>المعلومات الشخصية</CardTitle>
          <CardDescription>بيانات صاحب المحفظة</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/30 border">
            <p className="text-xs text-muted-foreground mb-1">الاسم</p>
            <p className="text-lg font-semibold">{walletName}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border">
            <p className="text-xs text-muted-foreground mb-1">الجوال</p>
            <p className="text-lg font-semibold" dir="ltr">{walletMobile}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border">
            <p className="text-xs text-muted-foreground mb-1">معرّف المحفظة</p>
            <p className="text-lg font-semibold" dir="ltr">{walletId}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border">
            <p className="text-xs text-muted-foreground mb-1">الحالة</p>
            <p className={`text-lg font-semibold ${isActive ? "text-emerald-600" : "text-muted-foreground"}`}>
              {isActive ? "مفعّلة" : "موقوفة"}
            </p>
          </div>
        </div>

        {showIdentity && identityRef && <LinkedIdentityView identity={identity} imageBase={imageBase} loading={isIdentityLoading} />}

        <div className="flex flex-wrap gap-2 pt-2">
          {showDetails && (
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/wallet/${walletId}`)}
            >
              عرض التفاصيل
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
