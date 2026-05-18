"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { 
  FileText, Plus, Calendar, Clock, BookOpen, 
  CheckCircle, Users, LayoutDashboard, Loader2, ArrowRight,
  Paperclip, X, Download
} from "lucide-react"
import Link from "next/link"

interface Course {
  id: string
  title: string
  class: number | null
}

interface Assignment {
  id: string
  title: string
  course_title: string
  course_id: string
  course_class: number | null
  due_date: string
  status: string
  submission_count: number
  file_url?: string
}

export default function TeacherAssignmentsPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Show / Hide Form State
  const [showForm, setShowForm] = useState(false)

  // Class Filter State
  const [selectedClass, setSelectedClass] = useState<string>("all")

  // Form State
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [courseId, setCourseId] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Scroll & Glow Ref / State
  const formCardRef = useRef<HTMLDivElement>(null)
  const [highlightForm, setHighlightForm] = useState(false)

  useEffect(() => {
    // Sync class filter from URL / localStorage on mount
    const params = new URLSearchParams(window.location.search)
    const urlClass = params.get("class")
    const localClass = localStorage.getItem("assignment_class_filter")
    
    if (urlClass && ["6", "7", "8", "9", "10", "all"].includes(urlClass)) {
      setSelectedClass(urlClass)
    } else if (localClass && ["6", "7", "8", "9", "10", "all"].includes(localClass)) {
      setSelectedClass(localClass)
    }

    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [coursesRes, assignmentsRes] = await Promise.all([
        fetch("/api/teacher/courses"),
        fetch("/api/teacher/assignments")
      ])
      if (coursesRes.ok) setCourses(await coursesRes.json())
      if (assignmentsRes.ok) setAssignments(await assignmentsRes.json())
    } catch (e) {
      toast.error("Failed to load data.")
    } finally {
      setLoading(false)
    }
  }

  function scrollToForm() {
    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    setHighlightForm(true)
    setTimeout(() => {
      setHighlightForm(false)
    }, 2000)

    // Focus the select trigger after a brief delay so the scroll can complete
    setTimeout(() => {
      const selectTrigger = document.getElementById("course")
      if (selectTrigger) {
        (selectTrigger as HTMLElement).focus()
      }
    }, 500)
  }

  async function handleCreate() {
    if (!title || !courseId || !dueDate) {
      toast.warning("Please fill in all required fields.")
      return
    }

    // Validate file if selected
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast.error("Only PDF files are allowed.")
        return
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("File size must be under 5MB.")
        return
      }
    }

    setSubmitting(true)
    try {
      // Use FormData to support optional file upload
      const formData = new FormData()
      formData.append("title", title)
      formData.append("description", description)
      formData.append("courseId", courseId)
      formData.append("dueDate", dueDate)
      if (selectedFile) {
        formData.append("file", selectedFile)
      }

      const res = await fetch("/api/teacher/assignments", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        toast.success("Assignment created successfully!")
        setTitle("")
        setDescription("")
        setCourseId("")
        setDueDate("")
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
        setShowForm(false) // Hide form on successful publish
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to create assignment.")
      }
    } catch {
      toast.error("Error creating assignment.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    if (file && file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed.")
      e.target.value = ""
      return
    }
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB.")
      e.target.value = ""
      return
    }
    setSelectedFile(file)
  }

  // Grouping & Filtering Logic
  const filteredAssignments = assignments.filter(a => {
    if (selectedClass === "all") return true
    const classNum = parseInt(selectedClass, 10)
    return a.course_class === classNum
  })

  const sectionHeader = selectedClass === "all" ? "Active Assignments" : `Class ${selectedClass} Assignments`

  if (loading) return <div className="p-8 space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 rounded-3xl" /></div>

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between px-1">
        <div>
           <h1 className="text-3xl font-black text-gray-800 tracking-tight">Assignment Lab</h1>
           <p className="text-gray-500 font-medium">Create and manage student assessments</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Class Filter Dropdown */}
          <Select 
            value={selectedClass} 
            onValueChange={(val) => {
              setSelectedClass(val)
              localStorage.setItem("assignment_class_filter", val)
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

          {/* Create Assignment Button with dynamic preselection */}
          <Button
            onClick={() => {
              if (showForm) {
                setShowForm(false)
              } else {
                setShowForm(true)
                
                // Smart Default preselection on opening the form
                if (selectedClass !== "all") {
                  const classNum = parseInt(selectedClass, 10)
                  const matchingCourse = courses.find(c => {
                    const courseClass = typeof c.class === 'number' ? c.class : parseInt(String(c.class).replace(/\D/g, ""), 10)
                    return courseClass === classNum && !assignments.some(a => String(a.course_id) === String(c.id))
                  })
                  if (matchingCourse) {
                    setCourseId(String(matchingCourse.id))
                  } else {
                    setCourseId("")
                  }
                } else {
                  setCourseId("")
                }

                setTimeout(() => {
                  scrollToForm()
                }, 100)
              }
            }}
            className="w-full sm:w-auto h-[44px] px-6 rounded-[12px] bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white font-semibold text-base shadow-[0_8px_20px_rgba(139,92,246,0.25)] hover:shadow-[0_12px_24px_rgba(139,92,246,0.35)] hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] transition-all duration-300 ease-in-out flex items-center justify-center gap-2"
          >
            {showForm ? (
              <>
                <X className="h-5 w-5" /> Hide Form
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" /> Create Assignment
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Responsive Columns */}
      <div className={`grid gap-8 transition-all duration-500 ease-in-out ${
        showForm ? "grid-cols-1 lg:grid-cols-[400px_1fr]" : "grid-cols-1"
      }`}>
        
        {/* Animated Form Card Wrapper */}
        <AnimatePresence mode="wait">
          {showForm && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="space-y-6"
            >
               <div ref={formCardRef} className="transition-all duration-500">
                 <Card className={`border-0 bg-white/80 shadow-2xl backdrop-blur overflow-hidden relative transition-all duration-500 ${
                   highlightForm ? "ring-4 ring-purple-500 ring-offset-2 shadow-purple-500/50 scale-[1.02]" : ""
                 }`}>
                    <div className="h-2 bg-gradient-to-r from-violet-500 to-indigo-600" />
                    
                    {/* Small Close Button */}
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="absolute top-5 right-5 text-gray-400 hover:text-rose-500 transition-colors p-1.5 rounded-full hover:bg-rose-50"
                      title="Close Form"
                    >
                      <X className="h-5 w-5" />
                    </button>

                    <CardHeader className="pr-12">
                       <CardTitle className="text-xl font-bold flex items-center gap-2">
                          <Plus className="h-5 w-5 text-violet-500" /> New Assignment
                       </CardTitle>
                       <CardDescription>Launch a new task for your students</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                       <div className="space-y-2">
                          <Label htmlFor="course" className="text-xs font-bold uppercase text-gray-400">Select Course</Label>
                          <Select value={courseId} onValueChange={setCourseId}>
                             <SelectTrigger id="course" className="rounded-xl border-gray-100 bg-gray-50/50">
                                <SelectValue placeholder="Choose a course..." />
                             </SelectTrigger>
                             <SelectContent>
                                {courses.map(c => {
                                  const hasAssignment = assignments.some(a => String(a.course_id) === String(c.id))
                                  return (
                                    <SelectItem key={c.id} value={c.id.toString()} disabled={hasAssignment}>
                                      {c.title} {hasAssignment && <span className="text-gray-400 ml-1">(Has Assignment)</span>}
                                    </SelectItem>
                                  )
                                })}
                             </SelectContent>
                          </Select>
                       </div>

                       <div className="space-y-2">
                          <Label htmlFor="title" className="text-xs font-bold uppercase text-gray-400">Assignment Title</Label>
                          <Input 
                            id="title" 
                            placeholder="e.g. Mid-term Research Project" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            className="rounded-xl border-gray-100 bg-gray-50/50"
                          />
                       </div>

                       <div className="space-y-2">
                          <Label htmlFor="due" className="text-xs font-bold uppercase text-gray-400">Due Date</Label>
                          <Input 
                            id="due" 
                            type="date" 
                            value={dueDate} 
                            onChange={e => setDueDate(e.target.value)} 
                            className="rounded-xl border-gray-100 bg-gray-50/50"
                          />
                       </div>

                       <div className="space-y-2">
                          <Label htmlFor="desc" className="text-xs font-bold uppercase text-gray-400">Instructions (Optional)</Label>
                          <Textarea 
                            id="desc" 
                            placeholder="Explain the requirements..." 
                            rows={4} 
                            value={description} 
                            onChange={e => setDescription(e.target.value)}
                            className="rounded-xl border-gray-100 bg-gray-50/50 resize-none"
                          />
                       </div>

                       {/* PDF Upload */}
                       <div className="space-y-2">
                          <Label htmlFor="pdf" className="text-xs font-bold uppercase text-gray-400">
                            Upload Assignment PDF <span className="text-gray-300 normal-case font-normal">(optional)</span>
                          </Label>
                          <div className="relative">
                            <input
                              ref={fileInputRef}
                              id="pdf"
                              type="file"
                              accept="application/pdf"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-500 hover:border-violet-300 hover:bg-violet-50/30 transition-colors"
                            >
                              <Paperclip className="h-4 w-4 shrink-0 text-violet-400" />
                              <span className="flex-1 text-left truncate">
                                {selectedFile ? selectedFile.name : "Click to select PDF file..."}
                              </span>
                              {selectedFile && (
                                <X
                                  className="h-4 w-4 shrink-0 text-gray-400 hover:text-rose-500"
                                  onClick={e => {
                                    e.stopPropagation()
                                    setSelectedFile(null)
                                    if (fileInputRef.current) fileInputRef.current.value = ""
                                  }}
                                />
                              )}
                            </button>
                            {selectedFile && (
                              <p className="mt-1 text-xs text-gray-400">
                                {(selectedFile.size / 1024).toFixed(1)} KB · PDF
                              </p>
                            )}
                          </div>
                       </div>

                       <div className="flex gap-3 mt-4 pt-2">
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={() => setShowForm(false)}
                            className="flex-1 border-gray-200 text-gray-500 font-bold"
                          >
                             Cancel
                          </Button>
                          <Button 
                            onClick={handleCreate} 
                            disabled={submitting} 
                            className="flex-[2] bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold"
                          >
                             {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create & Publish"}
                          </Button>
                       </div>
                    </CardContent>
                 </Card>
               </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Assignments List Section */}
        <section className="space-y-6 transition-all duration-500 ease-in-out">
           <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-800">{sectionHeader}</h2>
              <Badge variant="outline" className="bg-violet-50 text-violet-600 border-violet-100">{filteredAssignments.length}</Badge>
           </div>

           {filteredAssignments.length > 0 ? (
              <div className={`grid gap-6 transition-all duration-500 ease-in-out ${
                showForm ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              }`}>
                 {filteredAssignments.map((a, idx) => (
                   <motion.div 
                     key={a.id} 
                     layout
                     initial={{ opacity: 0, y: 10 }} 
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ duration: 0.3 }}
                   >
                     <Card className="group h-full border-0 bg-white/80 shadow-xl backdrop-blur transition-all hover:shadow-2xl hover:scale-[1.01] overflow-hidden rounded-2xl">
                        <CardContent className="p-6">
                           <div className="mb-4 flex items-start justify-between">
                              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-violet-50 text-violet-500">
                                 <FileText className="h-5 w-5" />
                              </div>
                              <Badge className="bg-emerald-100 text-emerald-700 border-0 font-bold">{a.submission_count} Submitted</Badge>
                           </div>
                           
                           <div className="mb-6">
                              <p className="text-xs font-bold text-violet-500 mb-1">{a.course_title}</p>
                              <h3 className="text-lg font-black text-gray-800 group-hover:text-violet-600 transition-colors leading-snug">{a.title}</h3>
                           </div>

                           <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                              <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                 <Calendar className="h-3.5 w-3.5" />
                                 <span>Due: {new Date(a.due_date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {a.file_url && (
                                  <a
                                    href={a.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-violet-600 hover:bg-violet-50 transition-colors"
                                    title="Download Assignment PDF"
                                  >
                                    <Download className="h-3.5 w-3.5" /> PDF
                                  </a>
                                )}
                                <Button asChild variant="ghost" size="sm" className="text-violet-600 hover:bg-violet-50 font-bold">
                                   <Link href={`/dashboard/teacher/assignments/${a.id}`}>
                                      Grade <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                   </Link>
                                </Button>
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                   </motion.div>
                 ))}
              </div>
           ) : (
             <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-[40px] border-2 border-dashed border-gray-100">
                <FileText className="h-12 w-12 text-gray-300 mb-3" />
                <h3 className="mb-2 text-xl font-bold text-gray-800">No assignments found</h3>
                <p className="text-gray-500 text-sm max-w-xs text-center px-4">There are no assignments available for the selected class.</p>
             </div>
           )}
        </section>
      </div>
    </div>
  )
}
