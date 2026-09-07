import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(d: Date) {
  try {
    return new Intl.DateTimeFormat("ar-YE-u-nu-latn", { dateStyle: "medium" }).format(d)
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

export function formatTime(d: Date) {
  try {
    return new Intl.DateTimeFormat("ar-YE-u-nu-latn", { timeStyle: "medium" }).format(d)
  } catch {
    return d.toISOString().slice(11, 19)
  }
}

// Compact, locale-stable timestamp for printed receipts. English 24-hour
// output avoids Arabic AM/PM text crowding the agent name in narrow footers.
export function formatReceiptTimestamp(d: Date) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .format(d)
      .replace(",", " ·")
  } catch {
    return d.toISOString().replace("T", " · ").slice(0, 21)
  }
}

export function pickString(obj: unknown, keys: string[]): string | undefined {
  if (typeof obj !== "object" || obj === null) return undefined
  const record = obj as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value)
    }
  }
  return undefined
}

