"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { 
  BookOpen, Trophy, CheckSquare, FileText, Play, Star, Rocket, Clock, Award, 
  Search, Flame, ShieldAlert, Sparkles, Compass, CheckCircle2, ChevronRight, RefreshCw, BarChart2
} from "lucide-react"

interface CourseItem {
  id: string
  title: string
  progress: number
  thumbnail?: string
  lastAccessed: string
  nextLesson: string
}

interface DeadlineItem {
  id: string
  type: "assignment" | "quiz"
  title: string
  courseTitle: string
  deadlineDate: string
}

interface ActivityItem {
  type: "enrollment" | "submission" | "quiz" | "certificate"
  message: string
  timestamp: string
}

interface BadgeItem {
  name: string
  icon: string
  description: string
}

interface StudentDashboardData {
  studentName: string
  enrolledCourses: number
  totalCourses: number
  completedCourses: number
  totalQuizzes: number
  completedQuizzes: number
  totalAssignments: number
  completedAssignments: number
  certificates: number
  recentCourses: CourseItem[]
  upcomingDeadlines: DeadlineItem[]
  recentActivities: ActivityItem[]
  learningAnalytics: {
    averageQuizScore: number
    overallCourseCompletion: number
    assignmentSubmissionRate: number
    weeklyStudyProgress: number
  }
  gamification: {
    streak: number
    xp: number
    badges: BadgeItem[]
  }
  tasksDueThisWeek: number
  availableQuizzesCount: number
  pendingAssignmentsCount: number
}

const badgeIconMap: Record<string, any> = {
  Rocket: Rocket,
  Sparkles: Sparkles,
  CheckSquare: CheckSquare,
  Award: Award,
  Trophy: Trophy,
}

function formatRelativeTime(dateStr: string) {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    if (diffMs < 0) return "just now"
    const diffSec = Math.floor(diffMs / 1000)
    if (diffSec < 60) return "just now"
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDays = Math.floor(diffHr / 24)
    if (diffDays === 1) return "yesterday"
    return `${diffDays} days ago`
  } catch {
    return "recently"
  }
}

function formatDeadlineDate(dateStr: string) {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      hour: "2-digit", 
      minute: "2-digit" 
    })
  } catch {
    return dateStr
  }
}

function getDeadlinePriority(dateStr: string) {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) {
      return { label: "Overdue", color: "bg-rose-100 text-rose-700 border-rose-200" }
    }
    if (diffDays === 1) {
      return { label: "Today", color: "bg-rose-500 text-white border-rose-600 font-extrabold" }
    }
    if (diffDays === 2) {
      return { label: "Tomorrow", color: "bg-amber-500 text-white border-amber-600 font-extrabold" }
    }
    if (diffDays <= 7) {
      return { label: "This Week", color: "bg-cyan-500 text-white border-cyan-600 font-extrabold" }
    }
    return { label: "Upcoming", color: "bg-gray-100 text-gray-700 border-gray-200" }
  } catch {
    return { label: "Upcoming", color: "bg-gray-100 text-gray-700 border-gray-200" }
  }
}

