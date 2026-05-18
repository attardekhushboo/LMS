"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen, Users, FileText, CheckSquare, PlusCircle, Star, Rocket,
  TrendingUp, Award, Clock, ClipboardList, CheckCircle, Search, X
} from "lucide-react"

interface Course {
  id: string
  title: string
  enrolled_count: number
  status: string
  class: number | null
}

interface Deadline {
  id: string
  type: "assignment" | "grading"
  title: string
  courseTitle: string
  courseClass: number | string | null
  deadlineDate: string
}

interface TeachingAnalytics {
  averageQuizScore: number
  courseCompletion: number
  assignmentSubmissionRate: number
  studentParticipation: number
}

interface Activity {
  type: string
  message: string
  timestamp: string
}

interface DashboardData {
  totalCourses: number
  totalStudents: number
  totalQuizzes: number
  totalAssignments: number
  pendingEnrollments: number
  pendingSubmissions: number
  recentCourses: Course[]
  teachingAnalytics: TeachingAnalytics
  upcomingDeadlines: Deadline[]
  recentActivities: Activity[]
}

function getDeadlineStatus(dateString: string) {
  const diffTime = new Date(dateString).getTime() - new Date().getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return {
      text: "Overdue",
      colorClass: "text-red-600 font-black",
      barBg: "bg-red-500",
      containerBg: "bg-red-50/40 border-red-100/50",
      ping: true
    }
  } else if (diffDays === 0) {
    return {
      text: "Due Today",
      colorClass: "text-red-600 font-black",
      barBg: "bg-red-500",
      containerBg: "bg-red-50/40 border-red-100/50",
      ping: true
    }
  } else if (diffDays === 1) {
    return {
      text: "Due Tomorrow",
      colorClass: "text-orange-600 font-black",
      barBg: "bg-orange-500",
      containerBg: "bg-orange-50/40 border-orange-100/50",
      ping: false
    }
  } else if (diffDays <= 3) {
    return {
      text: `Due in ${diffDays} days`,
      colorClass: "text-orange-600 font-black",
      barBg: "bg-orange-500",
      containerBg: "bg-orange-50/40 border-orange-100/50",
      ping: false
    }
  } else {
    return {
      text: diffDays <= 7 ? "Next Week" : "Upcoming",
      colorClass: "text-blue-600 font-black",
      barBg: "bg-blue-500",
      containerBg: "bg-blue-50/40 border-blue-100/50",
      ping: false
    }
  }
}

