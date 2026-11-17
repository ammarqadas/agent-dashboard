export type PresubmitConfirmationRow = { key: string; label: string; value: string }

const labels: Record<string, string> = {
  status: "حالة الحساب",
  currency: "العملة",
  currencyCode: "رمز العملة",
  receiverName: "اسم المستفيد",
  accountName: "اسم الحساب",
  bankAccountName: "اسم الحساب البنكي",
  bankAccount: "الحساب البنكي",
  branchName: "الفرع",
  amount: "المبلغ",
  commission: "الرسوم",
  totalCommission: "إجمالي الرسوم",
  totalAmount: "الإجمالي المخصوم",
}

function isPublicField(key: string): boolean {
  return !key.startsWith("_") && !["success", "data", "httpStatus", "code", "message"].includes(key)
    && !/token|password|secret|authorization/i.test(key)
}

export function getPresubmitConfirmationRows(data: Record<string, unknown>, mappedFields: unknown = data._mappedFields): PresubmitConfirmationRow[] {
  const keys = Array.isArray(mappedFields) ? mappedFields.filter((key): key is string => typeof key === "string") : Object.keys(data)
  return Array.from(new Set(keys)).filter(isPublicField).flatMap((key) => {
    if (!Object.prototype.hasOwnProperty.call(data, key)) return []
    const value = data[key]
    if (value == null || value === "") return []
    let text: string
    if (typeof value === "boolean") text = value ? "نعم" : "لا"
    else if (typeof value === "object") text = JSON.stringify(value, (nestedKey, nestedValue) => !nestedKey || isPublicField(nestedKey) ? nestedValue : undefined)
    else text = String(value)
    if (key === "status" && text.toLowerCase() === "active") text = "نشط"
    return [{ key, label: labels[key] || key, value: text }]
  })
}
