import type { Metadata } from "next"
import "./globals.css"
import { DirectionProvider } from "@/components/direction-provider"
import { BrandProvider } from "@/components/brand-provider"
import { brandAssetUrl, getBrand, themeCss } from "@/lib/branding/runtime.mjs"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand()
  return {
    title: `${brand.name.ar} - ${brand.name.en} | لوحة الوكيل`,
    description: brand.description.ar,
    icons: { icon: brandAssetUrl(brand, "favicon", "/logo.png") },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const brand = await getBrand()
  const publicBrand = {
    name: brand.name,
    logoUrl: brandAssetUrl(brand, "logo", "/logo.png"),
    darkLogoUrl: brandAssetUrl(brand, "darkLogo", brandAssetUrl(brand, "logo", "/logo.png")),
    support: brand.support,
    companyName: brand.legal.companyName,
    copyrightYear: new Date().getFullYear(),
  }
  return (
    <html lang="ar" dir="rtl">
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss(brand, "dashboard") }} />
        {brand.customCss && <link rel="stylesheet" href={`/branding/custom.css?v=${brand.revision}`} />}
      </head>
      <body>
        <BrandProvider brand={publicBrand}>
          <DirectionProvider>{children}</DirectionProvider>
        </BrandProvider>
      </body>
    </html>
  )
}
