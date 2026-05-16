"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, CheckCircle, XCircle, Clock, Trophy, AlertCircle, Loader2, ChevronRight, ChevronLeft } from "lucide-react"

interface Question {
  id: string
  question: string
  option1: string
  option2: string
  option3: string
  option4: string
  order_number: number
}

interface QuizData {
  id: string
  title: string
  course_title: string
  time_limit: number
  passing_score: number
  max_attempts: number
  questions: Question[]
  attempts: { score: number; passed: boolean; submitted_at: string }[]
}

type QuizState = "intro" | "taking" | "submitted"

export default function QuizTakingPage() {
  const params = useParams()
  const router = useRouter()
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [loading, setLoading] = useState(true)
  const [quizState, setQuizState] = useState<QuizState>("intro")
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [currentQ, setCurrentQ] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; passed: boolean; correct: number; total: number } | null>(null)

  useEffect(() => { fetchQuiz() }, [params.id])

  const handleSubmit = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/student/quizzes/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data)
        setQuizState("submitted")
      }
    } finally { setSubmitting(false) }
  }, [answers, params.id, submitting])

  useEffect(() => {
    if (quizState !== "taking" || !quiz) return
    setTimeLeft(quiz.time_limit * 60)
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); handleSubmit(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [quizState, quiz, handleSubmit])

  async function fetchQuiz() {
    try {
      const res = await fetch(`/api/student/quizzes/${params.id}`)
      if (res.ok) setQuiz(await res.json())
      else router.push("/student/quizzes")
    } catch { router.push("/student/quizzes") }
    finally { setLoading(false) }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`
  const progress = quiz ? ((currentQ + 1) / quiz.questions.length) * 100 : 0
  const answeredCount = Object.keys(answers).length
  const canSubmit = quiz && answeredCount === quiz.questions.length

  if (loading) return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
    </div>
  )

  if (!quiz) return null

  const attemptsUsed = quiz.attempts.length
  const maxedOut = attemptsUsed >= quiz.max_attempts && !quiz.attempts.some(a => a.passed)
  const bestScore = quiz.attempts.length ? Math.max(...quiz.attempts.map(a => a.score)) : null

  // INTRO
  if (quizState === "intro") return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/student/quizzes" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-cyan-600">
        <ArrowLeft className="h-4 w-4" /> Back to Quizzes
      </Link>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 bg-white/80 shadow-2xl backdrop-blur">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <p className="mb-2 text-sm font-semibold text-cyan-600">{quiz.course_title}</p>
            <h1 className="mb-6 text-3xl font-extrabold text-gray-800">{quiz.title}</h1>
            <div className="mb-8 grid grid-cols-3 gap-4 text-center">
              {[
                { label: "Questions", value: quiz.questions.length },
                { label: "Time Limit", value: `${quiz.time_limit} min` },
                { label: "Pass Score", value: `${quiz.passing_score}%` },
              ].map(item => (
                <div key={item.label} className="rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 p-4 ring-1 ring-cyan-100">
                  <p className="text-2xl font-extrabold text-cyan-600">{item.value}</p>
                  <p className="text-sm text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>
            {bestScore !== null && (
              <div className="mb-6 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
                <p className="font-semibold text-amber-700">Previous attempts: {attemptsUsed}/{quiz.max_attempts}</p>
                <p className="text-amber-600">Best score: {bestScore}%</p>
              </div>
            )}
            {maxedOut ? (
              <div className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-200">
                <p className="font-semibold text-rose-600">No attempts remaining</p>
              </div>
            ) : (
              <Button
                onClick={() => setQuizState("taking")}
                className="h-14 w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-lg font-bold"
              >
                {attemptsUsed > 0 ? "Retry Quiz" : "Start Quiz"}
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )

  // RESULT
  if (quizState === "submitted" && result) return (
    <div className="mx-auto max-w-2xl space-y-6">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="border-0 bg-white/80 shadow-2xl backdrop-blur">
          <CardContent className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full ${result.passed ? "bg-gradient-to-br from-emerald-400 to-teal-500" : "bg-gradient-to-br from-rose-400 to-pink-500"} shadow-xl`}
            >
              {result.passed
                ? <Trophy className="h-12 w-12 text-white" />
                : <XCircle className="h-12 w-12 text-white" />}
            </motion.div>
            <h2 className="mb-2 text-3xl font-extrabold text-gray-800">
              {result.passed ? "🎉 Congratulations!" : "Better luck next time!"}
            </h2>
            <p className="mb-8 text-gray-500">
              {result.passed ? "You passed the quiz!" : `You need ${quiz.passing_score}% to pass.`}
            </p>
            <div className="mb-8 grid grid-cols-2 gap-4">
              <div className={`rounded-2xl p-6 ${result.passed ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-rose-50 ring-1 ring-rose-200"}`}>
                <p className={`text-4xl font-extrabold ${result.passed ? "text-emerald-600" : "text-rose-600"}`}>{result.score}%</p>
                <p className="text-gray-500">Your Score</p>
              </div>
              <div className="rounded-2xl bg-cyan-50 p-6 ring-1 ring-cyan-200">
                <p className="text-4xl font-extrabold text-cyan-600">{result.correct}/{result.total}</p>
                <p className="text-gray-500">Correct Answers</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Link href="/student/quizzes" className="flex-1">
                <Button variant="outline" className="w-full h-12">Back to Quizzes</Button>
              </Link>
              <Link href="/student" className="flex-1">
                <Button className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-500">Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )

  // TAKING
  const q = quiz.questions[currentQ]
  const options = [q.option1, q.option2, q.option3, q.option4]
  const selected = answers[q.id]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Timer + Progress */}
      <div className="flex items-center justify-between rounded-2xl bg-white/80 px-6 py-4 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="h-5 w-5 text-cyan-500" />
          <span className={`font-mono text-lg font-bold ${timeLeft < 60 ? "text-rose-500" : "text-gray-800"}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{answeredCount}/{quiz.questions.length} answered</span>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
              style={{ width: `${(answeredCount / quiz.questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <Card className="border-0 bg-white/80 shadow-xl backdrop-blur">
            <CardContent className="p-8">
              <div className="mb-6">
                <span className="mb-3 inline-block rounded-full bg-cyan-100 px-3 py-1 text-sm font-semibold text-cyan-700">
                  Question {currentQ + 1} of {quiz.questions.length}
                </span>
                <Progress value={progress} className="mb-4 h-2" />
                <h3 className="text-xl font-bold text-gray-800">{q.question}</h3>
              </div>
              <div className="space-y-3">
                {options.map((opt, idx) => {
                  const optNum = idx + 1
                  const isSelected = selected === optNum
                  return (
                    <button
                      key={idx}
                      onClick={() => setAnswers(prev => ({ ...prev, [q.id]: optNum }))}
                      className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
                        isSelected
                          ? "border-cyan-500 bg-gradient-to-r from-cyan-50 to-blue-50 shadow-md"
                          : "border-gray-200 bg-white hover:border-cyan-300 hover:bg-cyan-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-bold text-sm ${
                          isSelected ? "border-cyan-500 bg-cyan-500 text-white" : "border-gray-300 text-gray-500"
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className={`font-medium ${isSelected ? "text-cyan-700" : "text-gray-700"}`}>{opt}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
          disabled={currentQ === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        {currentQ < quiz.questions.length - 1 ? (
          <Button
            onClick={() => setCurrentQ(q => Math.min(quiz.questions.length - 1, q + 1))}
            className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-500"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Submit Quiz
          </Button>
        )}
      </div>
    </div>
  )
}
