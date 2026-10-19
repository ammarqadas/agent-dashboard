// Calendar dates from the identity service are midnight in Yemen (UTC+3),
// even when serialized as a UTC timestamp. Do not use the UTC date prefix.
export function identityDateToInput(value: string | undefined | null): string {
  let text = String(value || "").trim()
  if (/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
    const date = new Date(text)
    if (Number.isNaN(date.getTime())) return ""
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Aden", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(date)
    const part = (name: string) => parts.find(p => p.type === name)?.value || ""
    text = `${part("year")}-${part("month")}-${part("day")}`
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : ""
}

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

export function dateInputToISO(value: string): string {
  if (!isValidDateInput(value)) return ''
  const [day, month, year] = value.split('-')
  return `${year}-${month}-${day}`
}
