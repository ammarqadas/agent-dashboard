"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"

interface WalletViewProps {
  wallet: any
  showActions?: boolean
}

export function WalletView({ wallet, showActions = true }: WalletViewProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [walletData, setWalletData] = useState(wallet)

  const walletId = walletData.id || walletData._id
  const walletName = walletData.name || "N/A"
  const walletMobile = walletData.mobile || "N/A"
  const isActive = walletData.active !== false
  const handleActivate = async () => {
    setIsUpdating(true)
    try {
      const response = await apiClient.updateWallet(walletId, { active: true })
      if (response.success) {
        setWalletData((prev: any) => ({ ...prev, active: true }))
      }
    } catch (err) {
      console.error("Failed to activate wallet:", err)
    } finally {
      setIsUpdating(false)
    }
  }

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

        {showActions && (
          <div className="flex flex-wrap gap-2 pt-2">
            {!isActive && (
              <Button
                onClick={handleActivate}
                disabled={isUpdating}
                variant="default"
              >
                {isUpdating ? "جاري التفعيل..." : "تفعيل المحفظة"}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/wallet/${walletId}`)}
            >
              عرض التفاصيل
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

