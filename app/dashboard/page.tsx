import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Search, Wallet, Coins, Receipt, User, ArrowLeft, Info } from "lucide-react"

const quickActions = [
  {
    title: "بحث عن محفظة",
    description: "البحث عن المحافظ برقم الجوال",
    icon: Search,
    href: "/dashboard/wallet-search",
    color: "from-emerald-500 to-teal-600",
  },
  {
    title: "إيداع رصيد",
    description: "إيداع مبلغ إلى محفظة العميل",
    icon: Wallet,
    href: "/dashboard/deposit",
    color: "from-sky-500 to-blue-600",
  },
  {
    title: "أكواد السحب",
    description: "إنشاء ودفع أكواد السحب",
    icon: Coins,
    href: "/dashboard/cashout-codes",
    color: "from-amber-500 to-orange-600",
  },
  {
    title: "المعاملات",
    description: "متابعة سجل المعاملات",
    icon: Receipt,
    href: "/dashboard/transactions",
    color: "from-violet-500 to-purple-600",
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-l from-primary/5 via-transparent to-transparent rounded-2xl" />
        <div className="py-6 px-2">
          <h1 className="text-4xl font-bold text-gradient mb-2">مرحباً بك</h1>
          <p className="text-lg text-muted-foreground">
            لوحة تحكم الوكيل - إدارة المحافظ والمعاملات
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-5 w-5 text-primary" />
        <AlertTitle className="text-base font-bold">نصائح سريعة</AlertTitle>
        <AlertDescription className="mt-2 text-sm leading-relaxed">
          <ul className="space-y-1 list-disc list-inside marker:text-primary">
            <li>استخدم <strong className="text-foreground">أكواد السحب</strong> لإنشاء كود للعميل أو دفع كود موجود</li>
            <li>استخدم <strong className="text-foreground">بحث عن محفظة</strong> للبحث برقم الجوال ثم تحديث الهوية أو الإيداع</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="section-title mb-4">إجراءات سريعة</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="group card-hover h-full cursor-pointer overflow-hidden">
                <CardContent className="p-0">
                  {/* Gradient header */}
                  <div className={`h-2 bg-gradient-to-l ${action.color}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`icon-container bg-gradient-to-br ${action.color} text-white`}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      <ArrowLeft className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity -rotate-45" />
                    </div>
                    <h3 className="text-lg font-bold mb-1">{action.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {action.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Account Link */}
      <div>
        <h2 className="section-title mb-4">الحساب</h2>
        <Link href="/dashboard/account">
          <Card className="card-hover cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="icon-container">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">معلومات الحساب</h3>
                <p className="text-sm text-muted-foreground">عرض بيانات الوكيل والأرصدة</p>
              </div>
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
