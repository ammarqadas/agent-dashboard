"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api"
import { User, Mail, Shield, Hash, Wallet, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AgentAccount() {
  const [agentInfo, setAgentInfo] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [currencyMap, setCurrencyMap] = useState<Record<string, string>>({})

  useEffect(() => {
    loadCurrencies()
    loadAgentData()
  }, [])

  const loadCurrencies = async () => {
    try {
      const response = await apiClient.getCurrencies()
      if (response.success) {
        const list = (response.data || response.currencies || response.docs || []) as any[]
        const map: Record<string, string> = {}
        list.forEach((c: any) => {
          const idKey = c.id != null ? String(c.id) : undefined
          const code = c.code || c.symbol || c.name || (idKey ? `#${idKey}` : "")
          if (idKey && code) {
            map[idKey] = code
          }
        })
        setCurrencyMap(map)
      }
    } catch (err) {
      console.error("Failed to load currencies for agent accounts:", err)
    }
  }

  const loadAgentData = async () => {
    setIsLoading(true)
    setError("")
    try {
      const accountResponse = await apiClient.getAgentAccount()

      const stored = JSON.parse(localStorage.getItem("agentUser") || "{}")
      setAgentInfo(stored)

      if (accountResponse.success) {
        setAccounts(accountResponse.docs || accountResponse.data || [])
      }
    } catch (err) {
      console.error("Failed to load agent data:", err)
      setError("فشل في تحميل بيانات الحساب")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">جاري تحميل بيانات الحساب...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
          <p className="text-destructive font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={loadAgentData}>
            إعادة المحاولة
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold mb-1">حساب الوكيل</h1>
        <p className="text-sm text-muted-foreground">معلومات الحساب والأرصدة</p>
      </div>

      {/* Agent Info Card - minimal */}
      <Card className="rounded-xl border border-border/60">
        <CardContent className="p-5">
          <h2 className="section-title mb-4">معلومات الوكيل</h2>
          
          {agentInfo ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="field-group flex items-center gap-3">
                <div className="icon-container shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">الاسم</p>
                  <p className="text-sm font-semibold truncate">{agentInfo.name || "غير متوفر"}</p>
                </div>
              </div>

              <div className="field-group flex items-center gap-3">
                <div className="icon-container shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                  <p className="text-sm font-semibold truncate" dir="ltr">{agentInfo.email || "غير متوفر"}</p>
                </div>
              </div>

              <div className="field-group flex items-center gap-3">
                <div className="icon-container shrink-0">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">نوع الحساب</p>
                  <Badge variant="outline" className="mt-1">
                    {agentInfo.type === "agent" ? "وكيل" : agentInfo.type || "وكيل"}
                  </Badge>
                </div>
              </div>

              <div className="field-group flex items-center gap-3">
                <div className="icon-container shrink-0">
                  <Hash className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">معرف الوكيل</p>
                  <p className="text-sm font-mono font-semibold" dir="ltr">{agentInfo.id || "غير متوفر"}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد معلومات متاحة</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Accounts/Balances - minimal */}
      <Card className="rounded-xl border border-border/60">
        <CardContent className="p-5">
          <h2 className="section-title mb-4">أرصدة الوكيل</h2>
          
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد حسابات</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account: any) => {
                const currencyObj = account.currency
                let currencyCode: string | null = null
                let currencyName: string | null = null

                if (currencyObj && typeof currencyObj === "object") {
                  const idKey = currencyObj.id != null ? String(currencyObj.id) : undefined
                  const mapped = idKey ? currencyMap[idKey] : undefined
                  currencyCode = mapped || currencyObj.code || currencyObj.symbol || (idKey ? `#${idKey}` : null)
                  currencyName = currencyObj.name || null
                } else if (currencyObj != null) {
                  const key = String(currencyObj)
                  currencyCode = currencyMap[key] || key
                }

                return (
                  <div 
                    key={account.id} 
                    className="stat-card"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="icon-container">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <Badge 
                        variant="outline"
                        className={account.active ? "badge-success" : "bg-muted text-muted-foreground"}
                      >
                        {account.active ? "نشط" : "غير نشط"}
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      <div>
                        <p className="text-xs text-muted-foreground">اسم الحساب</p>
                        <p className="text-sm font-semibold">{account.name || "حساب"}</p>
                      </div>

                      <div className="pt-2 border-t border-border/60">
                        <p className="text-xs text-muted-foreground mb-1">الرصيد</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-bold text-primary" dir="ltr">
                            {Number(account.balance || 0).toLocaleString("en-US")}
                          </span>
                          {currencyCode && (
                            <span className="text-xs font-medium text-muted-foreground" dir="ltr">
                              {currencyCode}
                            </span>
                          )}
                        </div>
                        {currencyName && (
                          <p className="text-xs text-muted-foreground mt-1">{currencyName}</p>
                        )}
                      </div>

                      {account.code && (
                        <div className="pt-2 border-t border-border/60">
                          <p className="text-xs text-muted-foreground">كود الحساب</p>
                          <p className="font-mono text-xs" dir="ltr">{account.code}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={loadAgentData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          تحديث البيانات
        </Button>
      </div>
    </div>
  )
}