function formatRelativeTime(dateString: string) {
  const diffTime = new Date().getTime() - new Date(dateString).getTime()
  const diffMinutes = Math.floor(diffTime / (1000 * 60))
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) {
    return "Just now"
  } else if (diffMinutes < 60) {
    return `${diffMinutes} mins ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  } else if (diffDays === 1) {
    return "Yesterday"
  } else {
    return `${diffDays} days ago`
  }
}

function getActivityMeta(type: string) {
  switch (type) {
    case "submission":
      return {
        icon: CheckCircle,
        bgClass: "bg-emerald-500",
      }
    case "enrollment":
      return {
        icon: Users,
        bgClass: "bg-blue-500",
      }
    case "quiz_created":
      return {
        icon: ClipboardList,
        bgClass: "bg-purple-500",
      }
    case "assignment_published":
      return {
        icon: FileText,
        bgClass: "bg-orange-500",
      }
    case "course_published":
      return {
        icon: BookOpen,
        bgClass: "bg-cyan-500",
      }
    case "module_added":
      return {
        icon: PlusCircle,
        bgClass: "bg-indigo-500",
      }
    case "graded":
    default:
      return {
        icon: CheckSquare,
        bgClass: "bg-teal-500",
      }
  }
}

function normalizeClass(value: any): string {
  if (value === null || value === undefined) return ""
  const str = String(value).trim().toLowerCase()
  const numericMatch = str.match(/\d+/)
  if (numericMatch) {
    return numericMatch[0]
  }
  return str
}

function formatClassDisplay(cls: string): string {
  if (!cls) return ""
  if (/^\d+$/.test(cls)) {
    return `Class ${cls}`
  }
  return cls
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export default function TeacherDashboard() {
  const { data: session } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters state
  const [searchQuery, setSearchQuery] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("recent")

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/teacher/dashboard")
        if (res.ok) {
          const json = await res.json()
          setData(json)
        } else {
          setError("Failed to load dashboard data.")
        }
      } catch {
        setError("Error connecting to server.")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Dynamic greeting logic
  const hour = new Date().getHours()
  let greetingWord = "Good Evening"
  if (hour < 12) greetingWord = "Good Morning"
  else if (hour < 18) greetingWord = "Good Afternoon"

  const teacherName = session?.user?.name || "Demo Teacher"

  // Contextual pending summary banner
  let secondaryGreeting = "Create amazing courses and inspire your students!"
  if (data) {
    if (data.pendingSubmissions > 0) {
      secondaryGreeting = `You have ${data.pendingSubmissions} assignment${data.pendingSubmissions === 1 ? "" : "s"} to grade today.`
    } else if (data.pendingEnrollments > 0) {
      secondaryGreeting = `${data.pendingEnrollments} enrollment request${data.pendingEnrollments === 1 ? "" : "s"} are waiting for approval.`
    } else {
      secondaryGreeting = "Your courses are all caught up! Ready to create a new module?"
    }
  }

  // Clickable stats config
  const stats = [
    {
      label: "Enrollment Approvals",
      value: data?.pendingEnrollments || 0,
      icon: Users,
      gradient: "from-emerald-500 to-teal-500",
      link: "/dashboard/teacher/enrollments",
    },
    {
      label: "My Courses",
      value: data?.totalCourses || 0,
      icon: BookOpen,
      gradient: "from-cyan-500 to-blue-500",
      link: "/dashboard/teacher/courses",
    },
    {
      label: "Total Students",
      value: data?.totalStudents || 0,
      icon: Star,
      gradient: "from-violet-500 to-purple-500",
      link: "/dashboard/teacher/enrollments",
    },
    {
      label: "Quizzes Created",
      value: data?.totalQuizzes || 0,
      icon: CheckSquare,
      gradient: "from-amber-500 to-orange-500",
      link: "/dashboard/teacher/quizzes",
    },
    {
      label: "Pending Reviews",
      value: data?.pendingSubmissions || 0,
      icon: FileText,
      gradient: "from-rose-500 to-pink-500",
      link: "/dashboard/teacher/assignments",
    },
  ]

  // Get unique classes dynamically from actual courses, normalized to "Class X" display format
  const dynamicClasses = Array.from(
    new Set(
      (data?.recentCourses || [])
        .map(course => {
          const norm = normalizeClass(course.class)
          return norm ? formatClassDisplay(norm) : ""
        })
        .filter(c => c !== "")
    )
  ).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ""), 10)
    const numB = parseInt(b.replace(/\D/g, ""), 10)
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB
    }
    return a.localeCompare(b)
  })

  // Filtering & Sorting Recent Courses
  const filteredCourses = (data?.recentCourses || [])
    .filter(course => {
      const matchesSearch = 
        course.title.toLowerCase().includes(searchQuery.toLowerCase())

      const courseClassDisplay = formatClassDisplay(normalizeClass(course.class))
      const matchesClass = classFilter === "all" || courseClassDisplay === classFilter

      const isApproved = course.status === "approved"
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "published" && isApproved) || 
        (statusFilter === "draft" && !isApproved && course.status !== "pending")

      return matchesSearch && matchesClass && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === "alpha") {
        return a.title.localeCompare(b.title)
      } else if (sortBy === "students") {
        return b.enrolled_count - a.enrolled_count
      } else {
        return 0 // Default recent database sorting
      }
    })

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Rocket className="h-12 w-12 text-cyan-500" />
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <BookOpen className="h-12 w-12 text-rose-400" />
        <p className="text-lg font-semibold text-gray-700">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Greeting Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 p-8 text-white shadow-2xl"
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-black tracking-tight">{greetingWord}, {teacherName}!</h1>
            <p className="text-white/95 font-medium">{secondaryGreeting}</p>
          </div>
          <Link href="/dashboard/teacher/courses/new">
            <Button size="lg" className="gap-2 bg-white font-extrabold text-cyan-600 hover:bg-white/90 shadow-md">
              <PlusCircle className="h-5 w-5" />
              Create New Course
            </Button>
          </Link>
        </div>

        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute right-20 top-4 hidden md:block"
        >
          <Star className="h-6 w-6 fill-amber-300 text-amber-300" />
        </motion.div>
      </motion.div>

      {/* SECTION 2: TOP SUMMARY AREA */}
      <div className="grid gap-6 lg:grid-cols-10 items-start w-full">
        {/* Left Side (70%): Statistics Cards */}
        <div className="lg:col-span-7 w-full">
          <div 
            className="grid gap-[20px]"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.03 }}
                className="w-full"
              >
                <Link href={stat.link}>
                  <Card className="h-full border-0 bg-white/80 shadow-xl backdrop-blur transition-all duration-300 hover:shadow-2xl cursor-pointer relative group rounded-2xl overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${stat.gradient}`} />
                    <CardContent className="p-5 pl-7">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-md group-hover:scale-110 transition-transform duration-300`}>
                           <stat.icon className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-3xl font-bold text-gray-800 tracking-tight leading-none mb-1.5">{stat.value}</p>
                          <p className="text-sm font-medium text-gray-500 leading-normal">{stat.label}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Side (30%): Teaching Analytics */}
        <div className="lg:col-span-3 w-full">
          <Card className="border-0 bg-white/80 shadow-xl backdrop-blur rounded-3xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-black text-gray-800">
                <Award className="h-5 w-5 text-violet-500" /> Teaching Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {data?.teachingAnalytics && (
                data.teachingAnalytics.averageQuizScore === 0 &&
                data.teachingAnalytics.courseCompletion === 0 &&
                data.teachingAnalytics.assignmentSubmissionRate === 0 &&
                data.teachingAnalytics.studentParticipation === 0
              ) ? (
                <div className="py-6 text-center text-sm font-semibold text-gray-400">
                  Analytics will appear once students begin interacting with your courses.
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-500 mb-1.5">
                      <span>Average Quiz Score</span>
                      <span className="text-emerald-600 font-extrabold">{data?.teachingAnalytics?.averageQuizScore || 0}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${data?.teachingAnalytics?.averageQuizScore || 0}%` }} 
                        transition={{ duration: 1.2, ease: "easeOut" }} 
                        className="h-full bg-emerald-500 rounded-full" 
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-500 mb-1.5">
                      <span>Course Completion</span>
                      <span className="text-violet-600 font-extrabold">{data?.teachingAnalytics?.courseCompletion || 0}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${data?.teachingAnalytics?.courseCompletion || 0}%` }} 
                        transition={{ duration: 1.2, ease: "easeOut" }} 
                        className="h-full bg-violet-500 rounded-full" 
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-500 mb-1.5">
                      <span>Assignment Submission Rate</span>
                      <span className="text-blue-600 font-extrabold">{data?.teachingAnalytics?.assignmentSubmissionRate || 0}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${data?.teachingAnalytics?.assignmentSubmissionRate || 0}%` }} 
                        transition={{ duration: 1.2, ease: "easeOut" }} 
                        className="h-full bg-blue-500 rounded-full" 
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-500 mb-1.5">
                      <span>Student Participation</span>
                      <span className="text-amber-600 font-extrabold">{data?.teachingAnalytics?.studentParticipation || 0}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${data?.teachingAnalytics?.studentParticipation || 0}%` }} 
                        transition={{ duration: 1.2, ease: "easeOut" }} 
                        className="h-full bg-amber-500 rounded-full" 
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION 3: MAIN CONTENT AREA (Deadlines & Recent Activity side-by-side) */}
      <div className="grid gap-6 lg:grid-cols-10 items-stretch w-full">
        {/* Left Column (40%): Upcoming Deadlines */}
        <div className="lg:col-span-4 flex flex-col min-w-0">
          <Card className="border-0 bg-white shadow-xl backdrop-blur rounded-3xl overflow-hidden flex flex-col h-[540px]">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="flex items-center gap-2 text-lg font-black text-gray-800">
                <Clock className="h-5 w-5 text-cyan-500" /> Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto pr-2 pb-6 space-y-4">
              {data?.upcomingDeadlines && data.upcomingDeadlines.length > 0 ? (
                data.upcomingDeadlines.map((deadline) => {
                  const status = getDeadlineStatus(deadline.deadlineDate)
                  const linkPath = "/dashboard/teacher/assignments"

                  return (
                    <div 
                      key={deadline.id}
                      className={`flex items-start gap-3 p-3 border rounded-2xl relative overflow-hidden group ${status.containerBg}`}
                    >
                      <span className={`absolute left-0 top-0 w-1.5 h-full ${status.barBg}`} />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black text-gray-800 truncate">{deadline.title}</h4>
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                          Course: {deadline.courseTitle} {deadline.courseClass ? `(Class ${deadline.courseClass})` : ""}
                        </p>
                        <div className={`flex items-center gap-1 mt-1 text-[10px] ${status.colorClass}`}>
                          {status.ping && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />}
                          <span>{status.text}</span>
                        </div>
                      </div>
                      <Link href={linkPath} className={`text-[10px] font-extrabold hover:underline ${status.colorClass.split(" ")[0]}`}>
                        View
                      </Link>
                    </div>
                  )
                })
              ) : (
                <div className="py-12 text-center text-sm font-semibold text-gray-400">
                  No upcoming deadlines.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (60%): Recent Activity */}
        <div className="lg:col-span-6 flex flex-col min-w-0">
          <Card className="border-0 bg-white shadow-xl backdrop-blur rounded-3xl overflow-hidden flex flex-col h-[540px]">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="flex items-center gap-2 text-lg font-black text-gray-800">
                <TrendingUp className="h-5 w-5 text-emerald-500" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto px-6 pb-6">
              {data?.recentActivities && data.recentActivities.length > 0 ? (
                <div className="relative border-l-2 border-slate-100/80 ml-3.5 space-y-6">
                  {data.recentActivities.map((act, index) => {
                    const meta = getActivityMeta(act.type)
                    const IconComp = meta.icon
                    return (
                      <div key={index} className="relative pl-6">
                        <span className={`absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full ${meta.bgClass} ring-4 ring-white shadow-sm`}>
                          <IconComp className="h-2 w-2 text-white" />
                        </span>
                        <p className="text-xs font-bold text-gray-800 leading-normal">{act.message}</p>
                        <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block">
                          {formatRelativeTime(act.timestamp)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-16 flex flex-col items-center justify-center text-center px-4">
                  <TrendingUp className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-gray-500">No recent activity available.</p>
                  <p className="text-xs text-gray-400 font-medium mt-1">
                    New submissions, enrollments, and course updates will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION 4: QUICK ACTION CARDS */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch w-full">
        <motion.div whileHover={{ scale: 1.03, y: -4 }} transition={{ duration: 0.2 }} className="h-full flex w-full">
          <Link href="/dashboard/teacher/quizzes" className="w-full flex">
            <Card className="group cursor-pointer border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xl hover:shadow-2xl overflow-hidden relative rounded-[20px] w-full min-h-[140px] flex flex-col justify-between">
              <CardContent className="flex flex-col p-[20px] h-full w-full justify-between">
                {/* Top Row: Icon on Left, Status Badge on Right */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-[16px] bg-white/20 shadow-inner group-hover:scale-110 transition-transform duration-300">
                    <CheckSquare className="h-[28px] w-[28px] text-white" />
                  </div>
                  <Badge className="bg-white/20 text-white backdrop-blur border-0 font-bold px-2.5 py-1 text-[11px] rounded-full uppercase tracking-wider shadow-sm">
                    New
                  </Badge>
                </div>

                {/* Bottom Row: Content Area */}
                <div className="mt-3">
                  <h3 className="font-bold text-[18px] text-white tracking-tight leading-[1.3]">
                    Manage Quizzes
                  </h3>
                  <p className="text-[13px] font-medium text-white/90 leading-[1.4] mt-1.5">
                    Create and edit course quizzes
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div whileHover={{ scale: 1.03, y: -4 }} transition={{ duration: 0.2 }} className="h-full flex w-full">
          <Link href="/dashboard/teacher/assignments" className="w-full flex">
            <Card className="group cursor-pointer border-0 bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-xl hover:shadow-2xl overflow-hidden relative rounded-[20px] w-full min-h-[140px] flex flex-col justify-between">
              <CardContent className="flex flex-col p-[20px] h-full w-full justify-between">
                {/* Top Row: Icon on Left, Status Badge on Right */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-[16px] bg-white/20 shadow-inner group-hover:scale-110 transition-transform duration-300">
                    <FileText className="h-[28px] w-[28px] text-white" />
                  </div>
                  <div>
                    {data?.pendingSubmissions && data.pendingSubmissions > 0 ? (
                      <Badge className="bg-rose-500 text-white font-bold px-2.5 py-1 text-[11px] rounded-full uppercase tracking-wider shadow-md animate-pulse">
                        {data.pendingSubmissions} Pending
                      </Badge>
                    ) : (
                      <Badge className="bg-white/20 text-white backdrop-blur border-0 font-bold px-2.5 py-1 text-[11px] rounded-full uppercase tracking-wider shadow-sm">
                        Good
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Content Area */}
                <div className="mt-3">
                  <h3 className="font-bold text-[18px] text-white tracking-tight leading-[1.3]">
                    Grade Assignments
                  </h3>
                  <p className="text-[13px] font-medium text-white/90 leading-[1.4] mt-1.5">
                    Review and mark student work
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div whileHover={{ scale: 1.03, y: -4 }} transition={{ duration: 0.2 }} className="h-full flex w-full">
          <Link href="/dashboard/teacher/enrollments" className="w-full flex">
            <Card className="group cursor-pointer border-0 bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-xl hover:shadow-2xl overflow-hidden relative rounded-[20px] w-full min-h-[140px] flex flex-col justify-between">
              <CardContent className="flex flex-col p-[20px] h-full w-full justify-between">
                {/* Top Row: Icon on Left, Status Badge on Right */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-[16px] bg-white/20 shadow-inner group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-[28px] w-[28px] text-white" />
                  </div>
                  <div>
                    {data?.pendingEnrollments && data.pendingEnrollments > 0 ? (
                      <Badge className="bg-amber-400 text-slate-900 font-bold px-2.5 py-1 text-[11px] rounded-full uppercase tracking-wider shadow-md">
                        {data.pendingEnrollments} Requests
                      </Badge>
                    ) : (
                      <Badge className="bg-white/20 text-white backdrop-blur border-0 font-bold px-2.5 py-1 text-[11px] rounded-full uppercase tracking-wider shadow-sm">
                        Active
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Content Area */}
                <div className="mt-3">
                  <h3 className="font-bold text-[18px] text-white tracking-tight leading-[1.3]">
                    Student Enrollments
                  </h3>
                  <p className="text-[13px] font-medium text-white/90 leading-[1.4] mt-1.5">
                    Approve or reject student entries
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
