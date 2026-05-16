"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { AlertCircle, GraduationCap, Loader2, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        role: "admin",
        redirect: false,
      })

      if (result?.ok) {
        router.push("/admin")
      } else {
        setError("Invalid admin credentials. Please try again.")
      }
    } catch (err) {
      setError("An error occurred during sign in. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-red-50 via-slate-50 to-orange-50">
      {/* Background Effects */}
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-red-200/20 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-orange-200/20 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12"
      >
        <Link href="/login" className="mb-8 flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-red-500 to-orange-500 shadow-xl shadow-red-500/30">
            <ShieldAlert className="h-8 w-8 text-white" />
          </div>
          <span className="bg-linear-to-r from-red-600 to-orange-600 bg-clip-text text-3xl font-extrabold text-transparent">
            NextGen Admin
          </span>
        </Link>

        <Card className="border-0 bg-white/80 shadow-2xl shadow-red-500/10 backdrop-blur-lg w-full max-w-md">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-extrabold text-gray-800">Admin Portal</CardTitle>
            <CardDescription className="text-base text-gray-600">Secure administrator access</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="border-rose-200 bg-rose-50 text-rose-700">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold text-gray-700">Admin Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@nextgenschool.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 border-2 border-red-200 bg-white/70 text-base focus:border-red-400 focus:ring-red-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-semibold text-gray-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 border-2 border-red-200 bg-white/70 text-base focus:border-red-400 focus:ring-red-400"
                />
              </div>

              <Button
                type="submit"
                className="h-12 w-full bg-linear-to-r from-red-500 via-orange-500 to-red-600 text-base font-bold shadow-lg shadow-red-500/30 transition-all hover:scale-[1.02] hover:shadow-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In as Admin"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <span className="text-gray-600">Not an admin? </span>
              <Link href="/login" className="font-bold text-red-600 hover:text-orange-600 hover:underline">
                Go back to main login
              </Link>
            </div>

            <div className="mt-6 rounded-2xl bg-linear-to-r from-red-50 to-orange-50 p-5 ring-1 ring-red-200/50">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-gray-700 mb-2">Demo Admin Account:</p>
                  <div className="space-y-1.5 text-sm text-gray-600">
                    <p><span className="font-semibold text-red-600">Email:</span> admin@nextgenschool.com</p>
                    <p><span className="font-semibold text-red-600">Password:</span> demo123</p>
                    <p className="text-xs text-gray-500 mt-3">Full access to admin dashboard, user management, course approvals, and system settings.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-sm text-gray-600 max-w-md">
          This portal is restricted to authorized administrators only. Unauthorized access is prohibited.
        </p>
      </motion.div>
    </div>
  )
}
