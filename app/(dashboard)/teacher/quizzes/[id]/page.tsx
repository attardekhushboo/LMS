"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, CheckSquare, Clock, Star, Users, Loader2,
  CheckCircle, Trash2, BookOpen, BarChart3, AlertCircle,
} from "lucide-react"

interface Option {
  id: string
  text: string
  isCorrect: boolean
  order_number: number
}

interface Question {
  id: string
  question: string
  order_number: number
  options: Option[]
  correctAnswer: number
}

interface QuizDetail {
  id: string
  title: string
  course_title: string
  course_id: string
  time_limit: number
  passing_score: number
  max_attempts: number
  created_at: string
  questions: Question[]
  total_attempts: number
  avg_score: number
}

const OPTION_LABELS = ["A", "B", "C", "D"]

export default function TeacherQuizDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [quiz, setQuiz] = useState<QuizDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchQuiz()
  }, [params.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchQuiz() {
    try {
      const res = await fetch(`/api/teacher/quizzes/${params.id}`)
      if (res.ok) {
        setQuiz(await res.json())
      } else {
        router.push("/teacher/quizzes")
      }
    } catch {
      router.push("/teacher/quizzes")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this quiz? This cannot be undone.")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/teacher/quizzes/${params.id}`, { method: "DELETE" })
      if (res.ok) router.push("/teacher/quizzes")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
      </div>
    )
  }

  if (!quiz) return null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back */}
      <Link
        href="/teacher/quizzes"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-cyan-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Quizzes
      </Link>

      {/* Header Banner */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 p-8 text-white shadow-2xl">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4 opacity-80" />
              <span className="text-sm font-medium opacity-80">{quiz.course_title}</span>
            </div>
            <h1 className="mb-4 text-3xl font-extrabold">{quiz.title}</h1>

            {/* Stats row */}
            <div className="flex flex-wrap gap-5 text-sm">
              <div className="flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4" />
                <span className="font-semibold">{quiz.questions.length} Questions</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span className="font-semibold">{quiz.time_limit} min</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4" />
                <span className="font-semibold">Pass: {quiz.passing_score}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span className="font-semibold">{quiz.max_attempts} max attempts</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Submission Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-4"
      >
        <div className="rounded-2xl bg-white/80 p-5 shadow-lg backdrop-blur ring-1 ring-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100">
              <Users className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-800">{quiz.total_attempts}</p>
              <p className="text-sm text-gray-500">Total Attempts</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white/80 p-5 shadow-lg backdrop-blur ring-1 ring-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-800">{quiz.avg_score}%</p>
              <p className="text-sm text-gray-500">Average Score</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Questions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-0 bg-white/80 shadow-xl backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-xl font-bold text-gray-800">
              Questions ({quiz.questions.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="border-rose-200 text-rose-600 hover:bg-rose-50"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Quiz
            </Button>
          </CardHeader>

          <CardContent className="space-y-5">
            {quiz.questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <AlertCircle className="h-8 w-8 text-gray-400" />
                </div>
                <p className="font-semibold text-gray-600">No questions found</p>
                <p className="text-sm text-gray-400">This quiz has no questions yet.</p>
              </div>
            ) : (
              quiz.questions.map((q, qi) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: qi * 0.05 }}
                  className="rounded-2xl border-2 border-gray-100 bg-white p-5 shadow-sm"
                >
                  {/* Question header */}
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 text-sm font-bold text-white shadow">
                      {qi + 1}
                    </div>
                    <p className="text-base font-semibold text-gray-800 leading-snug pt-0.5">
                      {q.question}
                    </p>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {q.options.map((opt, oi) => (
                      <div
                        key={opt.id}
                        className={`flex items-center gap-3 rounded-xl border-2 px-4 py-2.5 transition-all ${
                          opt.isCorrect
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-gray-100 bg-gray-50"
                        }`}
                      >
                        {/* Letter badge */}
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            opt.isCorrect
                              ? "bg-emerald-500 text-white"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {OPTION_LABELS[oi]}
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            opt.isCorrect ? "text-emerald-700" : "text-gray-600"
                          }`}
                        >
                          {opt.text}
                        </span>
                        {opt.isCorrect && (
                          <CheckCircle className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Correct answer label */}
                  <p className="mt-3 text-xs text-emerald-600 font-medium">
                    ✓ Correct: Option {OPTION_LABELS[(q.correctAnswer ?? 1) - 1]}
                    {" — "}
                    {q.options[(q.correctAnswer ?? 1) - 1]?.text}
                  </p>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
