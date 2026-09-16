"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/api"
import { WalletView } from "./wallet-view"
import { LinkedIdentity } from "./identity"
import { Search, Smartphone, Loader2, UserCircle, X } from "lucide-react"
import { toast } from "sonner"

const isValidMobile = (mob: string): boolean => /^7[12378]\d{7}$/.test(mob.trim())

export function WalletSearch() {
  const [mobile, setMobile] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [wallet, setWallet] = useState<any>(null)
  const [identity, setIdentity] = useState<LinkedIdentity | null>(null)
  const [isIdentityLoading, setIsIdentityLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleClear = useCallback(() => {
    setMobile("")
    setWallet(null)
    setIdentity(null)
    inputRef.current?.focus()
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!mobile.trim()) {
      toast.error("رقم الجوال مطلوب", {
        description: "أدخل رقم جوال العميل للبحث (مثال: 777123456)",
      })
      return
    }

    if (!isValidMobile(mobile)) {
      toast.error("رقم الجوال غير صحيح", {
        description: "أدخل رقم جوال صحيح: 9 أرقام تبدأ بـ 7 (مثال: 777123456)",
      })
      return
    }

    setWallet(null)
    setIdentity(null)
    setIsLoading(true)

    try {
      const response = await apiClient.searchWalletByMobile(mobile.trim())

      if (response.success && response.wallet) {
        const walletResponse = await apiClient.getWallet(response.wallet.id)
        if (walletResponse.success) {
          const walletData: any = walletResponse.data || walletResponse
          setWallet(walletData)
          const label = [walletData?.name, walletData?.mobile].filter(Boolean).join(" | ")
          toast.success("تم العثور على المحفظة", label ? { description: label } : undefined)
          const identityRef = walletData?.identityLink?.identityRef
          if (identityRef) {
            setIsIdentityLoading(true)
            const identityResponse = await apiClient.getLinkedIdentity(identityRef)
            setIdentity(identityResponse.success ? (identityResponse.data || identityResponse.identity || null) : null)
            setIsIdentityLoading(false)
          }
        } else {
          setWallet(response.wallet)
          const label = [response.wallet?.name, response.wallet?.mobile].filter(Boolean).join(" | ")
          toast.success("تم العثور على المحفظة", label ? { description: label } : undefined)
        }
      } else {
        toast.error(response.message || "لم يتم العثور على محفظة بهذا الرقم")
      }
    } catch (err) {
      toast.error("حدث خطأ. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsLoading(false)
      setIsIdentityLoading(false)
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

        <CardContent className="space-y-3">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="flex gap-2 flex-col sm:flex-row sm:justify-start">
              <div className="flex-1 sm:flex-none sm:w-[60%] space-y-1.5">
                <Label htmlFor="mobile" className="text-right block text-xs font-medium text-muted-foreground">
                  رقم الجوال
                </Label>
                <div className="input-icon-wrapper">
                  <Smartphone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    ref={inputRef}
                    id="mobile"
                    type="tel"
                    inputMode="numeric"
                    dir="ltr"
                    placeholder="7xxxxxxxx"
                    maxLength={9}
                    pattern="7[12378][0-9]{7}"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 9))}
                    required
                    className="h-10 pr-10 pl-10"
                  />
                  {mobile && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="مسح"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground/80">9 أرقام تبدأ بـ 7</p>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !mobile.trim()}
                className="h-10 px-6 gap-2 sm:mt-[1.375rem]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>جاري البحث...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>بحث</span>
                  </>
                )}
              </Button>
            </div>
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
          <WalletView wallet={wallet} identity={identity} isIdentityLoading={isIdentityLoading} />
        </div>
      )}
    </div>
  )
}
