"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Barcode,
  Coins,
  Circle,
  LayoutDashboard,
  Search,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
}

const NAV: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "نظرة عامة",
    items: [{ href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "المحافظ",
    items: [
      { href: "/dashboard/wallet-search", label: "بحث عن محفظة", icon: Search },
      { href: "/dashboard/deposit", label: "إيداع", icon: Wallet },
    ],
  },
  {
    title: "العمليات",
    items: [
      { href: "/dashboard/cashout-codes", label: "أكواد السحب", icon: Barcode },
      { href: "/dashboard/transactions", label: "سجل العمليات", icon: Coins },
    ],
  },
  {
    title: "الحساب",
    items: [{ href: "/dashboard/account", label: "حسابي", icon: UserRound }],
  },
]

export function SidebarNav({
  className,
  onNavigate,
}: {
  className?: string
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const BrandIcon = ShieldCheck || Circle

  return (
    <div className={cn("flex h-full flex-col bg-card", className)}>
      {/* Brand Header */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-600 text-white shadow-lg shadow-primary/25">
            <BrandIcon className="h-6 w-6" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold">لوحة الوكيل</div>
            <div className="text-xs text-muted-foreground">إدارة العمليات</div>
          </div>
        </div>
      </div>

      <Separator className="mx-4" />

      {/* Navigation */}
      <nav className="flex-1 overflow-auto px-3 py-4">
        {NAV.map((group, idx) => (
          <div key={group.title} className={cn(idx > 0 && "mt-6")}>
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
              {group.title}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname?.startsWith(item.href)

                const Icon = item.icon || Circle

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active && "text-primary-foreground")} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t">
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground">الإصدار 1.0</p>
        </div>
      </div>
    </div>
  )
}


