import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Wallet, Coins, Receipt, User, ArrowLeft, ArrowRightLeft, TrendingUp, CreditCard, UserPlus } from "lucide-react"

const quickActions = [
  {
    title: "تفعيل حساب محفظة",
    description: "بحث برقم الموبايل وتفعيل حساب المحفظة",
    icon: Search,
    href: "/dashboard/wallet-search",
  },
  {
    title: "إنشاء محفظة",
    description: "إنشاء محفظة جديدة للعميل",
    icon: UserPlus,
    href: "/dashboard/wallet-create",
  },
  {
    title: "إيداع نقدي",
    description: "إيداع نقدي إلى محفظة العميل",
    icon: Wallet,
    href: "/dashboard/deposit",
  },
  {
    title: "حوالة الى حساب ",
    description: "حوالة مالية  الى حساب  ",
    icon: ArrowRightLeft,
    href: "/dashboard/remittance",
  },
  {
    title: "سحب نقدي ",
    description: "سحب نقدي بكود السحب اوانشاء كود جديد",
    icon: Coins,
    href: "/dashboard/cashout-codes",
  },
  {
    title: "كشف حساب",
    description: "سجل العمليات المالية",
    icon: Receipt,
    href: "/dashboard/transactions",
  },
]

const stats = [
  { label: "إجمالي العمليات", value: "—", icon: TrendingUp },
  { label: "أكواد السحب", value: "—", icon: Coins },
  { label: "المحافظ", value: "—", icon: Wallet },
  { label: "الأرصدة", value: "—", icon: CreditCard },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome Header - minimal */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مرحباً بك</h1>
          <p className="text-sm text-muted-foreground mt-1">
            لوحة تحكم الوكيل - إدارة المحافظ والمعاملات المالية
          </p>
        </div>
        <div className="hidden md:flex h-12 w-12 rounded-xl bg-primary/10 items-center justify-center">
          <img src="/logo.png" alt="شمول كاش" className="h-8 w-8 object-contain" />
        </div>
      </div>

      {/* Stat Cards - minimal */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="dash-stat-card">
            <div className="flex items-center gap-3">
              <div className="icon-container shrink-0">
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Grid - minimal */}
      <div>
        <h2 className="section-title mb-3">إجراءات سريعة</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="group card-hover h-full cursor-pointer rounded-xl border border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="icon-container">
                      <action.icon className="h-5 w-5" />
                    </div>
                    <ArrowLeft className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 -rotate-45" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1">{action.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {action.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Account Link - minimal */}
      <div>
        <h2 className="section-title mb-3">الحساب</h2>
        <Link href="/dashboard/account">
          <Card className="card-hover cursor-pointer rounded-xl border border-border/60">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="icon-container">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold">معلومات الحساب</h3>
                <p className="text-xs text-muted-foreground">عرض بيانات الوكيل والأرصدة</p>
              </div>
              <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
