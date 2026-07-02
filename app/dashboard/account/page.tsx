import { AgentAccount } from "@/components/agent-account"

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">حسابي</h2>
        <p className="text-muted-foreground">
          عرض معلومات حساب الوكيل والأرصدة
        </p>
      </div>
      <AgentAccount />
    </div>
  )
}
