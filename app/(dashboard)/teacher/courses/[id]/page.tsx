"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  ArrowLeft, BookOpen, PlusCircle, Users, CheckCircle, Clock,
  Loader2, Trash2, Video, FileText, CheckSquare, FileQuestion, Eye,
  Calendar, Award, Star, Edit, PenTool, Paperclip, X, Download
} from "lucide-react"
import { toast } from "sonner"

interface Module {
  id: string
  title: string
  description: string
  video_url?: string
  content?: string
  order_number: number
}

interface QuizInfo {
  id: string
  title: string
  description?: string
  time_limit: number
  passing_score: number
  max_attempts: number
  status: string
  question_count: number
}

interface AssignmentInfo {
  id: string
  title: string
  description: string
  due_date: string
  max_score: number
  file_url?: string
  status: string
  submission_count: number
}

interface CourseDetail {
  id: string
  title: string
  description: string
  status: string
  enrolled_count: number
  modules_count: number
  modules: Module[]
  quizzes: QuizInfo[]
  assignments: AssignmentInfo[]
}

interface QuestionForm {
  question: string
  option1: string
  option2: string
  option3: string
  option4: string
  correctAnswer: number
}

const defaultQuestion = (): QuestionForm => ({
  question: "", option1: "", option2: "", option3: "", option4: "", correctAnswer: 1,
})

