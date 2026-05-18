"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts"
import { TrendingUp, Trophy, BookOpen, Users, Loader2, BarChart3, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ReportRow {
  student_name: string
  student_email: string
  course_title: string
  progress: number
  enrollment_status: string
  enrolled_at: string
  certificate_earned: string
}

export default function InstitutionPerformancePage() {
  const [data, setData] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchPerformanceData() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/institution/reports")
      if (res.ok) {
        setData(await res.json())
      } else {
        setError("Failed to fetch classroom completion analytics.")
      }
    } catch {
      setError("Failed to connect to the reporting endpoint.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPerformanceData()
  }, [])

  // Aggregate by student
  const studentMap = new Map<string, { name: string; email: string; courses: number; avgProgress: number; certs: number }>()
  for (const row of data) {
    const key = row.student_email
    const existing = studentMap.get(key)
    if (existing) {
      existing.courses++
      existing.avgProgress = (existing.avgProgress * (existing.courses - 1) + row.progress) / existing.courses
      if (row.certificate_earned === "Yes") existing.certs++
    } else {
      studentMap.set(key, {
        name: row.student_name, email: row.student_email,
        courses: 1, avgProgress: row.progress,
        certs: row.certificate_earned === "Yes" ? 1 : 0,
      })
    }
  }
  const students = Array.from(studentMap.values())

  // Course progress bar chart data
  const courseMap = new Map<string, number[]>()
  for (const row of data) {
    const arr = courseMap.get(row.course_title) || []
    arr.push(row.progress)
    courseMap.set(row.course_title, arr)
  }
  const barChartData = Array.from(courseMap.entries()).map(([name, progresses]) => ({
    name: name.length > 15 ? name.slice(0, 15) + "…" : name,
    avgProgress: Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length),
    students: progresses.length,
  }))

  // Completion Pie Chart Data (Completed vs In Progress)
  const completedCount = data.filter(d => d.progress === 100).length
  const inProgressCount = data.length - completedCount
  const pieChartData = [
    { name: "Completed", value: completedCount, fill: "#10b981" },
    { name: "In Progress", value: inProgressCount, fill: "#8b5cf6" },
  ]

  const overallAvg = students.length
    ? Math.round(students.reduce((s, u) => s + u.avgProgress, 0) / students.length)
    : 0

  const COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#f43f5e"]

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
        <p className="text-xs font-bold text-cyan-600 animate-pulse">Analyzing Course metrics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-rose-500 animate-pulse" />
        <h3 className="text-lg font-bold text-gray-800">Analytics Load Failed</h3>
        <p className="text-sm text-gray-500 max-w-xs">{error}</p>
        <Button onClick={fetchPerformanceData} size="sm" className="bg-cyan-500 text-white font-bold gap-1 rounded-xl">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-800">Performance Analytics</h1>
        <p className="text-gray-500">Track and audit your institution's aggregate learning metrics and student growth</p>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {[
          { label: "Active Students", value: students.length, icon: Users, color: "from-amber-500 to-orange-500" },
          { label: "Enrollments Approved", value: data.length, icon: BookOpen, color: "from-violet-500 to-purple-500" },
          { label: "Average Progress", value: `${overallAvg}%`, icon: TrendingUp, color: "from-cyan-500 to-blue-500" },
          { label: "Certifications Issued", value: data.filter(d => d.certificate_earned === "Yes").length, icon: Trophy, color: "from-emerald-500 to-teal-500" },
        ].map(stat => (
          <div key={stat.label} className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-xl border border-gray-50 flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow-md`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-800">{stat.value}</p>
              <p className="text-xs font-bold text-gray-700">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Charts Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        
        {/* Course Progress Chart (2/3 width on desktop) */}
        {barChartData.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
            <Card className="border border-gray-100 bg-white shadow-xl rounded-3xl overflow-hidden h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-extrabold text-gray-800">
                  <BarChart3 className="h-5.5 w-5.5 text-violet-500" />
                  Average Progress by Course
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-gray-400">
                  Visualizing learner progress across distinct catalog entries
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: "bold", fill: "#9ca3af" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fontWeight: "bold", fill: "#9ca3af" }} unit="%" />
                    <Tooltip contentStyle={{ borderRadius: "16px", border: "0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontWeight: "bold" }} formatter={(v: number) => [`${v}%`, "Avg Progress"]} />
                    <Bar dataKey="avgProgress" radius={[8, 8, 0, 0]}>
                      {barChartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}

        {/* Completion Pie Chart (1/3 width on desktop) */}
        {data.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border border-gray-100 bg-white shadow-xl rounded-3xl overflow-hidden h-full">
              <CardHeader>
                <CardTitle className="text-lg font-extrabold text-gray-800">
                  Enrollment Outcomes
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-gray-400">
                  Completion vs ongoing lessons ratios
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pt-2 pb-6">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} enrollments`, "Count"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-6 mt-4 text-xs font-bold text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span>Completed ({completedCount})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-violet-500" />
                    <span>In Progress ({inProgressCount})</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}

      </div>

      {/* Student Progress Roster Grid */}
      {students.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border border-gray-100 bg-white shadow-xl rounded-3xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-extrabold text-gray-800">Classroom Engagement Rankings</CardTitle>
              <CardDescription className="text-xs font-semibold text-gray-400">
                Detailed listing of learners sorted by engagement levels
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50/70">
                      <th className="px-6 py-4 text-left font-bold text-gray-600">Student Profile</th>
                      <th className="px-6 py-4 text-left font-bold text-gray-600">Active Courses</th>
                      <th className="px-6 py-4 text-left font-bold text-gray-600">Average Completion</th>
                      <th className="px-6 py-4 text-left font-bold text-gray-600">Awards Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.sort((a, b) => b.avgProgress - a.avgProgress).map((student) => (
                      <tr key={student.email} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-extrabold text-gray-800 text-sm">{student.name}</p>
                          <p className="text-xs text-gray-400 font-bold">{student.email}</p>
                        </td>
                        <td className="px-6 py-4 font-black text-violet-600 text-sm">
                          {student.courses}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <Progress value={student.avg_progress} className="h-2 w-24" />
                            <span className="text-xs font-black text-gray-700">{Math.round(student.avg_progress)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {student.certs > 0 ? (
                            <span className="flex items-center gap-1 text-emerald-600 font-black text-xs">
                              <Trophy className="h-4 w-4 fill-emerald-50 text-emerald-500" />
                              {student.certs} Certs
                            </span>
                          ) : (
                            <span className="text-gray-400 font-semibold text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-cyan-50">
            <TrendingUp className="h-10 w-10 text-cyan-500 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">No data points captured</h3>
          <p className="text-sm text-gray-500 max-w-[280px] mt-1">
            Performance charts will render automatically once students register and access lessons.
          </p>
        </div>
      )}
    </div>
  )
}
