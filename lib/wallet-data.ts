import { dateInputToISO } from './identity-date'

export const PERSONAL_ATTRIBUTES = {
  placeOfBirth: 'مكان الميلاد',
  email: 'البريد الإلكتروني',
  educationLevel: 'المستوى التعليمي',
  maritalStatus: 'الحالة الاجتماعية',
  emergencyContact: 'جهة اتصال للطوارئ',
  occupation: 'المهنة',
  monthlyIncome: 'الدخل الشهري',
  employer: 'جهة العمل',
  workPhone: 'هاتف العمل',
} as const

export type PersonalAttribute = keyof typeof PERSONAL_ATTRIBUTES
export type PersonalFields = {
  fullName: string
  address: string | null
  gender: 'male' | 'female' | null
  dateOfBirth: string | null
  attributes: Partial<Record<PersonalAttribute, string>>
}
export type WalletPersonalData = {
  walletId: string
  mobile: string
  active: boolean
  status: 'pending' | 'verified' | 'rejected'
  personalData: PersonalFields
}
export type PersonalDataPatch = Partial<Omit<PersonalFields, 'attributes'>> & {
  attributes?: Partial<Record<PersonalAttribute, string>>
}
export type PersonalDataForm = {
  fullName: string
  address: string
  gender: string
  dateOfBirth: string
  attributes: Partial<Record<PersonalAttribute, string>>
}
export type DocumentForm = { idNumber: string; idIssueDate: string; expdate: string; idIssuePlace: string }
export type DocumentPatch = Partial<DocumentForm> & { documentRef?: string }
export type WalletIdentityForm = DocumentForm & {
  fullName: string
  address: string
  gender: string
  dateOfBirth: string
  type: 'national' | 'passport'
}

/** Fields for the single multipart wallet save; references stay on the server. */
export function walletIdentitySaveFields(before: WalletIdentityForm, after: WalletIdentityForm, options: {
  hasIdentity: boolean
  hasDocument: boolean
  hasImages: boolean
}): Record<string, string> {
  const fields: Record<string, string> = {}
  const personal = personalDataPatch({ ...before, attributes: {} }, { ...after, attributes: {} })
  for (const [key, value] of Object.entries(personal)) if (typeof value === 'string') fields[key] = value
  const document = documentMetadataPatch(before, after)
  Object.assign(fields, document)
  if (!options.hasIdentity) {
    if (after.fullName.trim().length < 2) throw new Error('أدخل الاسم الكامل')
    fields.fullName = after.fullName.trim()
    if (!options.hasImages) throw new Error('ارفع صورتي الوجه الأمامي والخلفي لتسجيل الهوية')
  }
  const typeChanged = before.type !== after.type
  if (!options.hasImages && (typeChanged || (!options.hasDocument && Object.keys(document).length))) {
    throw new Error('إنشاء وثيقة أو تغيير نوعها يتطلب رفع صورتي الوجه الأمامي والخلفي')
  }
  if (options.hasImages) {
    if (!after.idNumber.trim()) throw new Error('أدخل رقم الوثيقة')
    const issue = dateInputToISO(after.idIssueDate)
    const expiry = dateInputToISO(after.expdate)
    if (!issue || !expiry) throw new Error('أدخل تاريخي الإصدار والانتهاء الصحيحين بصيغة DD-MM-YYYY')
    if (expiry < issue) throw new Error('تاريخ الانتهاء يجب ألا يسبق تاريخ الإصدار')
    Object.assign(fields, { type: after.type, idNumber: after.idNumber.trim(), idIssueDate: issue, expdate: expiry })
    if (after.idIssuePlace.trim()) fields.idIssuePlace = after.idIssuePlace.trim()
  }
  return fields
}

function changedText(before: string, after: string, label: string, max: number): string | undefined {
  if (before.trim() === after.trim()) return undefined
  if (!after.trim()) throw new Error(`لا يمكن حذف ${label} المسجل؛ أدخل قيمة بديلة`)
  if (after.trim().length > max) throw new Error(`${label}: الحد الأقصى ${max} حرفاً`)
  return after.trim()
}

function changedDate(before: string, after: string, label: string): string | undefined {
  const value = changedText(before, after, label, 10)
  if (value === undefined) return undefined
  const iso = dateInputToISO(value)
  if (!iso) throw new Error(`${label} غير مكتمل أو غير صالح؛ استخدم DD-MM-YYYY`)
  return iso
}

export function personalDataPatch(before: PersonalDataForm, after: PersonalDataForm): PersonalDataPatch {
  const patch: PersonalDataPatch = {}
  const fullName = changedText(before.fullName, after.fullName, 'الاسم الكامل', 200)
  const address = changedText(before.address, after.address, 'العنوان', 500)
  const gender = changedText(before.gender, after.gender, 'الجنس', 10)
  const dateOfBirth = changedDate(before.dateOfBirth, after.dateOfBirth, 'تاريخ الميلاد')
  if (fullName !== undefined) patch.fullName = fullName
  if (address !== undefined) patch.address = address
  if (gender !== undefined) {
    if (gender !== 'male' && gender !== 'female') throw new Error('اختر الجنس')
    patch.gender = gender
  }
  if (dateOfBirth !== undefined) {
    if (new Date(`${dateOfBirth}T00:00:00`) > new Date()) throw new Error('تاريخ الميلاد لا يمكن أن يكون في المستقبل')
    patch.dateOfBirth = dateOfBirth
  }
  for (const key of Object.keys(PERSONAL_ATTRIBUTES) as PersonalAttribute[]) {
    const value = changedText(before.attributes[key] || '', after.attributes[key] || '', PERSONAL_ATTRIBUTES[key], 500)
    if (value !== undefined) (patch.attributes ??= {})[key] = value
  }
  return patch
}

export function documentMetadataPatch(before: DocumentForm, after: DocumentForm): DocumentPatch {
  const patch: DocumentPatch = {}
  const idNumber = changedText(before.idNumber, after.idNumber, 'رقم الوثيقة', 100)
  const idIssuePlace = changedText(before.idIssuePlace, after.idIssuePlace, 'مكان الإصدار', 200)
  const idIssueDate = changedDate(before.idIssueDate, after.idIssueDate, 'تاريخ الإصدار')
  const expdate = changedDate(before.expdate, after.expdate, 'تاريخ الانتهاء')
  if (idNumber !== undefined) patch.idNumber = idNumber
  if (idIssuePlace !== undefined) {
    if (idIssuePlace.length < 2) throw new Error('مكان الإصدار يجب أن يتكون من حرفين على الأقل')
    patch.idIssuePlace = idIssuePlace
  }
  if (idIssueDate !== undefined) patch.idIssueDate = idIssueDate
  if (expdate !== undefined) patch.expdate = expdate
  const issue = dateInputToISO(after.idIssueDate)
  const expiry = dateInputToISO(after.expdate)
  if (issue && expiry && expiry < issue) throw new Error('تاريخ الانتهاء يجب ألا يسبق تاريخ الإصدار')
  return patch
}
