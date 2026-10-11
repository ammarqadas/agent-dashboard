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
