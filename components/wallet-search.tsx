"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/api"
import { WalletView } from "./wallet-view"
import { Search, Smartphone, Loader2, UserCircle } from "lucide-react"

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
        const walletResponse = await apiClient.getWallet(response.wallet.id)
        if (walletResponse.success) {
          setWallet(walletResponse.data || walletResponse)
        } else {
          setWallet(response.wallet)
        }
      } else {
        setError(response.message || "لم يتم العثور على محفظة بهذا الرقم")
      }
    } catch (err) {
      setError("حدث خطأ. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Search Form Card - minimal */}
      <Card className="rounded-xl border border-border/60">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="icon-container">
              <UserCircle className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">البحث عن محفظة</CardTitle>
              <CardDescription>
                أدخل رقم جوال العميل للبحث عن محفظته
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Search Input */}
            <div className="input-icon-wrapper">
              <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <Input
                id="mobile"
                type="tel"
                placeholder="رقم الجوال (مثال: 777123456)"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
                dir="ltr"
                className="pr-10"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 text-center">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            {/* Search Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 font-semibold"
            >
              {isLoading ? (
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
          </form>

          {/* Help Text */}
          <div className="text-center text-xs text-muted-foreground">
            <p>يمكنك البحث برقم الجوال المسجل لدى المحفظة</p>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {wallet && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <WalletView wallet={wallet} />
        </div>
      )}
    </div>
  )
}
