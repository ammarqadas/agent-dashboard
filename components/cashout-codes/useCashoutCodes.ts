"use client"

import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api"
import type { CashoutCode, Currency } from "./types"

export function useCashoutCodesList(status: string, page: number, limit: number) {
  const [data, setData] = useState<CashoutCode[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const s = status === "all" ? undefined : status
      const response = await apiClient.listCashoutCodes(s, page, limit)
      if (response.success) {
        setData(response.cashoutCodes || response.docs || [])
        setTotal(response.total || response.pagination?.total || 0)
      } else {
        setError(response.message || "فشل في تحميل الأكواد")
      }
    } catch {
      setError("حدث خطأ أثناء تحميل الأكواد")
    } finally {
      setIsLoading(false)
    }
  }, [status, page, limit])

  useEffect(() => {
    load()
  }, [load])

  return { data, total, isLoading, error, refetch: load }
}

export function useCashoutCodeSearch() {
  const [result, setResult] = useState<CashoutCode | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (code: string) => {
    setIsSearching(true)
    setError(null)
    setResult(null)
    try {
      const response = await apiClient.searchCashoutCode(code.trim())
      if (response.success) {
        setResult(response.cashoutCode)
        return true
      } else {
        setError(response.message || "كود السحب غير موجود")
        return false
      }
    } catch {
      setError("فشل البحث. يرجى المحاولة مرة أخرى.")
      return false
    } finally {
      setIsSearching(false)
    }
  }, [])

  return { result, isSearching, error, search, clearResult: () => setResult(null) }
}

export function useCashoutCodePay() {
  const [isPaying, setIsPaying] = useState(false)

  const pay = useCallback(async (code: string) => {
    setIsPaying(true)
    try {
      const response = await apiClient.payCashoutCodeGeneric(code)
      if (response.success) {
        return { success: true, message: "تم دفع كود السحب بنجاح" }
      }
      return { success: false, message: response.message || "فشل في دفع كود السحب" }
    } catch {
      return { success: false, message: "حدث خطأ أثناء دفع الكود" }
    } finally {
      setIsPaying(false)
    }
  }, [])

  return { pay, isPaying }
}

export function useCurrencies() {
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    setIsLoading(true)
    apiClient.getCurrencies().then((response) => {
      if (!mounted) return
      if (response.success && response.docs) {
        setCurrencies(response.docs)
      }
      setIsLoading(false)
    }).catch(() => {
      if (mounted) setIsLoading(false)
    })
    return () => { mounted = false }
  }, [])

  return { currencies, isLoading }
}
