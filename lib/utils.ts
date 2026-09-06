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


