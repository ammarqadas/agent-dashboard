"use client"

import { createContext, useContext } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { canAccessAgentRoute, type AgentPermissions } from "@/lib/agent-permissions"

const AgentPermissionsContext = createContext<AgentPermissions | null>(null)

export const AgentPermissionsProvider = AgentPermissionsContext.Provider

export function useAgentAccess() {
  const permissions = useContext(AgentPermissionsContext)
  return {
    ready: permissions !== null,
    canAccess: (path: string) => permissions !== null && canAccessAgentRoute(path, permissions),
  }
}

export function AgentPageAccess({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { ready, canAccess } = useAgentAccess()

  if (!ready) return <p role="status" className="py-8 text-center text-sm text-muted-foreground">جاري تحميل صلاحيات الحساب...</p>
  if (!canAccess(pathname)) {
    return (
      <div role="alert" className="rounded-xl border bg-card p-6 text-center space-y-3">
        <h2 className="text-lg font-bold">لا تملك صلاحية الوصول لهذه الصفحة</h2>
        <p className="text-sm text-muted-foreground">هذه العملية غير متاحة لحسابك. يرجى التواصل مع الإدارة لتحديث الصلاحيات.</p>
        <Link href="/dashboard" className="inline-block text-sm font-medium text-primary hover:underline">العودة إلى لوحة التحكم</Link>
      </div>
    )
  }
  return <>{children}</>
}