export default function TeacherCourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)

  // Tab Filtering State
  const [activeTab, setActiveTab] = useState<"modules" | "quizzes" | "assignments">("modules")

  // Module dialog
  const [addingModule, setAddingModule] = useState(false)
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false)
  const [moduleForm, setModuleForm] = useState({ title: "", description: "", videoUrl: "", content: "" })

  // Quiz dialog
  const [quizDialogOpen, setQuizDialogOpen] = useState(false)
  const [savingQuiz, setSavingQuiz] = useState(false)
  const [editingQuiz, setEditingQuiz] = useState<QuizInfo | null>(null)
  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    timeLimit: 30,
    passingScore: 70,
    maxAttempts: 3,
    status: "published"
  })
  const [questions, setQuestions] = useState<QuestionForm[]>([defaultQuestion()])
  const [quizError, setQuizError] = useState<string | null>(null)

  // Assignment dialog & modern fields
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false)
  const [savingAssignment, setSavingAssignment] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<AssignmentInfo | null>(null)
  
  const [teacherCourses, setTeacherCourses] = useState<{ id: string; title: string }[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [assignmentTitle, setAssignmentTitle] = useState("")
  const [assignmentDueDate, setAssignmentDueDate] = useState("")
  const [assignmentInstructions, setAssignmentInstructions] = useState("")
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null)
  const [isDraggingPdf, setIsDraggingPdf] = useState(false)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchCourse()
    fetchTeacherCourses()
  }, [params.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchCourse() {
    try {
      const res = await fetch(`/api/teacher/courses/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setCourse({
          ...data,
          quizzes: data.quizzes || [],
          assignments: data.assignments || []
        })
      }
      else router.push("/teacher/courses")
    } catch { router.push("/teacher/courses") }
    finally { setLoading(false) }
  }

  async function fetchTeacherCourses() {
    try {
      const res = await fetch("/api/teacher/courses")
      if (res.ok) {
        setTeacherCourses(await res.json())
      }
    } catch (err) {
      console.error("Failed to load courses", err)
    }
  }

  // ── Reset / Open Handlers ───────────────────────────────────────────────────

  function openAddModule() {
    setModuleForm({ title: "", description: "", videoUrl: "", content: "" })
    setModuleDialogOpen(true)
  }

  function openAddQuiz() {
    setEditingQuiz(null)
    setQuizForm({
      title: "",
      description: "",
      timeLimit: 30,
      passingScore: 70,
      maxAttempts: 3,
      status: "published"
    })
    setQuestions([defaultQuestion()])
    setQuizError(null)
    setQuizDialogOpen(true)
  }

  async function startEditQuiz(quiz: QuizInfo) {
    setEditingQuiz(quiz)
    setQuizForm({
      title: quiz.title,
      description: quiz.description || "",
      timeLimit: quiz.time_limit || 30,
      passingScore: quiz.passing_score || 70,
      maxAttempts: quiz.max_attempts || 3,
      status: quiz.status || "published"
    })
    setQuizError(null)
    
    // Fetch quiz questions
    try {
      const res = await fetch(`/api/teacher/quizzes/${quiz.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions.map((q: any) => ({
            question: q.question,
            option1: q.options[0]?.text || "",
            option2: q.options[1]?.text || "",
            option3: q.options[2]?.text || "",
            option4: q.options[3]?.text || "",
            correctAnswer: q.correctAnswer || 1
          })))
        } else {
          setQuestions([defaultQuestion()])
        }
      } else {
        setQuestions([defaultQuestion()])
      }
    } catch {
      setQuestions([defaultQuestion()])
    }
    setQuizDialogOpen(true)
  }

  function openAddAssignment() {
    setEditingAssignment(null)
    setSelectedCourseId(course?.id || "")
    setAssignmentTitle("")
    setAssignmentDueDate("")
    setAssignmentInstructions("")
    setSelectedPdfFile(null)
    if (pdfInputRef.current) pdfInputRef.current.value = ""
    setAssignmentError(null)
    setAssignmentDialogOpen(true)
  }

  function startEditAssignment(assignment: AssignmentInfo) {
    setEditingAssignment(assignment)
    setSelectedCourseId(course?.id || "")
    setAssignmentTitle(assignment.title)
    setAssignmentDueDate(assignment.due_date ? new Date(assignment.due_date).toISOString().split('T')[0] : "")
    setAssignmentInstructions(assignment.description || "")
    setSelectedPdfFile(null)
    if (pdfInputRef.current) pdfInputRef.current.value = ""
    setAssignmentError(null)
    setAssignmentDialogOpen(true)
  }

  function handlePdfValidation(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB.")
      return
    }
    setSelectedPdfFile(file)
  }

  // ── Module handlers ──────────────────────────────────────────────────────────

  async function handleAddModule(e: React.FormEvent) {
    e.preventDefault()
    setAddingModule(true)
    try {
      const res = await fetch("/api/teacher/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: params.id, ...moduleForm }),
      })
      if (res.ok) {
        setModuleDialogOpen(false)
        fetchCourse()
        toast.success("Module added!")
      }
    } finally { setAddingModule(false) }
  }

  async function handleDeleteModule(moduleId: string) {
    if (!confirm("Delete this module?")) return
    await fetch(`/api/teacher/modules/${moduleId}`, { method: "DELETE" })
    fetchCourse()
    toast.success("Module deleted.")
  }

  // ── Quiz handlers ────────────────────────────────────────────────────────────

  async function handleCreateOrEditQuiz(e: React.FormEvent) {
    e.preventDefault()
    setQuizError(null)

    if (!quizForm.title.trim()) { setQuizError("Quiz title is required."); return }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question.trim()) { setQuizError(`Question ${i + 1} text is required.`); return }
      if (!q.option1.trim() || !q.option2.trim() || !q.option3.trim() || !q.option4.trim()) {
        setQuizError(`All 4 options for Question ${i + 1} are required.`); return
      }
    }

    setSavingQuiz(true)
    try {
      const url = editingQuiz ? `/api/teacher/quizzes/${editingQuiz.id}` : "/api/teacher/quizzes"
      const method = editingQuiz ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: params.id, ...quizForm, questions }),
      })
      const data = await res.json()
      if (res.ok) {
        setQuizDialogOpen(false)
        fetchCourse()
        toast.success(editingQuiz ? "Quiz updated!" : "Quiz created!")
      } else {
        setQuizError(data.error || "Failed to save quiz.")
      }
    } catch {
      setQuizError("Network error.")
    } finally { setSavingQuiz(false) }
  }

  async function handleDeleteQuiz(quizId: string) {
    if (!confirm("Delete this quiz? All student responses will be lost.")) return
    try {
      const res = await fetch(`/api/teacher/quizzes/${quizId}`, { method: "DELETE" })
      if (res.ok) {
        fetchCourse()
        toast.success("Quiz deleted.")
      } else {
        toast.error("Failed to delete quiz.")
      }
    } catch {
      toast.error("Failed to delete quiz.")
    }
  }

  // ── Assignment handlers ──────────────────────────────────────────────────────

  async function handleCreateOrEditAssignment(e: React.FormEvent) {
    e.preventDefault()
    setAssignmentError(null)

    if (!selectedCourseId) { setAssignmentError("Please select a course."); return }
    if (!assignmentTitle.trim()) { setAssignmentError("Assignment title is required."); return }
    if (!assignmentDueDate) { setAssignmentError("Due date is required."); return }

    setSavingAssignment(true)
    try {
      const isEditing = !!editingAssignment
      const url = isEditing ? `/api/teacher/assignments/${editingAssignment.id}` : "/api/teacher/assignments"
      
      let res;
      if (isEditing) {
        // Edit expects JSON (PUT)
        res = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: selectedCourseId,
            title: assignmentTitle,
            dueDate: assignmentDueDate,
            description: assignmentInstructions,
            maxScore: 100,
            status: "published"
          })
        })
      } else {
        // Create expects FormData (POST) to support file upload
        const formData = new FormData()
        formData.append("title", assignmentTitle)
        formData.append("description", assignmentInstructions)
        formData.append("courseId", selectedCourseId)
        formData.append("dueDate", assignmentDueDate)
        if (selectedPdfFile) {
          formData.append("file", selectedPdfFile)
        }
        res = await fetch(url, {
          method: "POST",
          body: formData
        })
      }

      const data = await res.json()
      if (res.ok) {
        setAssignmentDialogOpen(false)
        fetchCourse()
        toast.success(isEditing ? "Assignment updated successfully!" : "Assignment created successfully!")
      } else {
        setAssignmentError(data.error || "Failed to save assignment.")
      }
    } catch {
      setAssignmentError("Network error.")
    } finally { setSavingAssignment(false) }
  }

  async function handleDeleteAssignment(assignmentId: string) {
    if (!confirm("Delete this assignment? All student submissions will be lost.")) return
    try {
      const res = await fetch(`/api/teacher/assignments/${assignmentId}`, { method: "DELETE" })
      if (res.ok) {
        fetchCourse()
        toast.success("Assignment deleted.")
      } else {
        toast.error("Failed to delete assignment.")
      }
    } catch {
      toast.error("Failed to delete assignment.")
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
      </div>
    )
  }

  if (!course) return null

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link href="/teacher/courses" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-cyan-600">
          <ArrowLeft className="h-4 w-4" /> Back to courses
        </Link>
      </div>

      {/* Course Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 p-8 text-white shadow-2xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="mb-3 flex items-center gap-3">
            <Badge className={`${course.status === "approved" ? "bg-emerald-400" : course.status === "pending" ? "bg-amber-400" : "bg-gray-400"} text-white`}>
              {course.status === "approved" ? <><CheckCircle className="mr-1 h-3 w-3" />Published</> : course.status === "pending" ? <><Clock className="mr-1 h-3 w-3" />Pending Review</> : "Draft"}
            </Badge>
          </div>
          <h1 className="mb-2 text-3xl font-extrabold">{course.title}</h1>
          <p className="text-white/80 max-w-2xl">{course.description}</p>
          <div className="mt-4 flex gap-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="font-semibold">{course.enrolled_count} students</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <span className="font-semibold">{course.modules?.length || 0} modules</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Buttons Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Add Module */}
        <Button onClick={openAddModule} className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 h-12 text-base font-bold shadow-lg transition-transform hover:scale-[1.01]">
          <PlusCircle className="h-5 w-5" /> Add Module
        </Button>

        {/* Add Quiz */}
        <Button onClick={openAddQuiz} className="gap-2 bg-gradient-to-r from-violet-500 to-purple-500 h-12 text-base font-bold shadow-lg transition-transform hover:scale-[1.01]">
          <CheckSquare className="h-5 w-5" /> Add Quiz
        </Button>

        {/* Add Assignment */}
        <Button onClick={openAddAssignment} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 h-12 text-base font-bold shadow-lg transition-transform hover:scale-[1.01]">
          <FileQuestion className="h-5 w-5" /> Add Assignment
        </Button>
      </div>

      {/* ── Content Navigation Tabs System ── */}
      <div className="flex flex-wrap p-1.5 bg-gray-100/80 rounded-2xl border border-gray-200/50 backdrop-blur-sm gap-2">
        <button
          onClick={() => setActiveTab("modules")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-black transition-all ${
            activeTab === "modules"
              ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md shadow-blue-500/20 scale-[1.01]"
              : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
          }`}
        >
          <BookOpen className="h-4.5 w-4.5" />
          <span>Modules</span>
          <Badge variant="outline" className={`ml-1 font-bold text-xs transition-all ${
            activeTab === "modules" ? "bg-white/20 text-white border-white/30" : "bg-gray-200 text-gray-700 border-gray-300"
          }`}>
            {course.modules?.length || 0}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab("quizzes")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-black transition-all ${
            activeTab === "quizzes"
              ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md shadow-purple-500/20 scale-[1.01]"
              : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
          }`}
        >
          <CheckSquare className="h-4.5 w-4.5" />
          <span>Quizzes</span>
          <Badge variant="outline" className={`ml-1 font-bold text-xs transition-all ${
            activeTab === "quizzes" ? "bg-white/20 text-white border-white/30" : "bg-gray-200 text-gray-700 border-gray-300"
          }`}>
            {course.quizzes?.length || 0}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab("assignments")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-black transition-all ${
            activeTab === "assignments"
              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20 scale-[1.01]"
              : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
          }`}
        >
          <FileText className="h-4.5 w-4.5" />
          <span>Assignments</span>
          <Badge variant="outline" className={`ml-1 font-bold text-xs transition-all ${
            activeTab === "assignments" ? "bg-white/20 text-white border-white/30" : "bg-gray-200 text-gray-700 border-gray-300"
          }`}>
            {course.assignments?.length || 0}
          </Badge>
        </button>
      </div>

      {/* ── Dialog Components ── */}

      {/* Add/Edit Module Dialog */}
      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Module</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddModule} className="space-y-4">
            <div className="space-y-2">
              <Label>Module Title *</Label>
              <Input placeholder="e.g., Introduction to Algebra" value={moduleForm.title} onChange={e => setModuleForm(p => ({ ...p, title: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="What students will learn..." value={moduleForm.description} onChange={e => setModuleForm(p => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Video URL</Label>
              <Input placeholder="https://youtube.com/..." value={moduleForm.videoUrl} onChange={e => setModuleForm(p => ({ ...p, videoUrl: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Text Content</Label>
              <Textarea placeholder="Add notes or reading material..." value={moduleForm.content} onChange={e => setModuleForm(p => ({ ...p, content: e.target.value }))} rows={4} />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setModuleDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500" disabled={addingModule}>
                {addingModule ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Module"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Quiz Dialog */}
      <Dialog open={quizDialogOpen} onOpenChange={(open) => { setQuizDialogOpen(open); if (!open) setQuizError(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingQuiz ? `Edit Quiz: "${editingQuiz.title}"` : `Create Quiz for "${course.title}"`}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateOrEditQuiz} className="space-y-5">
            {quizError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {quizError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Quiz Title *</Label>
                <Input value={quizForm.title} onChange={e => setQuizForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Chapter 1 Quiz" required />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Description</Label>
                <Textarea value={quizForm.description} onChange={e => setQuizForm(p => ({ ...p, description: e.target.value }))} placeholder="Provide clear instructions for this quiz..." rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Time Limit (minutes)</Label>
                <Input type="number" value={quizForm.timeLimit} onChange={e => setQuizForm(p => ({ ...p, timeLimit: +e.target.value }))} min={5} max={120} />
              </div>
              <div className="space-y-2">
                <Label>Passing Score (%)</Label>
                <Input type="number" value={quizForm.passingScore} onChange={e => setQuizForm(p => ({ ...p, passingScore: +e.target.value }))} min={1} max={100} />
              </div>
              <div className="space-y-2">
                <Label>Max Attempts</Label>
                <Input type="number" value={quizForm.maxAttempts} onChange={e => setQuizForm(p => ({ ...p, maxAttempts: +e.target.value }))} min={1} max={10} />
              </div>
              <div className="space-y-2">
                <Label>Publish Status</Label>
                <select
                  value={quizForm.status}
                  onChange={e => setQuizForm(p => ({ ...p, status: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold text-gray-800">Questions ({questions.length})</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setQuestions(q => [...q, defaultQuestion()])} className="border-violet-200 text-violet-600 hover:bg-violet-50 hover:text-violet-700">
                  <PlusCircle className="mr-1 h-4 w-4" /> Add Question
                </Button>
              </div>
              {questions.map((q, qi) => (
                <div key={qi} className="rounded-xl border-2 border-gray-100 p-4 space-y-3 bg-gray-50/30">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">Question {qi + 1}</span>
                    {questions.length > 1 && (
                      <Button type="button" size="sm" variant="ghost" className="text-rose-500 h-7 hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => setQuestions(qs => qs.filter((_, i) => i !== qi))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Input placeholder="Question text" value={q.question}
                    onChange={e => setQuestions(qs => qs.map((x, i) => i === qi ? { ...x, question: e.target.value } : x))} required className="bg-white border-gray-200" />
                  <div className="grid grid-cols-2 gap-2">
                    {(["option1", "option2", "option3", "option4"] as const).map((opt, oi) => (
                      <div key={opt} className="flex items-center gap-2 bg-white rounded-lg px-2 border border-gray-200">
                        <input type="radio" name={`correct-${qi}`} checked={q.correctAnswer === oi + 1}
                          onChange={() => setQuestions(qs => qs.map((x, i) => i === qi ? { ...x, correctAnswer: oi + 1 } : x))}
                          className="h-4 w-4 accent-violet-500 cursor-pointer" />
                        <Input placeholder={`Option ${String.fromCharCode(65 + oi)}`} value={q[opt]}
                          onChange={e => setQuestions(qs => qs.map((x, i) => i === qi ? { ...x, [opt]: e.target.value } : x))} required className="text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1 shadow-none" />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 font-medium">● Mark the radio button corresponding to the correct option.</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-3 border-t">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setQuizDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold" disabled={savingQuiz || !quizForm.title}>
                {savingQuiz ? <Loader2 className="h-4 w-4 animate-spin" /> : editingQuiz ? "Save Changes" : "Create Quiz"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modern Add/Edit Assignment Dialog ── */}
      <Dialog open={assignmentDialogOpen} onOpenChange={(open) => { setAssignmentDialogOpen(open); if (!open) setAssignmentError(null) }}>
        <DialogContent className="max-w-lg overflow-hidden rounded-3xl p-0 border-0 shadow-2xl bg-white">
          <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-600" />
          <div className="px-6 pt-5 pb-2">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-gray-800 tracking-tight">
                {editingAssignment ? "EDIT ASSIGNMENT" : "NEW ASSIGNMENT"}
              </DialogTitle>
            </DialogHeader>
          </div>
          <form onSubmit={handleCreateOrEditAssignment} className="space-y-4 px-6 pb-6 pt-2">
            {assignmentError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                {assignmentError}
              </div>
            )}
            
            {/* 1. SELECT COURSE */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-400">SELECT COURSE</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                 <SelectTrigger className="rounded-xl border-gray-100 bg-gray-50/50 h-11 text-gray-700">
                    <SelectValue placeholder="Choose a course..." />
                 </SelectTrigger>
                 <SelectContent>
                    {teacherCourses.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.title}
                      </SelectItem>
                    ))}
                 </SelectContent>
              </Select>
            </div>

            {/* 2. ASSIGNMENT TITLE */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-400">ASSIGNMENT TITLE</Label>
              <Input
                placeholder="e.g. Mid-term Research Project"
                value={assignmentTitle}
                onChange={e => setAssignmentTitle(e.target.value)}
                className="rounded-xl border-gray-100 bg-gray-50/50 h-11"
                required
              />
            </div>

            {/* 3. DUE DATE */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-400">DUE DATE</Label>
              <Input
                type="date"
                placeholder="dd-mm-yyyy"
                value={assignmentDueDate}
                onChange={e => setAssignmentDueDate(e.target.value)}
                className="rounded-xl border-gray-100 bg-gray-50/50 h-11 text-gray-700"
                required
              />
            </div>

            {/* 4. INSTRUCTIONS (OPTIONAL) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-400">INSTRUCTIONS (OPTIONAL)</Label>
              <Textarea
                placeholder="Explain the requirements..."
                rows={4}
                value={assignmentInstructions}
                onChange={e => setAssignmentInstructions(e.target.value)}
                className="rounded-xl border-gray-100 bg-gray-50/50 resize-none p-3"
              />
            </div>

            {/* 5. UPLOAD ASSIGNMENT PDF (optional) */}
            {!editingAssignment && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  UPLOAD ASSIGNMENT PDF <span className="text-gray-300 normal-case font-normal">(optional)</span>
                </Label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingPdf(true) }}
                  onDragLeave={() => setIsDraggingPdf(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDraggingPdf(false)
                    const file = e.dataTransfer.files?.[0]
                    if (file) handlePdfValidation(file)
                  }}
                  onClick={() => pdfInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                    isDraggingPdf
                      ? "border-purple-500 bg-purple-50/50"
                      : selectedPdfFile
                      ? "border-emerald-300 bg-emerald-50/20"
                      : "border-gray-200 bg-gray-50/50 hover:border-purple-300 hover:bg-purple-50/10"
                  }`}
                >
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handlePdfValidation(file)
                    }}
                    className="hidden"
                  />
                  <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full ${
                    selectedPdfFile ? "bg-emerald-100 text-emerald-600" : "bg-purple-100 text-purple-600"
                  }`}>
                    <Paperclip className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold text-gray-700 truncate max-w-xs">
                    {selectedPdfFile ? selectedPdfFile.name : "Click to select PDF file..."}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {selectedPdfFile
                      ? `${(selectedPdfFile.size / 1024).toFixed(1)} KB · PDF Format`
                      : "Drag & drop or browse PDF only (Max 5MB)"}
                  </p>
                  {selectedPdfFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPdfFile(null)
                        if (pdfInputRef.current) pdfInputRef.current.value = ""
                      }}
                      className="absolute top-2 right-2 rounded-full p-1 bg-white border shadow-sm text-gray-400 hover:text-rose-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:brightness-105 transition-all text-white font-bold h-12 rounded-xl text-base shadow-lg shadow-purple-500/20 active:scale-[0.99]"
                disabled={savingAssignment}
              >
                {savingAssignment ? (
                  <div className="flex items-center gap-2 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Publishing...</span>
                  </div>
                ) : (
                  "Create & Publish"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Tab Content Section with Sliding Transitions ── */}
      <div className="relative min-h-[350px]">
        <AnimatePresence mode="wait">
          {activeTab === "modules" && (
            <motion.div
              key="modules"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {/* ── 1. Course Modules Section ── */}
              <Card className="border-0 bg-white/80 shadow-xl backdrop-blur transition-all overflow-hidden rounded-2xl">
                <div className="h-1.5 bg-gradient-to-r from-cyan-500 to-blue-500" />
                <CardHeader className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-1 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full" />
                    <CardTitle className="text-xl font-bold text-gray-800">Course Modules</CardTitle>
                    <Badge variant="outline" className="ml-2 bg-cyan-50 text-cyan-600 border-cyan-100 font-bold">
                      {course.modules?.length || 0}
                    </Badge>
                  </div>
                  <Button
                    onClick={openAddModule}
                    className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:brightness-105 text-white font-bold h-10 px-5 rounded-xl shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] text-sm"
                  >
                    <PlusCircle className="h-4.5 w-4.5" /> + Add Module
                  </Button>
                </CardHeader>
                <CardContent>
                  {course.modules?.length > 0 ? (
                    <div className="space-y-3">
                      <AnimatePresence initial={false}>
                        {course.modules.map((mod, index) => (
                          <motion.div
                            key={mod.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-start gap-4 rounded-2xl border-2 border-gray-100 bg-white p-4 transition-all hover:border-cyan-200 hover:shadow-md"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100 font-bold text-cyan-600">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-gray-800">{mod.title}</h4>
                              {mod.description && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{mod.description}</p>}
                              <div className="mt-2 flex gap-3">
                                {mod.video_url && (
                                  <span className="flex items-center gap-1 text-xs font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md">
                                    <Video className="h-3.5 w-3.5" /> Video Tutorial
                                  </span>
                                )}
                                {mod.content && (
                                  <span className="flex items-center gap-1 text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">
                                    <FileText className="h-3.5 w-3.5" /> Notes Included
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => handleDeleteModule(mod.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 shadow-inner">
                        <BookOpen className="h-8 w-8 text-cyan-500 animate-pulse" />
                      </div>
                      <h3 className="mb-1 text-lg font-bold text-gray-700">No modules yet</h3>
                      <p className="text-gray-500 text-sm max-w-xs">Create modules above to structure lessons for your students.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "quizzes" && (
            <motion.div
              key="quizzes"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {/* ── 2. Course Quizzes Section ── */}
              <Card className="border-0 bg-white/80 shadow-xl backdrop-blur transition-all overflow-hidden rounded-2xl">
                <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-500" />
                <CardHeader className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-1 bg-gradient-to-b from-violet-500 to-purple-500 rounded-full" />
                    <CardTitle className="text-xl font-bold text-gray-800">Course Quizzes</CardTitle>
                    <Badge variant="outline" className="ml-2 bg-violet-50 text-violet-600 border-violet-100 font-bold">
                      {course.quizzes?.length || 0}
                    </Badge>
                  </div>
                  <Button
                    onClick={openAddQuiz}
                    className="gap-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:brightness-105 text-white font-bold h-10 px-5 rounded-xl shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] text-sm"
                  >
                    <PlusCircle className="h-4.5 w-4.5" /> + Create Quiz
                  </Button>
                </CardHeader>
                <CardContent>
                  {course.quizzes?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AnimatePresence initial={false}>
                        {course.quizzes.map((quiz) => (
                          <motion.div
                            key={quiz.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col rounded-2xl border-2 border-gray-100 bg-white p-5 transition-all hover:border-violet-200 hover:shadow-md justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 font-bold text-violet-600">
                                  <CheckSquare className="h-5 w-5" />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge className={`${quiz.status === "published" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200" : "bg-gray-50 text-gray-600 hover:bg-gray-50 border-gray-200"} border shadow-none font-bold text-xs`}>
                                    {quiz.status === "published" ? "Published" : "Draft"}
                                  </Badge>
                                </div>
                              </div>
                              <h4 className="font-extrabold text-gray-800 text-lg leading-snug group-hover:text-violet-600 transition-colors mb-1">{quiz.title}</h4>
                              {quiz.description && <p className="text-sm text-gray-500 mb-4 line-clamp-2">{quiz.description}</p>}
                            </div>

                            <div className="pt-4 border-t border-gray-50">
                              <div className="grid grid-cols-2 gap-y-2 mb-4 text-xs font-semibold text-gray-500">
                                <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-violet-400" /> {quiz.time_limit} mins duration</div>
                                <div className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-amber-500" /> Pass: {quiz.passing_score}%</div>
                                <div className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-indigo-400" /> {quiz.question_count} Questions</div>
                                <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-teal-400" /> {quiz.max_attempts} Max Attempts</div>
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <Link href={`/teacher/quizzes/${quiz.id}`} className="flex-1">
                                  <Button variant="outline" size="sm" className="w-full gap-1 border-violet-100 text-violet-600 hover:bg-violet-50 font-bold">
                                    <Eye className="h-3.5 w-3.5" /> View/Analyze
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-gray-400 hover:bg-gray-50 hover:text-violet-600 h-9 w-9 rounded-lg"
                                  onClick={() => startEditQuiz(quiz)}
                                  title="Edit Quiz details and questions"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-gray-400 hover:bg-rose-50 hover:text-rose-600 h-9 w-9 rounded-lg"
                                  onClick={() => handleDeleteQuiz(quiz.id)}
                                  title="Delete Quiz"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-purple-100 shadow-inner">
                        <CheckSquare className="h-8 w-8 text-violet-500" />
                      </div>
                      <h3 className="mb-1 text-lg font-bold text-gray-700">No quizzes added yet</h3>
                      <p className="text-gray-500 text-sm max-w-xs">Launch customized assessments with multiple-choice questions for this course.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "assignments" && (
            <motion.div
              key="assignments"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {/* ── 3. Course Assignments Section ── */}
              <Card className="border-0 bg-white/80 shadow-xl backdrop-blur transition-all overflow-hidden rounded-2xl">
                <div className="h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
                <CardHeader className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-1 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full" />
                    <CardTitle className="text-xl font-bold text-gray-800">Course Assignments</CardTitle>
                    <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-600 border-amber-100 font-bold">
                      {course.assignments?.length || 0}
                    </Badge>
                  </div>
                  <Button
                    onClick={openAddAssignment}
                    className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-105 text-white font-bold h-10 px-5 rounded-xl shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] text-sm"
                  >
                    <PlusCircle className="h-4.5 w-4.5" /> + Create Assignment
                  </Button>
                </CardHeader>
                <CardContent>
                  {course.assignments?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AnimatePresence initial={false}>
                        {course.assignments.map((assignment) => (
                          <motion.div
                            key={assignment.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col rounded-2xl border-2 border-gray-100 bg-white p-5 transition-all hover:border-amber-200 hover:shadow-md justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 font-bold text-amber-600">
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge className={`${assignment.status === "published" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200" : "bg-gray-50 text-gray-600 hover:bg-gray-50 border-gray-200"} border shadow-none font-bold text-xs`}>
                                    {assignment.status === "published" ? "Published" : "Draft"}
                                  </Badge>
                                </div>
                              </div>
                              <h4 className="font-extrabold text-gray-800 text-lg leading-snug group-hover:text-amber-600 transition-colors mb-1">{assignment.title}</h4>
                              {assignment.description && <p className="text-sm text-gray-500 mb-4 line-clamp-2">{assignment.description}</p>}
                            </div>

                            <div className="pt-4 border-t border-gray-50">
                              <div className="grid grid-cols-2 gap-y-2 mb-4 text-xs font-semibold text-gray-500">
                                <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-amber-500" /> Due: {new Date(assignment.due_date).toLocaleDateString()}</div>
                                <div className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-indigo-500" /> Total Marks: {assignment.max_score || 100}</div>
                                <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-cyan-500" /> {assignment.submission_count || 0} Submissions</div>
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1">
                                  {assignment.file_url && (
                                    <a
                                      href={assignment.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-100 text-amber-600 hover:bg-amber-50 transition-colors"
                                      title="Download Attachment PDF"
                                    >
                                      <Download className="h-4 w-4" />
                                    </a>
                                  )}
                                  <Link href={`/teacher/assignments/${assignment.id}`}>
                                    <Button variant="outline" size="sm" className="gap-1 border-amber-100 text-amber-600 hover:bg-amber-50 font-bold">
                                      <Eye className="h-3.5 w-3.5" /> Grade
                                    </Button>
                                  </Link>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-gray-400 hover:bg-gray-50 hover:text-amber-600 h-9 w-9 rounded-lg"
                                    onClick={() => startEditAssignment(assignment)}
                                    title="Edit Assignment Details"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-gray-400 hover:bg-rose-50 hover:text-rose-600 h-9 w-9 rounded-lg"
                                    onClick={() => handleDeleteAssignment(assignment.id)}
                                    title="Delete Assignment"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100 shadow-inner">
                        <FileQuestion className="h-8 w-8 text-amber-500" />
                      </div>
                      <h3 className="mb-1 text-lg font-bold text-gray-700">No assignments added yet</h3>
                      <p className="text-gray-500 text-sm max-w-xs">Assign descriptive homework, essays, or code files to grade submissions.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
