import type { Metadata } from "next"
import "./globals.css"
import { DirectionProvider } from "@/components/direction-provider"

export const metadata: Metadata = {
  title: "smart agent dashboard",
  description: "A modern dashboard built with shadcn/ui",
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

