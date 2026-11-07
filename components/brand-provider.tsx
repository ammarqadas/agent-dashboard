"use client"

import { createContext, useContext } from "react"

// Only public display fields cross the server/client boundary.
export type PublicBrand = {
  name: { ar: string; en: string }
  logoUrl: string
  darkLogoUrl: string
  support: { phone: string; email: string; website: string }
  companyName: string
  copyrightYear: number
}

const BrandContext = createContext<PublicBrand | null>(null)

export function BrandProvider({ brand, children }: { brand: PublicBrand; children: React.ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
}

export function useBrand() {
  const brand = useContext(BrandContext)
  if (!brand) throw new Error("BrandProvider is missing")
  return brand
}

export function BrandName({ language = "ar" }: { language?: "ar" | "en" }) {
  return <>{useBrand().name[language]}</>
}

export function BrandLogo({ className }: { className?: string }) {
  const brand = useBrand()
  return (
    <span className="brand-logo inline-flex shrink-0">
      <img src={brand.logoUrl} alt={brand.name.ar} className={`${className ?? ""} brand-logo-light`} />
      <img src={brand.darkLogoUrl} alt={brand.name.ar} className={`${className ?? ""} brand-logo-dark`} />
    </span>
  )
}
