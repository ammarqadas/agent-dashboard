import { AgentAccount } from "@/components/agent-account"

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Account</h2>
        <p className="text-muted-foreground">
          View your agent account information and balances
        </p>
      </div>
      <AgentAccount />
    </div>
  )
}


