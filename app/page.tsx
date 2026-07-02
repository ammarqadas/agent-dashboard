"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/login-form"
import { Phone } from "lucide-react"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is already authenticated
    const isAuthenticated = localStorage.getItem("isAuthenticated")
    if (isAuthenticated === "true") {
      router.push("/dashboard")
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden">
      {/* Brand gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(178,72%,28%)] via-[hsl(186,70%,38%)] to-[hsl(46,60%,45%)]" />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Decorative shapes */}
      <div className="absolute top-20 right-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute bottom-20 left-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute top-1/2 left-1/4 h-40 w-40 rounded-full bg-white/3 blur-2xl" />

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-black/20 to-transparent" />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo & Brand */}
        <div className="flex flex-col items-center mb-10">
          <div className="h-25 w-25 rounded-2xl bg-white shadow-2xl flex items-center justify-center mb-5 ring-4 ring-white/20">
            <img
              src="/logo.png"
              alt="شمول كاش"
              className="h-20 w-20 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">شمول كاش</h1>
          <p className="text-sm text-white/80 mt-2 font-medium">Shumul Cash Agent Portal</p>
          <p className="text-xs text-white/60 mt-1">لوحة تحكم الوكيل</p>
        </div>

      

        <LoginForm />

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 text-white/60 text-xs">
            <Phone className="h-3 w-3" />
            <span>+967 778 825 844</span>
          </div>
          <p className="text-white/40 text-xs mt-2">جميع الحقوق محفوظة لشمول كاش © 2026</p>
        </div>
      </div>
    </div>
  )
}