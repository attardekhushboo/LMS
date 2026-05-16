"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Search, CheckCircle, XCircle, Clock, Users, Loader2, Filter } from "lucide-react"

interface Course {
  id: string
  title: string
  description: string
  status: string
  teacher_name: string
  teacher_email: string
  enrolled_count: number
  created_at: string
}

const statusColors: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-rose-100 text-rose-700",
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => { fetchCourses() }, [])

  async function fetchCourses() {
    const res = await fetch("/api/admin/all-courses")
    if (res.ok) setCourses(await res.json())
    setLoading(false)
  }

  async function handleAction(courseId: string, action: "approve" | "reject") {
    setActionLoading(courseId)
    await fetch(`/api/admin/${action}-course`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    })
    setActionLoading(null)
    fetchCourses()
  }

  const filtered = courses.filter(c => {
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.teacher_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const counts = {
    all: courses.length,
    approved: courses.filter(c => c.status === "approved").length,
    pending: courses.filter(c => c.status === "pending").length,
    rejected: courses.filter(c => c.status === "rejected").length,
  }

  if (loading) return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
    </div>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-800">All Courses</h1>
        <p className="text-gray-500">Review and manage all courses on the platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: counts.all, color: "from-emerald-500 to-teal-500" },
          { label: "Published", value: counts.approved, color: "from-cyan-500 to-blue-500" },
          { label: "Pending", value: counts.pending, color: "from-amber-500 to-orange-500" },
          { label: "Rejected", value: counts.rejected, color: "from-rose-500 to-pink-500" },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl bg-gradient-to-br ${stat.color} p-5 text-white shadow-lg`}>
            <p className="text-3xl font-extrabold">{stat.value}</p>
            <p className="text-sm opacity-80">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by title or teacher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Published</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Course Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full border-0 bg-white/80 shadow-xl backdrop-blur flex flex-col">
                <CardContent className="flex flex-col flex-1 p-0">
                  {/* Header */}
                  <div className="relative h-32 overflow-hidden rounded-t-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="h-14 w-14 text-white/20" />
                    </div>
                    <div className="absolute right-3 top-3">
                      <Badge className={statusColors[course.status]}>
                        {course.status === "approved" && <CheckCircle className="mr-1 h-3 w-3" />}
                        {course.status === "pending" && <Clock className="mr-1 h-3 w-3" />}
                        {course.status === "rejected" && <XCircle className="mr-1 h-3 w-3" />}
                        {course.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="mb-1 line-clamp-1 text-lg font-bold text-gray-800">{course.title}</h3>
                    <p className="mb-1 text-sm font-medium text-emerald-600">by {course.teacher_name}</p>
                    <p className="mb-4 line-clamp-2 flex-1 text-sm text-gray-500">{course.description || "No description"}</p>

                    <div className="mb-4 flex items-center gap-3 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {course.enrolled_count} enrolled
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(course.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Actions */}
                    {course.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500"
                          onClick={() => handleAction(course.id, "approve")}
                          disabled={actionLoading === course.id}
                        >
                          {actionLoading === course.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <><CheckCircle className="mr-1 h-4 w-4" />Approve</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50"
                          onClick={() => handleAction(course.id, "reject")}
                          disabled={actionLoading === course.id}
                        >
                          <XCircle className="mr-1 h-4 w-4" />Reject
                        </Button>
                      </div>
                    )}
                    {course.status === "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-rose-200 text-rose-600 hover:bg-rose-50"
                        onClick={() => handleAction(course.id, "reject")}
                        disabled={actionLoading === course.id}
                      >
                        <XCircle className="mr-1 h-4 w-4" />Unpublish
                      </Button>
                    )}
                    {course.status === "rejected" && (
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500"
                        onClick={() => handleAction(course.id, "approve")}
                        disabled={actionLoading === course.id}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />Re-approve
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100">
            <BookOpen className="h-12 w-12 text-emerald-500" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-800">No courses found</h3>
          <p className="text-gray-500">Courses will appear here once teachers submit them</p>
        </div>
      )}
    </div>
  )
}
