"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { apiClient } from "@/lib/api"
import { Mail, Lock, Loader2 } from "lucide-react"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await apiClient.agentLogin(email, password)

      if (response.success) {
        localStorage.setItem("isAuthenticated", "true")
        localStorage.setItem("agentUser", JSON.stringify(response.user || response.data))
        router.push("/dashboard")
      } else {
        setError(response.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة")
      }
    } catch (err) {
      setError("حدث خطأ. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full border-0 shadow-2xl bg-white/95 backdrop-blur rounded-2xl overflow-hidden">
      {/* Top accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-[hsl(178,72%,28%)] via-[hsl(186,70%,38%)] to-[hsl(46,85%,45%)]" />

      <CardHeader className="space-y-1 pb-4 pt-6">
        <CardTitle className="text-2xl text-center font-bold text-foreground">تسجيل الدخول</CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          أدخل بيانات حسابك للدخول إلى لوحة التحكم
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5">
          <div className="space-y-4">
            {/* Email field with icon */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-right block text-sm font-medium">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                  className="h-11 pr-10 bg-muted/30 border-0 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Password field with icon */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-right block text-sm font-medium">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10 bg-muted/30 border-0 focus:bg-white transition-colors"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-center">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="pb-6 pt-2">
          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[hsl(178,72%,28%)] to-[hsl(186,70%,38%)] hover:from-[hsl(178,72%,23%)] hover:to-[hsl(186,70%,33%)] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-70"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري الدخول...</span>
              </div>
            ) : (
              "دخول"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}