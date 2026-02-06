"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/api"
import { WalletView } from "./wallet-view"

export function WalletSearch() {
  const [mobile, setMobile] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [wallet, setWallet] = useState<any>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setWallet(null)
    setIsLoading(true)

    try {
      const response = await apiClient.searchWalletByMobile(mobile.trim())
      
      if (response.success && response.wallet) {
        // Fetch full wallet details
        const walletResponse = await apiClient.getWallet(response.wallet.id)
        if (walletResponse.success) {
          setWallet(walletResponse.data || walletResponse)
        } else {
          setWallet(response.wallet)
        }
      } else {
        setError(response.message || "Wallet not found")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle>البحث عن محفظة برقم الجوال</CardTitle>
          <CardDescription>
            أدخل رقم الجوال للبحث عن المحفظة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 space-y-2 w-full">
                <Label htmlFor="mobile" className="text-right block">رقم الجوال</Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="أدخل رقم الجوال"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="min-w-32 sm:min-w-40">
                {isLoading ? "جاري البحث..." : "بحث"}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </form>
        </CardContent>
      </Card>

      {wallet && (
        <WalletView wallet={wallet} />
      )}
    </div>
  )
}

