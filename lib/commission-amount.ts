import type { AgentCommissionGroup } from "@/lib/api"

// Ledger amounts have up to eight decimal places; sum them without floating-point rounding.
export function sumCommissionAmounts(groups: AgentCommissionGroup[]): string {
  const scale = BigInt(100000000)
  const total = groups.reduce((sum, group) => {
    const value = group.total.trim()
    const negative = value.startsWith("-")
    const [whole, fraction = ""] = value.replace(/^[+-]/, "").split(".")
    const units = BigInt(whole || "0") * scale + BigInt(fraction.padEnd(8, "0"))
    return sum + (negative ? -units : units)
  }, BigInt(0))
  const negative = total < BigInt(0)
  const absolute = negative ? -total : total
  return `${negative ? "-" : ""}${absolute / scale}.${(absolute % scale).toString().padStart(8, "0")}`.replace(/0+$/, "").replace(/\.$/, "")
}
