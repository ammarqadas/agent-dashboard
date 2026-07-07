export interface CashoutCode {
  id: string | number
  code: string
  amount: number
  currency: Currency | string
  status: "pending" | "paid" | "expired"
  wallet: Wallet | string
  createdAt: string
  expiresAt?: string
}

export interface Currency {
  id: string | number
  code: string
  name: string
  symbol?: string
}

export interface Wallet {
  id: string | number
  name?: string
  mobile?: string
}
