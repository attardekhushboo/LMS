"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FileText, Calendar, Star, CheckCircle, Clock, Loader2, Upload, Award, MessageSquare } from "lucide-react"

interface AssignmentDetail {
  id: string
  title: string
  description: string
  course_title: string
  due_date?: string
  max_score: number
  submitted: boolean
  submission_status?: string
  score?: number
  feedback?: string
  content?: string
}

export default function StudentAssignmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { fetchAssignment() }, [params.id])

  async function fetchAssignment() {
    try {
      const res = await fetch(`/api/student/assignments/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setAssignment(data)
        if (data.content) setContent(data.content)
      } else {
        router.push("/student/assignments")
      }
    } catch {
      router.push("/student/assignments")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) { setError("Please write your answer before submitting."); return }
    setError("")
    setSubmitting(true)
    try {
      const res = await fetch("/api/student/submit-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: params.id, content }),
      })
      if (res.ok) {
        setSubmitted(true)
        fetchAssignment()
      } else {
        const data = await res.json()
        setError(data.error || "Submission failed")
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
    </div>
  )
  if (!assignment) return null

  const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date()
  const isGraded = assignment.submission_status === "graded"
  const isPending = assignment.submitted && !isGraded

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/student/assignments" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-violet-600">
        <ArrowLeft className="h-4 w-4" /> Back to Assignments
      </Link>

      {/* Assignment Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 bg-white/80 shadow-xl backdrop-blur overflow-hidden">
          <div className={`h-3 w-full ${isGraded ? "bg-gradient-to-r from-emerald-400 to-teal-400" : isPending ? "bg-gradient-to-r from-amber-400 to-orange-400" : "bg-gradient-to-r from-violet-500 to-pink-500"}`} />
          <CardContent className="p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mb-1 text-sm font-semibold text-violet-600">{assignment.course_title}</p>
                <h1 className="text-2xl font-extrabold text-gray-800">{assignment.title}</h1>
              </div>
              <div className="flex flex-wrap gap-2">
                {isGraded && (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Graded: {assignment.score}/{assignment.max_score}
                  </Badge>
                )}
                {isPending && (
                  <Badge className="bg-amber-100 text-amber-700">
                    <Clock className="mr-1 h-3 w-3" />
                    Awaiting Review
                  </Badge>
                )}
                {!assignment.submitted && isOverdue && (
                  <Badge className="bg-rose-100 text-rose-700">Overdue</Badge>
                )}
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-4 text-sm text-gray-500">
              {assignment.due_date && (
                <span className={`flex items-center gap-1.5 ${isOverdue && !assignment.submitted ? "text-rose-500 font-semibold" : ""}`}>
                  <Calendar className="h-4 w-4" />
                  Due {new Date(assignment.due_date).toLocaleString()}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4" />
                {assignment.max_score} points
              </span>
            </div>

            {assignment.description && (
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Instructions</p>
                <p className="whitespace-pre-wrap text-gray-700">{assignment.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Graded Result */}
      {isGraded && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 bg-white/80 shadow-xl backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
                <Award className="h-5 w-5 text-emerald-500" />
                Your Grade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg">
                  <span className="text-2xl font-extrabold text-white">{assignment.score}</span>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-emerald-600">{assignment.score}/{assignment.max_score}</p>
                  <p className="text-gray-500">
                    {Math.round(((assignment.score ?? 0) / assignment.max_score) * 100)}% — {
                      (assignment.score ?? 0) / assignment.max_score >= 0.9 ? "Excellent!" :
                      (assignment.score ?? 0) / assignment.max_score >= 0.7 ? "Good job!" :
                      (assignment.score ?? 0) / assignment.max_score >= 0.5 ? "Keep practicing!" : "Needs improvement"
                    }
                  </p>
                </div>
              </div>
              {assignment.feedback && (
                <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Teacher Feedback
                  </p>
                  <p className="text-gray-700">{assignment.feedback}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Submission Area */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-0 bg-white/80 shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
              <FileText className="h-5 w-5 text-violet-500" />
              {assignment.submitted ? "Your Submission" : "Submit Your Work"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignment.submitted ? (
              <div className="space-y-3">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Your Answer</p>
                  <p className="whitespace-pre-wrap text-gray-700">{content || "No content submitted"}</p>
                </div>
                <p className="text-sm text-gray-500">
                  {isPending
                    ? "✅ Submitted — waiting for your teacher to review"
                    : "✅ Graded — see your score above"}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {submitted && (
                  <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700 ring-1 ring-emerald-200">
                    <CheckCircle className="mb-1 h-5 w-5" />
                    <p className="font-semibold">Submitted successfully!</p>
                  </div>
                )}
                {error && (
                  <div className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-600 ring-1 ring-rose-200">{error}</div>
                )}
                <Textarea
                  placeholder="Type your answer here..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={10}
                  className="border-2 border-violet-100 bg-white/70 text-base focus:border-violet-400 resize-none"
                />
                <p className="text-xs text-gray-400">{content.length} characters</p>
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-violet-500 to-pink-500 text-base font-bold"
                  disabled={submitting || !content.trim()}
                >
                  {submitting ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Submitting...</>
                  ) : (
                    <><Upload className="mr-2 h-5 w-5" />Submit Assignment</>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
