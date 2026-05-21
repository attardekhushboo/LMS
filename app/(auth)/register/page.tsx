"use client"

import { Suspense, useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GraduationCap, Loader2, AlertCircle, CheckCircle, Sparkles, Star, Rocket, Building2, BookOpen, KeyRound, Mail, ArrowLeft } from "lucide-react"

interface Institute {
  id: string
  name: string
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultRole = searchParams.get("role") || "student"
  
  // Registration form fields
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState(defaultRole)
  const [instituteId, setInstituteId] = useState("")
  const [userClass, setUserClass] = useState("")
  const [institutes, setInstitutes] = useState<Institute[]>([])
  
  // Flow controls
  const [step, setStep] = useState<"register" | "verify" | "success">("register")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // OTP inputs
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""))
  const [otpError, setOtpError] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [requiresApproval, setRequiresApproval] = useState(false)
  const [successCountdown, setSuccessCountdown] = useState(5)

  // Ref container for OTP input boxes focus
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Fetch institutions
  useEffect(() => {
    async function fetchInstitutes() {
      try {
        const res = await fetch("/api/institutes")
        if (res.ok) {
          const data = await res.json()
          setInstitutes(data)
        }
      } catch (err) {
        console.error("Failed to fetch institutes:", err)
      }
    }
    fetchInstitutes()
  }, [])

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return
    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCountdown])

  // Success screen automatic redirect timer
  useEffect(() => {
    if (step !== "success" || successCountdown <= 0) return
    const timer = setInterval(() => {
      setSuccessCountdown((prev) => {
        if (prev <= 1) {
          router.push("/login")
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [step, successCountdown, router])

  // Password complexity client-side validator
  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return "Password must be at least 8 characters long!"
    }
    if (!/[A-Z]/.test(pwd)) {
      return "Password must contain at least one uppercase letter!"
    }
    if (!/[a-z]/.test(pwd)) {
      return "Password must contain at least one lowercase letter!"
    }
    if (!/[0-9]/.test(pwd)) {
      return "Password must contain at least one number!"
    }
    if (!/[^A-Za-z0-9]/.test(pwd)) {
      return "Password must contain at least one special character!"
    }
    return null
  }

  // Handle Step 1 Registration Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (role === 'student') {
      if (!userClass) {
        setError("Please select your class!")
        setIsLoading(false)
        return
      }
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match!")
      setIsLoading(false)
      return
    }

    // Password strength check
    const pwdValidationError = validatePassword(password)
    if (pwdValidationError) {
      setError(pwdValidationError)
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/register/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          email, 
          password, 
          role,
          instituteId: role === 'student' ? (instituteId && instituteId !== 'none' ? instituteId : null) : undefined,
          userClass: role === 'student' ? userClass : undefined
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again!")
        setIsLoading(false)
        return
      }

      // Progress to verify OTP step
      setStep("verify")
      setResendCountdown(60)
      setIsLoading(false)
      
      // Auto focus first OTP box on next tick
      setTimeout(() => {
        if (otpInputRefs.current[0]) {
          otpInputRefs.current[0].focus()
        }
      }, 100)
    } catch {
      setError("Something went wrong. Please try again!")
      setIsLoading(false)
    }
  }

  // Handle individual OTP key inputs
  const handleOtpChange = (val: string, index: number) => {
    const numericVal = val.replace(/[^0-9]/g, "")
    if (!numericVal) {
      const newOtp = [...otp]
      newOtp[index] = ""
      setOtp(newOtp)
      return
    }

    const singleDigit = numericVal[numericVal.length - 1]
    const newOtp = [...otp]
    newOtp[index] = singleDigit
    setOtp(newOtp)

    // Shift focus to the next input box
    if (index < 5 && singleDigit) {
      const nextInput = otpInputRefs.current[index + 1]
      if (nextInput) {
        nextInput.focus()
      }
    }
  }

  // Handle Backspace actions
  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      const newOtp = [...otp]
      
      // If current input is empty, clear the previous and focus it
      if (otp[index] === "") {
        if (index > 0) {
          newOtp[index - 1] = ""
          setOtp(newOtp)
          const prevInput = otpInputRefs.current[index - 1]
          if (prevInput) {
            prevInput.focus()
          }
        }
      } else {
        // Just clear current input
        newOtp[index] = ""
        setOtp(newOtp)
      }
    }
  }

  // Handle pasting a 6-digit numeric code
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6)
    if (pastedText.length === 6) {
      const digits = pastedText.split("")
      setOtp(digits)
      // Focus the last input box
      if (otpInputRefs.current[5]) {
        otpInputRefs.current[5].focus()
      }
    }
  }

  // Handle OTP Verification submission
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setOtpError("")
    setIsVerifying(true)

    const otpCode = otp.join("")
    if (otpCode.length < 6) {
      setOtpError("Please enter all 6 digits of your verification code.")
      setIsVerifying(false)
      return
    }

    try {
      const res = await fetch("/api/auth/register/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        setOtpError(data.error || "Verification failed. Please try again.")
        setIsVerifying(false)
        return
      }

      setRequiresApproval(data.requiresApproval || false)
      setStep("success")
      setIsVerifying(false)
    } catch {
      setOtpError("Something went wrong during verification. Please try again.")
      setIsVerifying(false)
    }
  }

  // Handle Resending registration OTP
  const handleResendOtp = async () => {
    if (resendCountdown > 0) return
    setOtpError("")
    
    try {
      const res = await fetch("/api/auth/register/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setOtpError(data.error || "Failed to resend code.")
        return
      }

      // Reset inputs & restart countdown
      setOtp(Array(6).fill(""))
      setResendCountdown(60)

      setTimeout(() => {
        if (otpInputRefs.current[0]) {
          otpInputRefs.current[0].focus()
        }
      }, 100)
    } catch {
      setOtpError("Failed to resend verification code. Please try again.")
    }
  }

  // ---------------- PAGE VIEWS ----------------

  // STEP 3: Success Confirmation Screen View
  if (step === "success") {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4">
        {/* Colorful Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-cyan-50 to-violet-100" />
        
        {/* Decorative Blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-gradient-to-br from-emerald-300 to-teal-300 opacity-50 blur-3xl" />
          <div className="absolute -right-40 top-1/4 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-300 to-blue-300 opacity-40 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative text-center w-full max-w-md bg-white/60 p-8 rounded-3xl backdrop-blur-xl shadow-2xl border-0"
        >
          <motion.div 
            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-2xl shadow-emerald-500/40"
            animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <CheckCircle className="h-14 w-14 text-white" />
          </motion.div>
          <h2 className="mb-3 text-3xl font-extrabold text-gray-800">Email Verified Successfully!</h2>
          <p className="text-base text-gray-600 mb-6">
            {requiresApproval
              ? "Your account request is registered. Since you registered as an administrator/teacher, it is awaiting admin review."
              : "Your account is active and ready to explore. Let the learning adventure begin!"}
          </p>
          <div className="mb-6 py-2 px-4 rounded-xl bg-emerald-50 text-emerald-800 font-semibold inline-block text-sm">
            Redirecting to login in {successCountdown} seconds...
          </div>
          <Button 
            onClick={() => router.push("/login")}
            className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.01]"
          >
            Go to Login
          </Button>
        </motion.div>
      </div>
    )
  }

  // STEP 2: OTP Verification Card View
  if (step === "verify") {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4 py-8">
        {/* Colorful Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-100 via-violet-50 to-pink-100" />
        
        {/* Floating Elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-gradient-to-br from-cyan-300 to-blue-300 opacity-50 blur-3xl" />
          <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-gradient-to-br from-violet-300 to-purple-300 opacity-40 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-md"
        >
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 shadow-xl shadow-violet-500/30">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <span className="bg-gradient-to-r from-cyan-600 to-violet-600 bg-clip-text text-3xl font-extrabold text-transparent">NextGen School</span>
          </div>

          <Card className="border-0 bg-white/80 shadow-2xl shadow-violet-500/10 backdrop-blur-lg rounded-3xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 shadow-lg shadow-violet-500/20 text-white">
                <KeyRound className="h-7 w-7" />
              </div>
              <CardTitle className="text-2xl font-extrabold text-gray-800">Verify Your Email</CardTitle>
              <CardDescription className="text-sm text-gray-600 max-w-xs mx-auto">
                We have sent a 6-digit verification code to <span className="font-semibold text-violet-600">{email}</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                {otpError && (
                  <Alert variant="destructive" className="border-rose-200 bg-rose-50 text-rose-700 rounded-xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="font-medium">{otpError}</AlertDescription>
                  </Alert>
                )}

                {/* 6 Grid OTP Input Fields */}
                <div className="space-y-2">
                  <Label className="font-semibold text-gray-700 text-center block mb-2">Enter Verification Code</Label>
                  <div className="flex justify-between gap-2 max-w-xs mx-auto">
                    {otp.map((digit, idx) => (
                      <Input
                        key={idx}
                        id={`otp-${idx}`}
                        ref={(el) => {
                          otpInputRefs.current[idx] = el;
                        }}
                        type="text"
                        maxLength={1}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={digit}
                        onChange={(e) => handleOtpChange(e.target.value, idx)}
                        onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                        onPaste={idx === 0 ? handleOtpPaste : undefined}
                        disabled={isVerifying}
                        className="h-12 w-12 text-center text-xl font-extrabold border-2 border-violet-200 bg-white/70 focus:border-violet-500 focus:ring-violet-500 rounded-xl"
                      />
                    ))}
                  </div>
                </div>

                {/* Verify Button */}
                <Button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full h-12 bg-gradient-to-r from-cyan-500 via-violet-500 to-pink-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Verifying OTP...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Verify OTP
                    </>
                  )}
                </Button>
              </form>

              {/* Action Buttons: Resend & Back/Change Email */}
              <div className="mt-6 flex flex-col items-center gap-4 text-sm">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCountdown > 0}
                  className={`font-bold hover:underline transition-colors ${
                    resendCountdown > 0 
                      ? "text-gray-400 cursor-not-allowed" 
                      : "text-violet-600 hover:text-pink-600"
                  }`}
                >
                  {resendCountdown > 0 
                    ? `Resend OTP in ${resendCountdown}s` 
                    : "Resend OTP Code"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("register")
                    setError("")
                  }}
                  className="flex items-center gap-2 font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change Email Address
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // STEP 1: Registration Form Card View
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4 py-8">
      {/* Colorful Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-100 via-violet-50 to-pink-100" />
      
      {/* Decorative Blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-gradient-to-br from-cyan-300 to-blue-300 opacity-50 blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-gradient-to-br from-violet-300 to-purple-300 opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-gradient-to-br from-pink-300 to-rose-300 opacity-40 blur-3xl" />
      </div>

      {/* Floating Elements */}
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[8%] top-[15%]"
      >
        <Rocket className="h-10 w-10 text-violet-400 opacity-60" />
      </motion.div>
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute right-[12%] top-[25%]"
      >
        <Star className="h-8 w-8 fill-amber-400 text-amber-400 opacity-60" />
      </motion.div>
      <motion.div
        animate={{ y: [0, -10, 0], rotate: [0, -10, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute bottom-[15%] right-[20%]"
      >
        <Sparkles className="h-9 w-9 text-pink-400 opacity-60" />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 shadow-xl shadow-violet-500/30">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <span className="bg-gradient-to-r from-cyan-600 to-violet-600 bg-clip-text text-3xl font-extrabold text-transparent">NextGen School</span>
        </Link>

        <Card className="border-0 bg-white/80 shadow-2xl shadow-violet-500/10 backdrop-blur-lg rounded-3xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-extrabold text-gray-800">Join the Adventure!</CardTitle>
            <CardDescription className="text-base text-gray-600">Create your account to start learning</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="border-rose-200 bg-rose-50 text-rose-700 rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-semibold">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="font-semibold text-gray-700">Your Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 border-2 border-cyan-200 bg-white/70 text-base focus:border-cyan-400 focus:ring-cyan-400 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold text-gray-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 border-2 border-violet-200 bg-white/70 text-base focus:border-violet-400 focus:ring-violet-400 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="font-semibold text-gray-700">I am a...</Label>
                <Select value={role} onValueChange={setRole} disabled={isLoading}>
                  <SelectTrigger className="h-12 border-2 border-pink-200 bg-white/70 text-base focus:border-pink-400 focus:ring-pink-400 rounded-xl">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student" className="text-base">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-500" />
                        Student
                      </span>
                    </SelectItem>
                    <SelectItem value="teacher" className="text-base">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-violet-500" />
                        Teacher
                      </span>
                    </SelectItem>
                    <SelectItem value="institution" className="text-base">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-pink-500" />
                        Institution
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {role !== "student" && (
                  <p className="text-xs text-amber-600 font-medium pl-1">
                    Note: Teacher and Institution accounts require admin approval.
                  </p>
                )}
              </div>

              {role === "student" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-4 pt-2"
                >
                  <div className="space-y-2">
                    <Label htmlFor="institute" className="font-semibold text-gray-700">
                      My Institute <span className="text-xs font-normal text-gray-400">(optional)</span>
                    </Label>
                    <Select value={instituteId} onValueChange={setInstituteId} disabled={isLoading}>
                      <SelectTrigger className="h-12 border-2 border-cyan-200 bg-white/70 text-base focus:border-cyan-400 focus:ring-cyan-400 rounded-xl">
                        <SelectValue placeholder="Select institute (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="flex items-center gap-2 text-gray-500">
                            <GraduationCap className="h-4 w-4" />
                            Independent Student (no institute)
                          </span>
                        </SelectItem>
                        {institutes.map((inst) => (
                          <SelectItem key={inst.id} value={String(inst.id)}>
                            <span className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-cyan-500" />
                              {inst.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="class" className="font-semibold text-gray-700">My Class</Label>
                    <Select value={userClass} onValueChange={setUserClass} disabled={isLoading}>
                      <SelectTrigger className="h-12 border-2 border-violet-200 bg-white/70 text-base focus:border-violet-400 focus:ring-violet-400 rounded-xl">
                        <SelectValue placeholder="Select your class" />
                      </SelectTrigger>
                      <SelectContent>
                        {[4, 5, 6, 7, 8, 9].map((num) => (
                          <SelectItem key={num} value={String(num)}>
                            <span className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-violet-500" />
                              Class {num}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="font-semibold text-gray-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 border-2 border-emerald-200 bg-white/70 text-base focus:border-emerald-400 focus:ring-emerald-400 rounded-xl"
                />
                <p className="text-[10px] text-gray-500 leading-tight pl-1">
                  Must be 8+ chars, with an uppercase, lowercase, number, and special character.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-semibold text-gray-700">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 border-2 border-amber-200 bg-white/70 text-base focus:border-amber-400 focus:ring-amber-400 rounded-xl"
                />
              </div>

              <Button 
                type="submit" 
                className="h-12 w-full bg-gradient-to-r from-cyan-500 via-violet-500 to-pink-500 text-base font-bold shadow-lg shadow-violet-500/30 transition-all hover:scale-[1.02] hover:shadow-xl rounded-xl" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-5 w-5" />
                    Create Account
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <span className="text-gray-600">Already have an account? </span>
              <Link href="/login" className="font-bold text-violet-600 hover:text-pink-600 hover:underline">
                Sign in!
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-100 via-violet-50 to-pink-100">
        <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
