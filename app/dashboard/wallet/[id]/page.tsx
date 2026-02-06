"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { WalletView } from "@/components/wallet-view"
import { WalletDeposit } from "@/components/wallet-deposit"
import { WalletIdentity } from "@/components/wallet-identity"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api"

export default function WalletDetailPage() {
  const params = useParams()
  const walletId = params.id as string
  const [wallet, setWallet] = useState(null as any)
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
        setWallet(response.data || response)
      }
    } catch (err) {
      console.error("Failed to load wallet:", err)
    } finally {
      setIsLoading(false)
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
      <div>
        <h2 className="text-3xl font-bold tracking-tight">تفاصيل المحفظة</h2>
        <p className="text-muted-foreground">
          عرض وإدارة معلومات المحفظة
        </p>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">التفاصيل</TabsTrigger>
          <TabsTrigger value="identity">الهوية</TabsTrigger>
          <TabsTrigger value="deposit">إيداع</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <WalletView wallet={wallet} />
        </TabsContent>

        <TabsContent value="identity" className="mt-6">
          <WalletIdentity wallet={wallet} onUpdated={loadWallet} />
        </TabsContent>

        <TabsContent value="deposit" className="mt-6">
          <WalletDeposit mobile={wallet?.mobile} onSuccess={loadWallet} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

