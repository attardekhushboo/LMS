"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  CheckSquare, PlusCircle, Loader2, Trash2, Users, Clock,
  Star, Rocket, Eye, EyeOff, CheckCircle, ExternalLink, Plus
} from "lucide-react"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Quiz {
  id: string
  title: string
  course_title: string
  course_id: string
  course_class: number | null
  time_limit: number
  passing_score: number
  max_attempts: number
  question_count: number
  submission_count: number
  created_at: string
}

interface QuizOption {
  id: string
  text: string
  isCorrect: boolean
  order_number: number
}

interface QuizQuestion {
  id: string
  question: string
  order_number: number
  options: QuizOption[]
  correctAnswer: number
}

interface QuizDetail extends Quiz {
  questions: QuizQuestion[]
}

interface Course { id: string; title: string; class: number | null }

interface QuestionForm {
  question: string
  option1: string
  option2: string
  option3: string
  option4: string
  correctAnswer: number
}

const OPTION_LABELS = ["A", "B", "C", "D"]
const defaultQuestion = (): QuestionForm => ({
  question: "", option1: "", option2: "", option3: "", option4: "", correctAnswer: 1,
})

// ─── Component ────────────────────────────────────────────────────────────────

export default function TeacherQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [form, setForm] = useState({ courseId: "", title: "", timeLimit: 30, passingScore: 70, maxAttempts: 3 })
  const [questions, setQuestions] = useState<QuestionForm[]>([defaultQuestion()])

  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null)
  const [quizDetails, setQuizDetails] = useState<Record<string, QuizDetail>>({})
  const [loadingQuizId, setLoadingQuizId] = useState<string | null>(null)
  const [viewError, setViewError] = useState<string | null>(null)

  // Class Filter State
  const [selectedClass, setSelectedClass] = useState<string>("all")

  useEffect(() => {
    // 1. Initial State Sync from URL/Localstorage
    const params = new URLSearchParams(window.location.search)
    const urlClass = params.get("class")
    const localClass = localStorage.getItem("quiz_class_filter")
    
    if (urlClass && ["6", "7", "8", "9", "10", "all"].includes(urlClass)) {
      setSelectedClass(urlClass)
    } else if (localClass && ["6", "7", "8", "9", "10", "all"].includes(localClass)) {
      setSelectedClass(localClass)
    }

    fetchData()
  }, [])

  async function fetchData() {
    const [qRes, cRes] = await Promise.all([
      fetch("/api/teacher/quizzes"),
      fetch("/api/teacher/courses"),
    ])
    if (qRes.ok) setQuizzes(await qRes.json())
    if (cRes.ok) setCourses(await cRes.json())
    setLoading(false)
  }

  async function handleToggleQuestions(quizId: string) {
    if (expandedQuizId === quizId) { setExpandedQuizId(null); return }
    if (quizDetails[quizId]) { setExpandedQuizId(quizId); return }

    setLoadingQuizId(quizId)
    setExpandedQuizId(quizId)
    setViewError(null)
    try {
      const res = await fetch(`/api/teacher/quizzes/${quizId}`)
      if (res.ok) {
        const data = await res.json()
        setQuizDetails(prev => ({ ...prev, [quizId]: data }))
      } else {
        const err = await res.json()
        setViewError(err.error || "Failed to load questions.")
        setExpandedQuizId(null)
      }
    } catch {
      setViewError("Network error loading questions.")
      setExpandedQuizId(null)
    } finally {
      setLoadingQuizId(null)
    }
  }

  // Open Create Dialog with Smart Default class mapping
  function handleOpenCreateDialog() {
    let defaultCourseId = ""
    if (selectedClass !== "all") {
      const matchingCourse = courses.find(c => {
        const classNum = parseInt(selectedClass, 10)
        const courseClass = typeof c.class === 'number' ? c.class : parseInt(String(c.class).replace(/\D/g, ""), 10)
        return courseClass === classNum && !quizzes.some(q => String(q.course_id) === String(c.id))
      })
      if (matchingCourse) {
        defaultCourseId = String(matchingCourse.id)
      }
    }
    setForm({ courseId: defaultCourseId, title: "", timeLimit: 30, passingScore: 70, maxAttempts: 3 })
    setQuestions([defaultQuestion()])
    setCreateError(null)
    setDialogOpen(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)

    if (!form.courseId) { setCreateError("Please select a course."); return }
    if (!form.title.trim()) { setCreateError("Please enter a quiz title."); return }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question.trim()) { setCreateError(`Question ${i + 1} text is required.`); return }
      if (!q.option1.trim() || !q.option2.trim() || !q.option3.trim() || !q.option4.trim()) {
        setCreateError(`All 4 options for Question ${i + 1} are required.`); return
      }
    }

    setSaving(true)
    try {
      const res = await fetch("/api/teacher/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, questions }),
      })
      const data = await res.json()
      if (res.ok) {
        setDialogOpen(false)
        setCreateError(null)
        setForm({ courseId: "", title: "", timeLimit: 30, passingScore: 70, maxAttempts: 3 })
        setQuestions([defaultQuestion()])
        fetchData()
        toast.success("Quiz created successfully!")
      } else {
        setCreateError(data.error || "Failed to create quiz. Please try again.")
      }
    } catch {
      setCreateError("Network error. Please check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  // ── Grouping & Filtering Logic ──────────────────────────────────────────────
  
  // Filter quizzes based on selected class
  const filteredQuizzes = quizzes.filter(quiz => {
    if (selectedClass === "all") return true
    const classNum = parseInt(selectedClass, 10)
    return quiz.course_class === classNum
  })

  // Group filtered quizzes by class (unassigned as "?" or unassigned)
  const grouped: Record<string, Quiz[]> = filteredQuizzes.reduce((acc, quiz) => {
    const key = quiz.course_class != null ? String(quiz.course_class) : "unassigned"
    if (!acc[key]) acc[key] = []
    acc[key].push(quiz)
    return acc
  }, {} as Record<string, Quiz[]>)

  // Sort class keys ascending
  const sortedClassKeys = Object.keys(grouped).sort((a, b) => {
    if (a === "unassigned") return 1
    if (b === "unassigned") return -1
    return Number(a) - Number(b)
  })

  if (loading) return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
        <Rocket className="h-12 w-12 text-cyan-500" />
      </motion.div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between px-1">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Quizzes</h1>
          <p className="text-gray-500 font-medium">Create and manage quizzes for your courses</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Class Filter Dropdown */}
          <Select 
            value={selectedClass} 
            onValueChange={(val) => {
              setSelectedClass(val)
              localStorage.setItem("quiz_class_filter", val)
              const url = new URL(window.location.href)
              if (val === "all") url.searchParams.delete("class")
              else url.searchParams.set("class", val)
              window.history.pushState({}, "", url.toString())
            }}
          >
            <SelectTrigger className="w-full sm:w-52 h-[44px] rounded-[12px] bg-white border border-slate-400/20 text-slate-600 font-medium shadow-sm hover:bg-slate-50/50 transition-colors">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-lg border-gray-100">
              <SelectItem value="all" className="font-medium text-slate-700">All Classes</SelectItem>
              <SelectItem value="6" className="font-medium text-slate-700">Class 6</SelectItem>
              <SelectItem value="7" className="font-medium text-slate-700">Class 7</SelectItem>
              <SelectItem value="8" className="font-medium text-slate-700">Class 8</SelectItem>
              <SelectItem value="9" className="font-medium text-slate-700">Class 9</SelectItem>
              <SelectItem value="10" className="font-medium text-slate-700">Class 10</SelectItem>
            </SelectContent>
          </Select>

          {/* Create Quiz Button */}
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false) }}>
            <Button 
              onClick={handleOpenCreateDialog}
              className="w-full sm:w-auto h-[44px] px-6 rounded-[12px] bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-base shadow-[0_8px_20px_rgba(6,182,212,0.25)] hover:shadow-[0_12px_24px_rgba(6,182,212,0.35)] hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] transition-all duration-300 ease-in-out flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" /> Create Quiz
            </Button>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create New Quiz</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-5">
                {createError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    {createError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Course *</Label>
                    <Select value={form.courseId} onValueChange={v => setForm(p => ({ ...p, courseId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                      <SelectContent>
                        {courses.map(c => {
                          const hasQuiz = quizzes.some(q => String(q.course_id) === String(c.id))
                          return (
                            <SelectItem key={c.id} value={String(c.id)} disabled={hasQuiz}>
                              {c.title} {hasQuiz && <span className="text-gray-400 ml-1">(Has Quiz)</span>}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Quiz Title *</Label>
                    <Input
                      value={form.title}
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="e.g., Chapter 1 Quiz"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time Limit (minutes)</Label>
                    <Input type="number" value={form.timeLimit} onChange={e => setForm(p => ({ ...p, timeLimit: +e.target.value }))} min={5} max={120} />
                  </div>
                  <div className="space-y-2">
                    <Label>Passing Score (%)</Label>
                    <Input type="number" value={form.passingScore} onChange={e => setForm(p => ({ ...p, passingScore: +e.target.value }))} min={1} max={100} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Questions</Label>
                    <Button type="button" size="sm" variant="outline" onClick={() => setQuestions(q => [...q, defaultQuestion()])}>
                      <PlusCircle className="mr-1 h-4 w-4" /> Add Question
                    </Button>
                  </div>
                  {questions.map((q, qi) => (
                    <div key={qi} className="rounded-xl border-2 border-gray-100 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700">Q{qi + 1}</span>
                        {questions.length > 1 && (
                          <Button type="button" size="sm" variant="ghost" className="text-rose-500 h-7"
                            onClick={() => setQuestions(qs => qs.filter((_, i) => i !== qi))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <Input
                        placeholder="Question text"
                        value={q.question}
                        onChange={e => setQuestions(qs => qs.map((x, i) => i === qi ? { ...x, question: e.target.value } : x))}
                        required
                      />
                      <div className="grid grid-cols-2 gap-2">
                        {(["option1", "option2", "option3", "option4"] as const).map((opt, oi) => (
                          <div key={opt} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${qi}`}
                              checked={q.correctAnswer === oi + 1}
                              onChange={() => setQuestions(qs => qs.map((x, i) => i === qi ? { ...x, correctAnswer: oi + 1 } : x))}
                              className="h-4 w-4 accent-cyan-500"
                            />
                            <Input
                              placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                              value={q[opt]}
                              onChange={e => setQuestions(qs => qs.map((x, i) => i === qi ? { ...x, [opt]: e.target.value } : x))}
                              required
                              className="text-sm"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">● = correct answer</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500"
                    disabled={saving || !form.courseId || !form.title}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Quiz"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 flex items-center justify-between">
          <span>{viewError}</span>
          <button onClick={() => setViewError(null)} className="ml-4 text-rose-400 hover:text-rose-600">✕</button>
        </div>
      )}

      {/* Grouped & Filtered Quizzes display */}
      {filteredQuizzes.length > 0 ? (
        <div className="space-y-10">
          {sortedClassKeys.map(classKey => {
            const classQuizzes = grouped[classKey]
            const classLabel = classKey === "unassigned" ? "Unassigned Quizzes" : `Class ${classKey}`

            return (
              <div key={classKey} className="space-y-4">
                {/* Class heading */}
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-md ${
                    classKey === "unassigned"
                      ? "bg-gray-400"
                      : "bg-gradient-to-br from-cyan-500 to-blue-600"
                  }`}>
                    {classKey === "unassigned" ? "?" : classKey}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{classLabel}</h2>
                    <p className="text-sm text-gray-500 font-medium">
                      {classQuizzes.length} quiz{classQuizzes.length !== 1 ? "zes" : ""}
                    </p>
                  </div>
                  <div className="flex-1 h-px bg-gray-200/60 ml-2" />
                </div>

                {/* Cards Grid */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {classQuizzes.map((quiz, index) => {
                    const isExpanded = expandedQuizId === quiz.id
                    const isLoadingThis = loadingQuizId === quiz.id
                    const detail = quizDetails[quiz.id]

                    return (
                      <motion.div
                        key={quiz.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={isExpanded ? "sm:col-span-2 lg:col-span-3" : ""}
                      >
                        <Card className="border-0 bg-white/80 shadow-xl backdrop-blur overflow-hidden rounded-2xl">
                          <CardContent className="p-0">
                            {/* Banner */}
                            <div className="h-32 bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center relative">
                              <CheckSquare className="h-14 w-14 text-white/30" />
                              <div className="absolute right-3 top-3">
                                <Badge className="bg-white/20 text-white backdrop-blur border-0 font-bold">
                                  {quiz.question_count} Qs
                                </Badge>
                              </div>
                            </div>

                            {/* Body */}
                            <div className="p-5">
                              <p className="text-sm font-bold text-cyan-600 mb-1">{quiz.course_title}</p>
                              <h3 className="text-lg font-black text-gray-800 mb-3 leading-snug">{quiz.title}</h3>
                              <div className="flex flex-wrap gap-3 text-xs font-bold text-gray-400 mb-4">
                                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{quiz.time_limit} min</span>
                                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500" />{quiz.passing_score}%</span>
                                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{quiz.submission_count} attempts</span>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  className={`flex-1 gap-2 font-bold ${
                                    isExpanded
                                      ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                      : "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90 shadow-sm"
                                  }`}
                                  variant={isExpanded ? "outline" : "default"}
                                  onClick={() => handleToggleQuestions(quiz.id)}
                                  disabled={isLoadingThis}
                                >
                                  {isLoadingThis ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : isExpanded ? (
                                    <><EyeOff className="h-4 w-4" /> Hide Questions</>
                                  ) : (
                                    <><Eye className="h-4 w-4" /> View Questions</>
                                  )}
                                </Button>
                                <Link href={`/teacher/quizzes/${quiz.id}`}>
                                  <Button variant="outline" size="icon" className="shrink-0 rounded-xl" title="Full detail page">
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </div>

                            {/* Expandable questions panel */}
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  key="questions-panel"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3, ease: "easeInOut" }}
                                  className="overflow-hidden"
                                >
                                  <div className="border-t border-gray-100 bg-gray-50/60 px-5 pb-5 pt-4">
                                    {isLoadingThis && (
                                      <div className="flex items-center justify-center py-8 gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
                                        <span className="text-sm text-gray-500">Loading questions...</span>
                                      </div>
                                    )}
                                    {!isLoadingThis && detail && (
                                      <>
                                        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                          {detail.questions.length} Question{detail.questions.length !== 1 ? "s" : ""}
                                        </p>
                                        {detail.questions.length === 0 ? (
                                          <p className="py-4 text-center text-sm text-gray-400">No questions found.</p>
                                        ) : (
                                          <div className="space-y-4">
                                            {detail.questions.map((q, qi) => (
                                              <motion.div
                                                key={q.id}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: qi * 0.04 }}
                                                className="rounded-2xl border-2 border-gray-100 bg-white p-4 shadow-sm"
                                              >
                                                <div className="mb-3 flex items-start gap-3">
                                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 text-xs font-bold text-white shadow">
                                                    {qi + 1}
                                                  </div>
                                                  <p className="pt-0.5 text-sm font-semibold leading-snug text-gray-800">
                                                    {q.question}
                                                  </p>
                                                </div>
                                                <div className="ml-10 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                                  {q.options.map((opt, oi) => (
                                                    <div
                                                      key={opt.id}
                                                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                                                        opt.isCorrect
                                                          ? "border-emerald-300 bg-emerald-50 font-medium text-emerald-700"
                                                          : "border-gray-100 bg-gray-50 text-gray-600"
                                                      }`}
                                                    >
                                                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                                        opt.isCorrect ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"
                                                      }`}>
                                                        {OPTION_LABELS[oi]}
                                                      </span>
                                                      <span className="flex-1">{opt.text}</span>
                                                      {opt.isCorrect && <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                                                    </div>
                                                  ))}
                                                </div>
                                                <p className="ml-10 mt-2 text-xs font-medium text-emerald-600">
                                                  ✓ Correct: {OPTION_LABELS[(q.correctAnswer ?? 1) - 1]}
                                                  {" — "}{q.options[(q.correctAnswer ?? 1) - 1]?.text}
                                                </p>
                                              </motion.div>
                                            ))}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-[40px] border-2 border-dashed border-gray-100">
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-blue-100">
            <CheckSquare className="h-12 w-12 text-cyan-500" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-800">No quizzes found</h3>
          <p className="text-gray-500 text-sm max-w-xs text-center px-4">There are no quizzes available for the selected class.</p>
        </div>
      )}
    </div>
  )
}
