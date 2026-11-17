export type AgentPermission =
  | "activateCustomerWallet"
  | "allowSendRemittance"
  | "allowWalletDeposit"
  | "allowBankDeposit"
  | "allowCashoutCode"

export type AgentPermissions = Partial<Record<AgentPermission, boolean>>

const operationRoutes: Array<{ path: string; permission: AgentPermission }> = [
  { path: "/dashboard/wallet-create", permission: "activateCustomerWallet" },
  { path: "/dashboard/wallet-search", permission: "activateCustomerWallet" },
  { path: "/dashboard/wallet", permission: "activateCustomerWallet" },
  { path: "/dashboard/remittance-search", permission: "allowSendRemittance" },
  { path: "/dashboard/remittance", permission: "allowSendRemittance" },
  { path: "/dashboard/deposit", permission: "allowWalletDeposit" },
  { path: "/dashboard/bank-deposit", permission: "allowBankDeposit" },
  { path: "/dashboard/cashout-codes", permission: "allowCashoutCode" },
]

export function canAccessAgentRoute(path: string, permissions: AgentPermissions): boolean {
  const route = operationRoutes.find(({ path: prefix }) => path === prefix || path.startsWith(`${prefix}/`))
  return !route || permissions[route.permission] === true
}

export function readAgentPermissions(user: unknown): AgentPermissions {
  if (!user || typeof user !== "object") return {}
  const profile = user as Record<string, unknown>
  return Object.fromEntries(operationRoutes.map(({ permission }) => [permission, profile[permission] === true]))
}
