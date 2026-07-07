"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Coins,
  Circle,
  LayoutDashboard,
  Search,
  UserRound,
  Wallet,
  ArrowRightLeft,
  Upload,
  ArrowRight,
  List,
  Plus,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "نظرة عامة",
    items: [{ href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard }],
  },
  {
    title: "العمليات الفردية",
    items: [
      { href: "/dashboard/wallet-search", label: "تفعيل حساب محفظة", icon: Search },
      { href: "/dashboard/deposit", label: "إيداع نقدي", icon: Wallet },
      { href: "/dashboard/remittance", label: "حوالة الى حساب", icon: ArrowRightLeft },
      { href: "/dashboard/remittance-search", label: "دفع حوالة", icon: Search },
      { href: "/dashboard/transactions", label: "كشف حساب", icon: Coins },
    ],
  },
  {
    title: "العمليات الجماعية",
    items: [
      { href: "/dashboard/deposit/bulk", label: "إيداع جماعي", icon: Upload },
      { href: "/dashboard/remittance/bulk", label: "حوالة جماعية", icon: ArrowRight },
    ],
  },
  {
    title: "أكواد السحب النقدي",
    items: [
      { href: "/dashboard/cashout-codes", label: "قائمة الأكواد", icon: List },
      { href: "/dashboard/cashout-codes/search", label: "بحث عن كود", icon: Search },
      { href: "/dashboard/cashout-codes/create", label: "إنشاء كود جديد", icon: Plus },
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

  return (
    <div className={cn("flex h-full flex-col bg-card", className)}>
      {/* Brand Header */}
      <div className="px-4 py-5">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border border-border/50 overflow-hidden">
            <img
              src="/logo.png"
              alt="شمول كاش"
              className="h-9 w-9 object-contain"
            />
          </div>
          <div className="leading-tight min-w-0">
            <div className="text-base font-bold text-foreground truncate">شمول كاش</div>
            <div className="text-xs text-muted-foreground">Shumul Cash</div>
          </div>
        </Link>
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
                const active = pathname === item.href

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
          <p className="text-xs text-muted-foreground">شمول كاش v1.0</p>
        </div>
      </div>
    </div>
  )
}