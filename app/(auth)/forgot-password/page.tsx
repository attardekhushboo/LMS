"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  GraduationCap, Loader2, AlertCircle, Sparkles, Star, CheckCircle2, 
  KeyRound, Mail, ArrowLeft, Eye, EyeOff, ShieldCheck, RefreshCw 
} from "lucide-react"

// Strength requirements check function
function checkPasswordStrength(pass: string) {
  return {
    length: pass.length >= 8,
    hasUpper: /[A-Z]/.test(pass),
    hasLower: /[a-z]/.test(pass),
    hasDigit: /\d/.test(pass),
    hasSpecial: /[@$!%*?&]/.test(pass)
  }
}

function ForgotPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // URL Pre-seed for account type
  const typeParam = searchParams.get("type") as "user" | "institution" | null
  
  // Wizard steps: 1 = Email request, 2 = Verify OTP, 3 = Reset Password, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  
  // Input fields
  const [accountType, setAccountType] = useState<"user" | "institution">(typeParam === "institution" ? "institution" : "user")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  // UI toggles
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Resend OTP countdown
  const [countdown, setCountdown] = useState(0)
  
  // States
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [autoRedirectTimer, setAutoRedirectTimer] = useState<number | null>(null)

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (autoRedirectTimer) clearTimeout(autoRedirectTimer)
    }
  }, [autoRedirectTimer])

  // Password strength score
  const strength = checkPasswordStrength(newPassword)
  const strengthScore = Object.values(strength).filter(Boolean).length

  // STEP 1: Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, accountType }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to send OTP.")
      }

      setSuccessMsg(data.message || "OTP has been sent to your registered email.")
      setStep(2)
      setCountdown(60) // 60s countdown lock
    } catch (err: any) {
      setError(err.message || "Something went wrong.")
    } finally {
      setIsLoading(false)
    }
  }

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, accountType, otp }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Invalid OTP code.")
      }

      setSuccessMsg("")
      setStep(3)
    } catch (err: any) {
      setError(err.message || "Something went wrong.")
    } finally {
      setIsLoading(false)
    }
  }

  // STEP 3: Reset & Update Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Frontend validations
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match!")
      return
    }

    if (strengthScore < 5) {
      setError("Please ensure your new password satisfies all security strength rules.")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, accountType, otp, newPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.")
      }

      setStep(4)
      
      // Auto redirect to login after 3 seconds
      const timer = window.setTimeout(() => {
        router.push("/login")
      }, 3000)
      setAutoRedirectTimer(timer as any)
    } catch (err: any) {
      setError(err.message || "Something went wrong.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-0 bg-white/80 shadow-2xl shadow-violet-500/10 backdrop-blur-lg">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-3xl font-extrabold text-gray-800">
          {step === 1 && "Reset Password"}
          {step === 2 && "Verification"}
          {step === 3 && "New Password"}
          {step === 4 && "Reset Success!"}
        </CardTitle>
        <CardDescription className="text-base text-gray-600">
          {step === 1 && "Confirm account type & email address"}
          {step === 2 && "Enter the 6-digit OTP code sent to you"}
          {step === 3 && "Establish a robust new password"}
          {step === 4 && "Your credentials have been securely refreshed"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {error && (
          <Alert variant="destructive" className="mb-5 border-rose-200 bg-rose-50 text-rose-700">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMsg && (
          <Alert className="mb-5 border-emerald-200 bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription>{successMsg}</AlertDescription>
          </Alert>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleSendOtp}
              className="space-y-5"
            >
              {/* Account Type Selection */}
              <div className="space-y-2">
                <Label className="font-semibold text-gray-700">Account Type</Label>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setAccountType("user")}
                    className={`flex-1 py-2 px-4 rounded text-sm transition-colors ${
                      accountType === "user"
                        ? "bg-violet-500 text-white font-semibold shadow-sm"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Student / Teacher
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType("institution")}
                    className={`flex-1 py-2 px-4 rounded text-sm transition-colors ${
                      accountType === "institution"
                        ? "bg-indigo-500 text-white font-semibold shadow-sm"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Institution
                  </button>
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold text-gray-700">Registered Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-11 h-12 border-2 border-violet-200 bg-white/70 text-base focus:border-violet-400 focus:ring-violet-400"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full bg-linear-to-r from-violet-500 via-pink-500 to-rose-500 text-base font-bold shadow-lg shadow-pink-500/30 transition-all hover:scale-[1.02]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  "Send OTP Code"
                )}
              </Button>
            </motion.form>
          )}

          {step === 2 && (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleVerifyOtp}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="otp" className="font-semibold text-gray-700">Enter 6-Digit OTP</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
                  <Input
                    id="otp"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    required
                    disabled={isLoading}
                    className="pl-11 h-12 border-2 border-violet-200 bg-white/70 text-base tracking-widest text-center font-bold focus:border-violet-400 focus:ring-violet-400"
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Verification OTP has been sent to <span className="font-semibold text-violet-600">{email}</span>.
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="h-12 w-full bg-linear-to-r from-violet-500 via-pink-500 to-rose-500 text-base font-bold shadow-lg shadow-pink-500/30 transition-all hover:scale-[1.02]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify OTP Code"
                )}
              </Button>

              {/* Resend OTP */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  disabled={countdown > 0 || isLoading}
                  onClick={() => handleSendOtp()}
                  className={`inline-flex items-center gap-1.5 text-sm font-bold transition-all ${
                    countdown > 0
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-violet-600 hover:text-pink-600 hover:underline"
                  }`}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  {countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP Code"}
                </button>
              </div>
            </motion.form>
          )}

          {step === 3 && (
            <motion.form
              key="step3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleResetPassword}
              className="space-y-5"
            >
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="font-semibold text-gray-700">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter robust password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pr-11 h-12 border-2 border-violet-200 bg-white/70 text-base focus:border-violet-400 focus:ring-violet-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-semibold text-gray-700">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pr-11 h-12 border-2 border-violet-200 bg-white/70 text-base focus:border-violet-400 focus:ring-violet-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Password Strength Checklist */}
              {newPassword.length > 0 && (
                <div className="rounded-xl bg-violet-50/50 p-4 border border-violet-100 text-xs space-y-2 text-gray-600">
                  <p className="font-bold text-gray-700">Password Requirements:</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${strength.length ? "bg-emerald-500" : "bg-gray-300"}`} />
                      <span className={strength.length ? "text-emerald-700 font-bold" : ""}>Min 8 characters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${strength.hasUpper ? "bg-emerald-500" : "bg-gray-300"}`} />
                      <span className={strength.hasUpper ? "text-emerald-700 font-bold" : ""}>Uppercase letter</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${strength.hasLower ? "bg-emerald-500" : "bg-gray-300"}`} />
                      <span className={strength.hasLower ? "text-emerald-700 font-bold" : ""}>Lowercase letter</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${strength.hasDigit ? "bg-emerald-500" : "bg-gray-300"}`} />
                      <span className={strength.hasDigit ? "text-emerald-700 font-bold" : ""}>One number</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${strength.hasSpecial ? "bg-emerald-500" : "bg-gray-300"}`} />
                      <span className={strength.hasSpecial ? "text-emerald-700 font-bold" : ""}>Special character</span>
                    </div>
                  </div>
                  
                  {/* Strength Bar */}
                  <div className="mt-2.5">
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          strengthScore < 3 
                            ? "bg-rose-500" 
                            : strengthScore < 5 
                              ? "bg-amber-500" 
                              : "bg-emerald-500"
                        }`}
                        style={{ width: `${(strengthScore / 5) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-gray-500 text-right">
                      {strengthScore < 3 && "Weak strength"}
                      {strengthScore >= 3 && strengthScore < 5 && "Medium strength"}
                      {strengthScore === 5 && "High security matches!"}
                    </p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || strengthScore < 5}
                className="h-12 w-full bg-linear-to-r from-violet-500 via-pink-500 to-rose-500 text-base font-bold shadow-lg shadow-pink-500/30 transition-all hover:scale-[1.02]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </motion.form>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 space-y-6"
            >
              <div className="flex justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50 shadow-lg"
                >
                  <ShieldCheck className="h-12 w-12 text-emerald-600" />
                </motion.div>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-800">Password Reset Successful</h3>
                <p className="text-sm text-gray-600">
                  You can now sign in to your NextGen LMS account using your brand new credentials.
                </p>
                <p className="text-xs text-gray-400 animate-pulse mt-2">
                  Automatically redirecting to login page in 3 seconds...
                </p>
              </div>

              <Link href="/login" className="block w-full">
                <Button className="h-12 w-full bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-base font-bold shadow-lg shadow-emerald-500/20">
                  Back to Login
                </Button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4">
      {/* Colorful Background */}
      <div className="absolute inset-0 bg-linear-to-br from-violet-100 via-pink-50 to-cyan-100" />
      
      {/* Decorative Blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-linear-to-br from-pink-300 to-rose-300 opacity-50 blur-3xl" />
        <div className="absolute -right-40 top-1/4 h-96 w-96 rounded-full bg-linear-to-br from-cyan-300 to-blue-300 opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-linear-to-br from-violet-300 to-purple-300 opacity-40 blur-3xl" />
      </div>

      {/* Floating Elements */}
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[10%] top-[20%]"
      >
        <Star className="h-8 w-8 fill-amber-400 text-amber-400 opacity-60" />
      </motion.div>
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute right-[15%] top-[30%]"
      >
        <Sparkles className="h-10 w-10 text-pink-400 opacity-60" />
      </motion.div>
      <motion.div
        animate={{ y: [0, -10, 0], rotate: [0, -10, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute bottom-[20%] left-[20%]"
      >
        <Star className="h-6 w-6 fill-cyan-400 text-cyan-400 opacity-60" />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-pink-500 shadow-xl shadow-violet-500/30">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <span className="bg-linear-to-r from-violet-600 to-pink-600 bg-clip-text text-3xl font-extrabold text-transparent">NextGen School</span>
        </Link>

        {/* Suspense Boundary for useSearchParams */}
        <Suspense fallback={
          <Card className="border-0 bg-white/80 shadow-2xl backdrop-blur-lg p-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-violet-500" />
          </Card>
        }>
          <ForgotPasswordContent />
        </Suspense>

        <div className="mt-6 text-center">
          <Link href="/login" className="inline-flex items-center gap-2 font-bold text-violet-600 hover:text-pink-600 hover:underline text-sm transition-all">
            <ArrowLeft className="h-4 w-4" />
            Back to Login Screen
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