export default function StudentDashboard() {
  const [data, setData] = useState<StudentDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const getGreeting = () => {
    const hrs = new Date().getHours()
    if (hrs < 12) return "Good Morning"
    if (hrs < 18) return "Good Afternoon"
    return "Good Evening"
  }

  async function fetchDashboardData() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/student/dashboard")
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        setError("Failed to load dashboard metrics.")
      }
    } catch {
      setError("Error connecting to server. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const stats = [
    {
      label: "Courses Enrolled",
      value: `${data?.enrolledCourses || 0} / ${data?.totalCourses || 0}`,
      icon: BookOpen,
      gradient: "from-violet-500 to-purple-500",
      bgGradient: "from-violet-50 to-purple-50",
      link: "/dashboard/student/courses",
      accent: "bg-violet-500",
    },
    {
      label: "Quizzes Completed",
      value: `${data?.completedQuizzes || 0}/${data?.totalQuizzes || 0}`,
      icon: CheckSquare,
      gradient: "from-cyan-500 to-blue-500",
      bgGradient: "from-cyan-50 to-blue-50",
      link: "/dashboard/student/quizzes",
      accent: "bg-cyan-500",
    },
    {
      label: "Assignments Done",
      value: `${data?.completedAssignments || 0}/${data?.totalAssignments || 0}`,
      icon: FileText,
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-50 to-orange-50",
      link: "/dashboard/student/assignments",
      accent: "bg-amber-500",
    },
    {
      label: "Certificates Earned",
      value: data?.certificates || 0,
      icon: Trophy,
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50 to-teal-50",
      link: "/dashboard/student/certificates",
      accent: "bg-emerald-500",
    },
  ]

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        >
          <Rocket className="h-14 w-14 text-violet-500" />
        </motion.div>
        <p className="text-sm font-extrabold text-violet-600 animate-pulse">Launching Learning Workspace...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <div className="h-16 w-16 bg-rose-50 flex items-center justify-center rounded-2xl border border-rose-100">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
        </div>
        <h3 className="text-xl font-extrabold text-gray-800">Connection Failed</h3>
        <p className="text-sm font-medium text-gray-500 max-w-sm">{error}</p>
        <Button onClick={fetchDashboardData} className="gap-2 bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold hover:shadow-lg transition-all rounded-xl">
          <RefreshCw className="h-4 w-4" />
          Retry Connection
        </Button>
      </div>
    )
  }

  // Client-side search filters the active/continuing courses
  const filteredCourses = data?.recentCourses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Personalized Hero Greeting Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-pink-600 to-rose-500 p-8 text-white shadow-2xl"
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl animate-pulse" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl animate-pulse" />
        
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 fill-amber-300 text-amber-300 animate-bounce" />
              Dynamic Student Dashboard
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {getGreeting()}, {data?.studentName}!
            </h1>
            <p className="text-white/90 text-sm font-medium max-w-xl">
              {data?.tasksDueThisWeek && data.tasksDueThisWeek > 0 
                ? `You have ${data.tasksDueThisWeek} assignment${data.tasksDueThisWeek > 1 ? "s" : ""} or quiz${data.tasksDueThisWeek > 1 ? "zes" : ""} due this week. Let's make some progress!`
                : "Your week is completely clear! Ready to learn something new today?"}
            </p>
          </div>
          <Link href="/dashboard/student/courses">
            <Button size="lg" className="gap-2 bg-white font-extrabold text-violet-600 hover:bg-white/95 rounded-2xl shadow-xl transition-transform hover:scale-103">
              <Play className="h-5 w-5 fill-violet-600" />
              Browse Courses
            </Button>
          </Link>
        </div>

        {/* Floating animated details */}
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-24 top-6 hidden lg:block"
        >
          <Star className="h-6 w-6 fill-amber-300 text-amber-300" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 5, repeat: Infinity, delay: 0.8, ease: "easeInOut" }}
          className="absolute right-48 bottom-6 hidden lg:block"
        >
          <Star className="h-4 w-4 fill-cyan-200 text-cyan-200" />
        </motion.div>
      </motion.div>

      {/* 2. Clickable Statistics Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <Link href={stat.link}>
              <Card className="group relative overflow-hidden border border-gray-100 bg-white/90 shadow-lg backdrop-blur-sm transition-all hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer">
                {/* Visual Accent Line */}
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${stat.accent}`} />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                      <p className="text-2xl font-black text-gray-800 tracking-tight">{stat.value}</p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.gradient} text-white shadow-md transition-transform group-hover:scale-110`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Main 2-Column Responsive Dashboard Layout */}
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left Column (3/5 width on desktop - Course Progress & Learning Analytics) */}
        <div className="space-y-8 lg:col-span-3">
          
          {/* A. Search & Continue Learning Horizontal Carousel */}
          <Card className="border border-gray-100/80 bg-white/95 shadow-xl backdrop-blur-md rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-xl font-extrabold text-gray-800">
                  <BookOpen className="h-5.5 w-5.5 text-violet-500" />
                  Continue Learning
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-gray-400">
                  Jump right back into your active modules
                </CardDescription>
              </div>
              <div className="relative w-full sm:max-w-[240px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 rounded-xl border-gray-100 bg-gray-50/50 text-xs font-medium placeholder-gray-400 focus:bg-white focus:ring-violet-500"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredCourses.length > 0 ? (
                <div className="flex gap-6 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin scrollbar-thumb-violet-100 scrollbar-track-transparent">
                  {filteredCourses.map((course, index) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.08 }}
                      className="min-w-[280px] sm:min-w-[320px] max-w-[340px] snap-start shrink-0"
                    >
                      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-100 via-pink-50 to-rose-100 p-0.5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                        <div className="rounded-[14px] bg-white p-5 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-extrabold text-gray-800 text-sm truncate group-hover:text-violet-600 transition-colors">
                                {course.title}
                              </h3>
                              <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
                                Accessed {formatRelativeTime(course.lastAccessed)}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-bold text-violet-600">
                              Active
                            </span>
                          </div>

                          {/* Next Lesson Indicator */}
                          <div className="rounded-xl bg-gray-50/80 p-3 border border-gray-100/50">
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Next up</p>
                            <p className="text-xs font-bold text-gray-700 mt-0.5 truncate flex items-center gap-1">
                              <Compass className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                              {course.nextLesson}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400 font-semibold">Course Progress</span>
                              <span className="font-black text-violet-600">{course.progress}%</span>
                            </div>
                            <Progress value={course.progress} className="h-2 bg-gray-100" />
                          </div>

                          <Link href={`/dashboard/student/courses/${course.id}`} className="block">
                            <Button className="w-full gap-1.5 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-extrabold text-xs h-9 rounded-xl hover:shadow-md transition-all">
                              <Play className="h-3 w-3 fill-white" />
                              Resume Learning
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 border border-violet-100">
                    <Rocket className="h-8 w-8 text-violet-500" />
                  </div>
                  <h3 className="text-sm font-extrabold text-gray-800">
                    {searchQuery ? "No matching courses" : "No active courses"}
                  </h3>
                  <p className="text-xs text-gray-400 font-semibold max-w-[260px] mt-1 mb-4">
                    {searchQuery ? "Try searching with a different term." : "Start your next learning adventure today!"}
                  </p>
                  <Link href="/dashboard/student/courses">
                    <Button className="bg-gradient-to-r from-violet-500 to-pink-500 text-xs font-extrabold h-9 rounded-xl px-4 text-white">
                      Browse Courses
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* B. Learning Analytics Widget */}
          <Card className="border border-gray-100/80 bg-white/95 shadow-xl backdrop-blur-md rounded-3xl overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-extrabold text-gray-800">
                <BarChart2 className="h-5.5 w-5.5 text-cyan-500" />
                Learning Analytics
              </CardTitle>
              <CardDescription className="text-xs font-semibold text-gray-400">
                Dynamic insights and classroom engagement metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              {[
                {
                  label: "Average Quiz Score",
                  value: `${data?.learningAnalytics.averageQuizScore || 0}%`,
                  progress: data?.learningAnalytics.averageQuizScore || 0,
                  color: "bg-cyan-500",
                  desc: "Performance across all taken tests",
                },
                {
                  label: "Overall Course Completion",
                  value: `${data?.learningAnalytics.overallCourseCompletion || 0}%`,
                  progress: data?.learningAnalytics.overallCourseCompletion || 0,
                  color: "bg-violet-500",
                  desc: "Average progression across modules",
                },
                {
                  label: "Assignment Submission Rate",
                  value: `${data?.learningAnalytics.assignmentSubmissionRate || 0}%`,
                  progress: data?.learningAnalytics.assignmentSubmissionRate || 0,
                  color: "bg-amber-500",
                  desc: "Percentage of total tasks turned in",
                },
                {
                  label: "Weekly Study Progress",
                  value: `${data?.learningAnalytics.weeklyStudyProgress || 0}%`,
                  progress: data?.learningAnalytics.weeklyStudyProgress || 0,
                  color: "bg-emerald-500",
                  desc: "Learning milestone activity count this week",
                },
              ].map((analytic) => (
                <div key={analytic.label} className="rounded-2xl border border-gray-50 bg-gray-50/30 p-4 space-y-3.5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-extrabold text-gray-700">{analytic.label}</h4>
                      <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">{analytic.desc}</p>
                    </div>
                    <span className="text-sm font-black text-gray-800">{analytic.value}</span>
                  </div>
                  <Progress value={analytic.progress} className={`h-2 bg-gray-100 ${analytic.color}`} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (2/5 width on desktop - Streak, Deadlines & Activities) */}
        <div className="space-y-8 lg:col-span-2">
          
          {/* C. Learning Streak & Badges Widget */}
          <Card className="border border-gray-100/80 bg-white/95 shadow-xl backdrop-blur-md rounded-3xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-extrabold text-gray-800">
                <Flame className="h-5.5 w-5.5 text-amber-500 animate-pulse" />
                Gamification Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Streak Details */}
              <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 border border-amber-100/50">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20">
                  <Flame className="h-8 w-8 fill-white" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-amber-600">{data?.gamification.streak || 0}</span>
                    <span className="text-xs font-bold text-amber-500">Days Streak!</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 tracking-wider">
                    Total Reward Points: <span className="text-orange-500 font-extrabold">{data?.gamification.xp || 0} XP</span>
                  </p>
                </div>
              </div>

              {/* Earned Badges Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-gray-600 flex items-center gap-1">
                  <Award className="h-4 w-4 text-violet-500" />
                  Achievements Earned ({data?.gamification.badges.length || 0})
                </h4>
                {data?.gamification.badges && data.gamification.badges.length > 0 ? (
                  <div className="grid gap-3 grid-cols-2">
                    {data.gamification.badges.map((badge) => {
                      const IconComponent = badgeIconMap[badge.icon] || Trophy
                      return (
                        <div 
                          key={badge.name} 
                          className="flex items-center gap-2 rounded-xl bg-violet-50/40 p-2 border border-violet-100/40 group hover:bg-violet-50 transition-colors"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500 text-white shadow-sm transition-transform group-hover:rotate-12">
                            <IconComponent className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-black text-gray-800 truncate">{badge.name}</p>
                            <p className="text-[9px] text-gray-400 font-semibold truncate" title={badge.description}>
                              {badge.description}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 font-semibold italic">
                    Start finishing modules to earn custom awards!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* D. Upcoming Deadlines Widget */}
          <Card className="border border-gray-100/80 bg-white/95 shadow-xl backdrop-blur-md rounded-3xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-extrabold text-gray-800">
                <Clock className="h-5.5 w-5.5 text-rose-500" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.upcomingDeadlines && data.upcomingDeadlines.length > 0 ? (
                <div className="space-y-3.5">
                  {data.upcomingDeadlines.map((deadline) => {
                    const priority = getDeadlinePriority(deadline.deadlineDate)
                    return (
                      <div 
                        key={deadline.id}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-gray-50 bg-gray-50/20 p-3.5 hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
                          <h4 className="text-xs font-extrabold text-gray-700 truncate leading-snug">
                            {deadline.title}
                          </h4>
                          <span className="text-[10px] text-gray-400 font-semibold block truncate">
                            {deadline.courseTitle}
                          </span>
                          <span className="text-[9px] text-gray-400 font-bold block mt-1.5 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-rose-400 shrink-0" />
                            Due {formatDeadlineDate(deadline.deadlineDate)}
                          </span>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-bold ${priority.color}`}>
                          {priority.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-gray-400 text-xs font-semibold">
                  No upcoming deadlines.
                </div>
              )}
            </CardContent>
          </Card>

          {/* E. Recent Activity Feed */}
          <Card className="border border-gray-100/80 bg-white/95 shadow-xl backdrop-blur-md rounded-3xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-extrabold text-gray-800">
                <CheckCircle2 className="h-5.5 w-5.5 text-emerald-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.recentActivities && data.recentActivities.length > 0 ? (
                <div className="relative border-l border-gray-100 pl-4 ml-2 space-y-4">
                  {data.recentActivities.map((activity, idx) => {
                    let iconBg = "bg-blue-50 text-blue-500"
                    let IconComponent = Clock
                    
                    if (activity.type === "enrollment") {
                      iconBg = "bg-emerald-50 text-emerald-500"
                      IconComponent = BookOpen
                    } else if (activity.type === "submission") {
                      iconBg = "bg-amber-50 text-amber-500"
                      IconComponent = FileText
                    } else if (activity.type === "quiz") {
                      iconBg = "bg-cyan-50 text-cyan-500"
                      IconComponent = CheckSquare
                    } else if (activity.type === "certificate") {
                      iconBg = "bg-purple-50 text-purple-500"
                      IconComponent = Award
                    }

                    return (
                      <div key={idx} className="relative space-y-1">
                        {/* Dot indicator on timeline */}
                        <div className={`absolute -left-[25px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white border border-gray-200`}>
                          <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                        </div>
                        <p className="text-xs font-bold text-gray-700 leading-normal">
                          {activity.message}
                        </p>
                        <span className="text-[9px] text-gray-400 font-bold block">
                          {formatRelativeTime(activity.timestamp)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-gray-400 text-xs font-semibold">
                  No recent activities recorded.
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* 3. Bottom Quick Action Cards with Dynamic counts */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Link href="/dashboard/student/quizzes">
            <Card className="group cursor-pointer border-0 bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-xl transition-all hover:scale-103 hover:shadow-2xl">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                  <CheckSquare className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold flex items-center gap-1.5 text-sm">
                    Take a Quiz
                    {data?.availableQuizzesCount && data.availableQuizzesCount > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-white/35 px-2 py-0.5 text-[10px] font-black">
                        {data.availableQuizzesCount} available
                      </span>
                    ) : null}
                  </h3>
                  <p className="text-xs text-white/85 font-medium mt-0.5 truncate">
                    Test your understanding with active questions
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Link href="/dashboard/student/assignments">
            <Card className="group cursor-pointer border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xl transition-all hover:scale-103 hover:shadow-2xl">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                  <FileText className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold flex items-center gap-1.5 text-sm">
                    Assignments
                    {data?.pendingAssignmentsCount && data.pendingAssignmentsCount > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-white/35 px-2 py-0.5 text-[10px] font-black">
                        {data.pendingAssignmentsCount} pending
                      </span>
                    ) : null}
                  </h3>
                  <p className="text-xs text-white/85 font-medium mt-0.5 truncate">
                    Submit outstanding essays and tasks
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Link href="/dashboard/student/certificates">
            <Card className="group cursor-pointer border-0 bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-xl transition-all hover:scale-103 hover:shadow-2xl">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                  <Award className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold flex items-center gap-1.5 text-sm">
                    My Certificates
                    {data?.certificates && data.certificates > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-white/35 px-2 py-0.5 text-[10px] font-black">
                        {data.certificates} earned
                      </span>
                    ) : null}
                  </h3>
                  <p className="text-xs text-white/85 font-medium mt-0.5 truncate">
                    Display your official graduation documents
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
