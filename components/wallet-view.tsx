"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"

interface WalletViewProps {
  wallet: any
}

export function WalletView({ wallet }: WalletViewProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [walletData, setWalletData] = useState(wallet)

  const walletId = walletData.id || walletData._id

  const handleToggleActive = async () => {
    setIsUpdating(true)
    try {
      const response = await apiClient.updateWallet(walletData.id, {
        active: !walletData.active,
      })
      
      if (response.success) {
        setWalletData((prev: any) => ({
          ...prev,
          active: !prev.active,
        }))
      }
    } catch (err) {
      console.error("Failed to update wallet:", err)
    } finally {
      setIsUpdating(false)
    }
  }

  const walletName = walletData.name || "N/A"
  const walletMobile = walletData.mobile || "N/A"
  const walletCode = walletData.code || "N/A"
  const isActive = walletData.active !== false
  const card =
    walletData.card && typeof walletData.card === "object" ? walletData.card : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>تفاصيل المحفظة</CardTitle>
            <CardDescription>عرض وإدارة معلومات المحفظة</CardDescription>
          </div>
          <span
            className={
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold " +
              (isActive
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border bg-muted text-foreground")
            }
          >
            {isActive ? "مفعّلة" : "موقوفة"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">الاسم</p>
            <p className="text-lg font-semibold">{walletName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">الجوال</p>
            <p className="text-lg font-semibold" dir="ltr">{walletMobile}</p>
          </div>
          {/* <div>
            <p className="text-sm font-medium text-muted-foreground">Code</p>
            <p className="text-lg font-semibold">{walletCode}</p>
          </div> */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">معرّف المحفظة</p>
            <p className="text-lg font-semibold" dir="ltr">{walletId}</p>
          </div>
        </div>

        {card && (
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">الهوية</p>
            <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
              <div>
                <span className="text-muted-foreground">الاسم الكامل: </span>
                <span className="font-medium">{card.fullName || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">رقم الهوية: </span>
                <span className="font-medium" dir="ltr">{card.idNumber || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">النوع: </span>
                <span className="font-medium">{card.type || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">تاريخ الانتهاء: </span>
                <span className="font-medium">
                  {card.expdate ? String(card.expdate).slice(0, 10) : "—"}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleToggleActive}
            disabled={isUpdating}
            variant={isActive ? "destructive" : "default"}
          >
            {isUpdating
              ? "جاري التحديث..."
              : isActive
              ? "إيقاف المحفظة"
              : "تفعيل المحفظة"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/wallet/${walletId}`)}
          >
            عرض التفاصيل
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

