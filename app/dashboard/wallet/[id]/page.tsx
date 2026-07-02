"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { WalletView } from "@/components/wallet-view"
import { WalletIdentity, WalletIdentityDisplay } from "@/components/wallet-identity"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle } from "lucide-react"
import { apiClient } from "@/lib/api"

export default function WalletDetailPage() {
  const params = useParams()
  const walletId = params.id as string
  const [wallet, setWallet] = useState(null as any)
  const [isLoading, setIsLoading] = useState(true)
  const [isActivating, setIsActivating] = useState(false)

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
        setWallet(response.data || response)
      }
    } catch (err) {
      console.error("Failed to load wallet:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivate = async () => {
    setIsActivating(true)
    try {
      const response = await apiClient.updateWallet(walletId, { active: true })
      if (response.success) {
        setWallet((prev: any) => ({ ...prev, active: true }))
      }
    } catch (err) {
      console.error("Failed to activate wallet:", err)
    } finally {
      setIsActivating(false)
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

  const isActive = wallet.active !== false

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">تفاصيل المحفظة</h2>
          <p className="text-muted-foreground">
            عرض وإدارة معلومات المحفظة
          </p>
        </div>
        <span
          className={
            "inline-flex items-center self-start rounded-full px-3 py-1 text-xs font-bold " +
            (isActive
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : "bg-muted text-muted-foreground border border-border")
          }
        >
          {isActive ? "مفعّلة" : "موقوفة"}
        </span>
      </div>

      {/* Activation Banner — persistent, shown only when wallet is inactive */}
      {!isActive && (
        <Alert variant="destructive" className="rounded-xl border-destructive/30">
          <AlertCircle className="h-5 w-5" />
          <div className="flex-1">
            <AlertTitle>المحفظة غير مفعّلة</AlertTitle>
            <AlertDescription>
              هذه المحفظة بحاجة إلى التفعيل قبل أن يتمكن العميل من استخدامها.
            </AlertDescription>
          </div>
          <Button
            onClick={handleActivate}
            disabled={isActivating}
            variant="default"
            className="shrink-0 bg-destructive hover:bg-destructive/90"
          >
            {isActivating ? "جاري التفعيل..." : "تفعيل المحفظة"}
          </Button>
        </Alert>
      )}

      <Tabs defaultValue="info" className="w-full">
        <div className="border-b border-border/50 mb-6">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-transparent p-0 gap-1">
            <TabsTrigger 
              value="info" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-primary/5 rounded-none rounded-t-lg"
            >
              المعلومات
            </TabsTrigger>
            <TabsTrigger 
              value="identity"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-primary/5 rounded-none rounded-t-lg"
            >
              تحديث الهوية
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="info" className="mt-0 animate-in fade-in duration-200 space-y-6">
          <WalletView wallet={wallet} showActions={false} />
          <WalletIdentityDisplay wallet={wallet} />
        </TabsContent>

        <TabsContent value="identity" className="mt-0 animate-in fade-in duration-200">
          <WalletIdentity wallet={wallet} onUpdated={loadWallet} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

