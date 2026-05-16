"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Users, Search, BookOpen, Loader2 } from "lucide-react"

interface Enrollment {
  id: string; student_name: string; student_email: string
  course_title: string; course_id: string; progress: number; status: string; enrolled_at: string
}

export default function TeacherEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/teacher/enrollments")
      .then(r => r.ok ? r.json() : [])
      .then(setEnrollments)
      .finally(() => setLoading(false))
  }, [])

  const filtered = enrollments.filter(e =>
    e.student_name.toLowerCase().includes(search.toLowerCase()) ||
    e.student_email.toLowerCase().includes(search.toLowerCase()) ||
    e.course_title.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
    </div>
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">Student Enrollments</h1>
          <p className="text-gray-500">Track student progress across your courses</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search students or courses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 w-72"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="rounded-2xl bg-violet-50 px-5 py-3 ring-1 ring-violet-200">
          <p className="text-2xl font-extrabold text-violet-600">{enrollments.length}</p>
          <p className="text-sm text-gray-500">Total Enrollments</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-5 py-3 ring-1 ring-emerald-200">
          <p className="text-2xl font-extrabold text-emerald-600">{enrollments.filter(e => e.progress === 100).length}</p>
          <p className="text-sm text-gray-500">Completed</p>
        </div>
      </div>

      {filtered.length > 0 ? (
        <Card className="border-0 bg-white/80 shadow-xl backdrop-blur">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50/80">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Student</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Course</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Progress</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Enrolled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((e, i) => (
                    <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-800">{e.student_name}</p>
                          <p className="text-sm text-gray-500">{e.student_email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-violet-600">{e.course_title}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Progress value={e.progress} className="h-2 w-24" />
                          <span className={`text-sm font-semibold ${e.progress === 100 ? "text-emerald-600" : "text-gray-600"}`}>
                            {e.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(e.enrolled_at).toLocaleDateString()}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-violet-100 to-purple-100">
            <Users className="h-12 w-12 text-violet-500" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-800">No enrollments found</h3>
          <p className="text-gray-500">Students will appear here when they enroll in your courses</p>
        </div>
      )}
    </div>
  )
}
