"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, LogOut, User } from "lucide-react"

// Route titles mapping
const routeTitles: Record<string, string> = {
  "/dashboard": "لوحة التحكم",
  "/dashboard/wallet-search": "بحث عن محفظة",
  "/dashboard/deposit": "إيداع",
  "/dashboard/cashout-codes": "أكواد السحب",
  "/dashboard/transactions": "المعاملات",
  "/dashboard/account": "حسابي",
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [agentName, setAgentName] = useState<string>("")
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    // Check authentication
    const isAuthenticated = localStorage.getItem("isAuthenticated")
    if (isAuthenticated !== "true") {
      router.push("/")
      return
    }
    
    // Get agent name from localStorage
    try {
      const agentUser = JSON.parse(localStorage.getItem("agentUser") || "{}")
      setAgentName(agentUser.name || "وكيل")
    } catch {
      setAgentName("وكيل")
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("agentToken")
    localStorage.removeItem("agentUser")
    apiClient.clearToken()
    router.push("/")
  }

  // Get current page title
  const currentTitle = Object.entries(routeTitles).find(([path]) => 
    pathname === path || (path !== "/dashboard" && pathname?.startsWith(path))
  )?.[1] || "لوحة الوكيل"

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen w-full">
        {/* Desktop sidebar */}
        <aside className="hidden w-72 border-l bg-card md:flex md:flex-col shadow-sm">
          <SidebarNav className="h-full" />
        </aside>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <div className="flex h-16 items-center gap-4 px-4 md:px-6">
              {/* Mobile sidebar toggle */}
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">القائمة</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="p-0 w-72">
                  <SidebarNav className="h-full" onNavigate={() => setSheetOpen(false)} />
                </SheetContent>
              </Sheet>

              {/* Page title */}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold truncate">{currentTitle}</h1>
              </div>

              {/* User info & Logout */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{agentName}</span>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout} 
                  className="gap-2 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">خروج</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Main content area */}
          <main className="flex-1 py-4 px-2 md:py-6 md:px-3 lg:py-8 lg:px-4">
            <div className="mx-auto max-w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
