"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Users, BookOpen, Trophy, BarChart3, Building2, TrendingUp, Rocket, Star, 
  GraduationCap, Clock, AlertTriangle, ArrowRight, ShieldCheck, Download, Upload, CheckCircle2, RefreshCw
} from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface StudentItem {
  id: string
  name: string
  email: string
  courses_enrolled: number
  certificates: number
  avg_progress: number
  avg_quiz_score?: number
}

interface CourseItem {
  id: string
  title: string
  enrolled_count: number
  completion_rate: number
  avg_score: number
}

interface ActivityItem {
  type: string
  message: string
  timestamp: string
}

interface DashboardData {
  totalStudents: number
  totalCourses: number
  totalEnrollments: number
  averageProgress: number
  certificatesEarned: number
  certsIssuedThisWeek: number
  topStudents: StudentItem[]
  topCourses: CourseItem[]
  recentActivities: ActivityItem[]
  pendingVerificationCount: number
  lowEngagementCount: number
  certificatesAwaitingApproval: number
  performanceTrends: Array<{
    month: string
    Students: number
    Completions: number
    Certificates: number
  }>
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

export default function InstitutionDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      const res = await fetch("/api/institution/dashboard")
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        setError("Failed to fetch administrative metrics from server.")
      }
    } catch {
      setError("Failed to establish server connection.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const stats = [
    {
      label: "Total Students",
      value: data?.totalStudents || 0,
      icon: Users,
      gradient: "from-amber-500 to-orange-500",
      link: "/dashboard/institution/students",
      accent: "border-amber-500"
    },
    {
      label: "Course Enrollments",
      value: data?.totalEnrollments || 0,
      icon: BookOpen,
      gradient: "from-violet-500 to-purple-500",
      link: "/dashboard/institution/courses",
      accent: "border-violet-500"
    },
    {
      label: "Avg. Progress",
      value: `${data?.averageProgress || 0}%`,
      icon: TrendingUp,
      gradient: "from-cyan-500 to-blue-500",
      link: "/dashboard/institution/performance",
      accent: "border-cyan-500"
    },
    {
      label: "Certificates Earned",
      value: data?.certificatesEarned || 0,
      icon: Trophy,
      gradient: "from-emerald-500 to-teal-500",
      link: "/dashboard/institution/reports",
      accent: "border-emerald-500"
    },
  ]

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        >
          <Rocket className="h-14 w-14 text-amber-500" />
        </motion.div>
        <p className="text-sm font-extrabold text-amber-600 animate-pulse">Assembling Administration Workspace...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <div className="h-16 w-16 bg-rose-50 flex items-center justify-center rounded-2xl border border-rose-100 animate-bounce">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
        </div>
        <h3 className="text-xl font-extrabold text-gray-800">Connection Interrupted</h3>
        <p className="text-sm font-medium text-gray-500 max-w-sm">{error}</p>
        <Button onClick={fetchDashboardData} className="gap-2 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold hover:shadow-lg transition-all rounded-xl">
          <RefreshCw className="h-4 w-4" />
          Reconnect Server
        </Button>
      </div>
    )
  }

  // Bulk data upload/import tool trigger
  const handleBulkImport = () => {
    alert("Bulk CSV Student Import Utility:\nPlease choose a valid roster .csv file to import student registration details.")
  }

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Universal Header Search & Personalized Greeting Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-8 text-white shadow-2xl"
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        
        <div className="relative flex flex-col gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold backdrop-blur-md self-start">
            <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300 animate-pulse" />
            Administrative Center
          </span>
          <h1 className="text-3xl font-black tracking-tight leading-none">
            {getGreeting()}, Partner Institute!
          </h1>
          <p className="text-white/90 text-sm font-semibold max-w-xl">
            You have {data?.totalStudents || 0} active students registered. {data?.certsIssuedThisWeek && data.certsIssuedThisWeek > 0 
              ? `${data.certsIssuedThisWeek} course certificate${data.certsIssuedThisWeek > 1 ? "s" : ""} issued this week!`
              : "No certificates generated this week yet. Track progress below!"}
          </p>
        </div>
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
                {/* Accent Line */}
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b ${stat.gradient}`} />
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

      {/* 3. Performance Trend Charts Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border border-gray-100 bg-white shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-extrabold text-gray-800">
                <BarChart3 className="h-5.5 w-5.5 text-orange-500" />
                Performance & Growth Trends
              </CardTitle>
              <CardDescription className="text-xs font-semibold text-gray-400">
                Dynamic line chart showing registrations and certificate outputs
              </CardDescription>
            </div>
            
            {/* Import / Export Action Tools */}
            <div className="flex items-center gap-3">
              <Button onClick={handleBulkImport} size="sm" variant="outline" className="gap-1.5 rounded-xl text-xs font-extrabold border-gray-200 text-gray-600 hover:bg-gray-50 h-9">
                <Upload className="h-3.5 w-3.5 text-amber-500" />
                Import Students
              </Button>
              <Link href="/dashboard/institution/reports">
                <Button size="sm" className="gap-1.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-extrabold text-xs h-9 rounded-xl shadow-md hover:shadow-lg">
                  <Download className="h-3.5 w-3.5" />
                  Export Reports
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data?.performanceTrends && data.performanceTrends.length > 0 ? (
              <div className="w-full">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.performanceTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCerts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: "bold", fill: "#9ca3af" }} />
                    <YAxis tick={{ fontSize: 11, fontWeight: "bold", fill: "#9ca3af" }} />
                    <Tooltip contentStyle={{ borderRadius: "16px", border: "0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontWeight: "bold" }} />
                    <Area type="monotone" dataKey="Students" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorStudents)" name="Registrations" />
                    <Area type="monotone" dataKey="Certificates" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCerts)" name="Certificates Earned" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 text-sm font-semibold">
                Trend metrics are currently processing.
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 4. Widgets Two-Column Panel Grid */}
      <div className="grid gap-8 lg:grid-cols-5">
        
        {/* Left Side Column - Top Performers (3/5 width on desktop) */}
        <div className="space-y-8 lg:col-span-3">
          
          {/* A. Top Performing Students Widget */}
          <Card className="border border-gray-100 bg-white shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-extrabold text-gray-800">
                  <Trophy className="h-5.5 w-5.5 text-amber-500" />
                  Top Performing Students
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-gray-400">
                  Ranked by overall average course completion and grade levels
                </CardDescription>
              </div>
              <Link href="/dashboard/institution/students">
                <Button variant="ghost" size="sm" className="text-xs font-bold text-amber-600 hover:text-amber-700">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {data?.topStudents && data.topStudents.length > 0 ? (
                <div className="space-y-4">
                  {data.topStudents.map((student, index) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100/30 group hover:bg-gradient-to-r hover:from-amber-100/50 hover:to-orange-100/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-black text-white shadow-sm ${
                          index === 0 ? "bg-amber-400" :
                          index === 1 ? "bg-slate-400" :
                          index === 2 ? "bg-amber-600" :
                          "bg-violet-500"
                        }`}>
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-gray-800 text-sm truncate">{student.name}</p>
                          <p className="text-[11px] text-gray-400 font-bold truncate">{student.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="text-center">
                          <p className="font-black text-violet-600 text-xs">{student.courses_enrolled}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Courses</p>
                        </div>
                        <div className="text-center">
                          <p className="font-black text-emerald-600 text-xs">{Math.round(student.avg_progress)}%</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Progress</p>
                        </div>
                        <div className="text-center">
                          <p className="font-black text-amber-600 text-xs">{student.certificates}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Certs</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100">
                    <GraduationCap className="h-8 w-8 text-amber-500" />
                  </div>
                  <h4 className="text-sm font-extrabold text-gray-800">No student records active</h4>
                  <p className="text-xs text-gray-400 font-semibold max-w-[240px] mt-1">
                    Student statistics will load once registrations are created under your institute.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* B. Top Performing Courses Widget */}
          <Card className="border border-gray-100 bg-white shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-extrabold text-gray-800">
                <BookOpen className="h-5.5 w-5.5 text-violet-500" />
                Top Performing Courses
              </CardTitle>
              <CardDescription className="text-xs font-semibold text-gray-400">
                Core academic tracks sorted by engagement metrics and completions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.topCourses && data.topCourses.length > 0 ? (
                <div className="space-y-4">
                  {data.topCourses.map((course, idx) => (
                    <div 
                      key={course.id} 
                      className="p-4 rounded-2xl border border-gray-50 bg-gray-50/30 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-sm font-extrabold text-gray-800 truncate">{course.title}</h4>
                          <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
                            Active Enrolled: <span className="text-violet-600 font-black">{course.enrolled_count} Students</span>
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-black text-violet-600">
                          Class Grade: {Math.round(course.avg_score)}% Avg
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                          <span>Overall completion progress</span>
                          <span className="text-violet-600">{Math.round(course.completion_rate)}%</span>
                        </div>
                        <Progress value={course.completion_rate} className="h-2 bg-gray-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-gray-400 text-sm font-semibold">
                  No courses registered under your institution.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side Column - Tasks & Activity timeline (2/5 width on desktop) */}
        <div className="space-y-8 lg:col-span-2">
          
          {/* C. Operational Upcoming/Pending Tasks Widget */}
          <Card className="border border-gray-100 bg-white shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-extrabold text-gray-800">
                <ShieldCheck className="h-5.5 w-5.5 text-emerald-500" />
                Administrative Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  label: "Certificates Awaiting Approval",
                  count: data?.certificatesAwaitingApproval || 0,
                  desc: "Earned accomplishments ready for review",
                  icon: Trophy,
                  color: "bg-emerald-50 text-emerald-600 border-emerald-100"
                },
                {
                  label: "Students Needing Verification",
                  count: data?.pendingVerificationCount || 0,
                  desc: "Newly registered accounts pending audit check",
                  icon: Users,
                  color: "bg-amber-50 text-amber-600 border-amber-100"
                },
                {
                  label: "Engagement Alerts Triggered",
                  count: data?.lowEngagementCount || 0,
                  desc: "Active enrollments with less than 10% progress",
                  icon: AlertTriangle,
                  color: "bg-rose-50 text-rose-600 border-rose-100"
                }
              ].map((task) => (
                <div key={task.label} className={`flex items-start gap-3 p-3.5 rounded-2xl border ${task.color}`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                    <task.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h4 className="text-xs font-black leading-snug">{task.label}</h4>
                    <p className="text-[10px] opacity-80 font-bold">{task.desc}</p>
                    <p className="text-sm font-black mt-1">
                      {task.count} Outstanding
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* D. Recent Activity Feed */}
          <Card className="border border-gray-100 bg-white shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-extrabold text-gray-800">
                <Clock className="h-5.5 w-5.5 text-rose-500 animate-pulse" />
                Recent Timeline Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.recentActivities && data.recentActivities.length > 0 ? (
                <div className="relative border-l border-gray-100 pl-4 ml-2 space-y-5">
                  {data.recentActivities.map((activity, idx) => (
                    <div key={idx} className="relative space-y-1">
                      {/* Timeline Dot Indicator */}
                      <div className="absolute -left-[25px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white border border-gray-200">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                      </div>
                      <p className="text-xs font-bold text-gray-700 leading-normal">
                        {activity.message}
                      </p>
                      <span className="text-[9px] text-gray-400 font-bold block">
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-gray-400 text-xs font-semibold">
                  No activity events registered yet.
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
