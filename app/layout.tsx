import type { Metadata } from "next"
import "./globals.css"
import { DirectionProvider } from "@/components/direction-provider"

export const metadata: Metadata = {
  title: "شمول كاش - Shumul Cash | لوحة الوكيل",
  description: "لوحة تحكم وكلاء شمول كاش - إدارة المحافظ والمعاملات",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <DirectionProvider>{children}</DirectionProvider>
      </body>
    </html>
  )
}

