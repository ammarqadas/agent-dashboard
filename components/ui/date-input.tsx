"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

// Keep only digits and shape them into DD-MM-YYYY (max 10 chars).
function maskDateValue(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
    .filter(Boolean)
    .join("-")
}

// A complete, real calendar date typed as DD-MM-YYYY.
export function isValidDateInput(value: string): boolean {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value)
  if (!match) return false
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

// "DD-MM-YYYY" → "YYYY-MM-DD" for API payloads ("" when incomplete/invalid).
export function dateInputToISO(value: string): string {
  if (!isValidDateInput(value)) return ""
  const [day, month, year] = value.split("-")
  return `${year}-${month}-${day}`
}

// "YYYY-MM-DD" → "DD-MM-YYYY" for prefilling the input ("" when not ISO).
export function isoToDateInput(value: string | undefined | null): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""))
  if (!match) return ""
  return `${match[3]}-${match[2]}-${match[1]}`
}

// Plain masked text input — no calendar picker.
const DateInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode" | "maxLength" | "dir">
>(({ className, onChange, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      type="text"
      inputMode="numeric"
      dir="ltr"
      maxLength={10}
      placeholder="DD-MM-YYYY"
      className={cn("font-mono", className)}
      onChange={(e) => {
        e.target.value = maskDateValue(e.target.value)
        onChange?.(e)
      }}
      {...props}
    />
  )
})
DateInput.displayName = "DateInput"

export { DateInput }
