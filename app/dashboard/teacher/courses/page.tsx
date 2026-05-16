"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BookOpen, Users, Clock, PlusCircle, Edit, Trash2,
  Rocket, MoreVertical, CheckCircle, AlertCircle,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Course {
  id: string
  title: string
  description: string
  status: string
  class: number | null
  total_enrolled: number
  approved_enrolled: number
  modules_count: number
  created_at: string
}

// ── helpers ──────────────────────────────────────────────────────────────────

function groupByClass(courses: Course[]): Record<string, Course[]> {
  return courses.reduce((acc, course) => {
    const key = course.class != null ? String(course.class) : "unassigned"
    if (!acc[key]) acc[key] = []
    acc[key].push(course)
    return acc
  }, {} as Record<string, Course[]>)
}

function sortedKeys(grouped: Record<string, Course[]>): string[] {
  return Object.keys(grouped).sort((a, b) => {
    if (a === "unassigned") return 1
    if (b === "unassigned") return -1
    return Number(a) - Number(b)
  })
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved")
    return <Badge className="bg-emerald-500 text-white"><CheckCircle className="mr-1 h-3 w-3" />Published</Badge>
  if (status === "pending")
    return <Badge className="bg-amber-500 text-white"><Clock className="mr-1 h-3 w-3" />Pending Approval</Badge>
  return <Badge className="bg-gray-500 text-white"><AlertCircle className="mr-1 h-3 w-3" />Draft</Badge>
}

// ── component ─────────────────────────────────────────────────────────────────

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<string>("all")

  useEffect(() => { fetchCourses() }, [])

  async function fetchCourses() {
    try {
      const res = await fetch("/api/teacher/courses")
      if (res.ok) setCourses(await res.json())
    } catch (e) {
      console.error("Failed to fetch courses:", e)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(courseId: string) {
    if (!confirm("Are you sure you want to delete this course?")) return
    try {
      const res = await fetch(`/api/course/${courseId}`, { method: "DELETE" })
      if (res.ok) fetchCourses()
      else alert("Failed to delete the course.")
    } catch (e) {
      console.error("Failed to delete course:", e)
    }
  }

  // ── grouping ────────────────────────────────────────────────────────────────
  const grouped = groupByClass(courses)
  const allKeys = sortedKeys(grouped)
  const numericKeys = allKeys.filter(k => k !== "unassigned")
  const visibleKeys = selectedClass === "all" ? allKeys : allKeys.filter(k => k === selectedClass)

  // ── loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
        <Rocket className="h-12 w-12 text-cyan-500" />
      </motion.div>
    </div>
  )

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">My Courses</h1>
          <p className="text-gray-500">Create and manage your courses</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Class filter — only shown when there are 2+ numeric classes */}
          {numericKeys.length > 1 && (
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-36 bg-white/80">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {numericKeys.map(cls => (
                  <SelectItem key={cls} value={cls}>Class {cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Link href="/dashboard/teacher/courses/new">
            <Button className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-500">
              <PlusCircle className="h-5 w-5" /> Create New Course
            </Button>
          </Link>
        </div>
      </div>

      {/* Grouped course sections */}
      {courses.length > 0 ? (
        <div className="space-y-10">
          {visibleKeys.map(classKey => {
            const classCourses = grouped[classKey]
            const classLabel = classKey === "unassigned" ? "Unassigned" : `Class ${classKey}`

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
                    <p className="text-sm text-gray-500">
                      {classCourses.length} course{classCourses.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="ml-2 flex-1 h-px bg-gray-200" />
                </div>

                {/* Course cards */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {classCourses.map((course, index) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.07 }}
                    >
                      <Card className="h-full border-0 bg-white/80 shadow-xl backdrop-blur transition-all hover:shadow-2xl">
                        <CardContent className="p-0">
                          <div className="relative h-36 overflow-hidden rounded-t-lg bg-gradient-to-br from-cyan-500 to-blue-500">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <BookOpen className="h-14 w-14 text-white/30" />
                            </div>
                            <div className="absolute right-3 top-3">
                              <StatusBadge status={course.status} />
                            </div>
                            <div className="absolute left-3 top-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/20 text-white hover:bg-white/30">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/teacher/courses/${course.id}/edit`}>
                                      <Edit className="mr-2 h-4 w-4" /> Edit Course
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-rose-600" onClick={() => handleDelete(course.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Course
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          <div className="p-5">
                            <h3 className="mb-2 line-clamp-1 text-lg font-bold text-gray-800">
                              {course.title}
                            </h3>
                            <p className="mb-4 line-clamp-2 text-sm text-gray-500">
                              {course.description || "No description"}
                            </p>
                            <div className="mb-4 flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1" title={`${course.approved_enrolled} Approved / ${course.total_enrolled} Total`}>
                                <Users className="h-4 w-4" />
                                {course.total_enrolled} Students ({course.approved_enrolled} Appr)
                              </span>
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-4 w-4" />
                                {course.modules_count} modules
                              </span>
                            </div>
                            <Link href={`/dashboard/teacher/courses/${course.id}`}>
                              <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500">
                                Manage Course
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-blue-100">
            <BookOpen className="h-12 w-12 text-cyan-500" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-800">No courses yet!</h3>
          <p className="mb-6 text-gray-500">Create your first course and start teaching</p>
          <Link href="/dashboard/teacher/courses/new">
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-500">
              <PlusCircle className="mr-2 h-5 w-5" /> Create Your First Course
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
