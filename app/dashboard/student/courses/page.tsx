"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Search, Play, Clock, Users, Star, Rocket, CheckCircle } from "lucide-react"

interface Course {
  id: string
  title: string
  description: string
  thumbnail?: string
  teacher_name: string
  total_modules: number
  class: number | null
  enrolled?: boolean
  progress?: number
  status?: string
}

// ── helpers ──────────────────────────────────────────────────────────────────

function groupByClass(courses: Course[]): Record<string, Course[]> {
  return courses.reduce((acc, c) => {
    const key = c.class != null ? String(c.class) : "unassigned"
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
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

// Shared class-section heading
function ClassHeading({ classKey, count }: { classKey: string; count: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white shadow ${
        classKey === "unassigned" ? "bg-gray-400" : "bg-gradient-to-br from-violet-500 to-purple-600"
      }`}>
        {classKey === "unassigned" ? "?" : classKey}
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-800">
          {classKey === "unassigned" ? "Unassigned" : `Class ${classKey}`}
        </h2>
        <p className="text-xs text-gray-500">{count} course{count !== 1 ? "s" : ""}</p>
      </div>
      <div className="ml-2 flex-1 h-px bg-gray-200" />
    </div>
  )
}

// ── component ─────────────────────────────────────────────────────────────────

export default function StudentCoursesPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [enrollingId, setEnrollingId] = useState<string | null>(null)

  // Class filter — one for each tab
  const [enrolledClassFilter, setEnrolledClassFilter] = useState<string>("all")
  const [browseClassFilter, setBrowseClassFilter] = useState<string>("all")

  useEffect(() => { fetchCourses() }, [])

  async function fetchCourses() {
    try {
      const [allRes, enrolledRes] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/student/enrollments"),
      ])
      if (allRes.ok) setCourses(await allRes.json())
      if (enrolledRes.ok) setEnrolledCourses(await enrolledRes.json())
    } catch (e) {
      console.error("Failed to fetch courses:", e)
    } finally {
      setLoading(false)
    }
  }

  async function handleEnroll(courseId: string) {
    setEnrollingId(courseId)
    try {
      const res = await fetch("/api/student/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      })
      if (res.ok) { fetchCourses(); router.refresh() }
    } catch (e) {
      console.error("Failed to enroll:", e)
    } finally {
      setEnrollingId(null)
    }
  }

  // ── derived data ─────────────────────────────────────────────────────────────

  // Browse = approved courses not yet enrolled in, filtered by search
  const searchFiltered = courses.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const availableCourses = searchFiltered.filter(
    c => !enrolledCourses.some(e => e.id === c.id)
  )

  // Grouped enrolled
  const enrolledGrouped = groupByClass(enrolledCourses)
  const enrolledKeys = sortedKeys(enrolledGrouped)
  const enrolledNumericKeys = enrolledKeys.filter(k => k !== "unassigned")
  const visibleEnrolledKeys = enrolledClassFilter === "all"
    ? enrolledKeys
    : enrolledKeys.filter(k => k === enrolledClassFilter)

  // Grouped browse
  const browseGrouped = groupByClass(availableCourses)
  const browseKeys = sortedKeys(browseGrouped)
  const browseNumericKeys = browseKeys.filter(k => k !== "unassigned")
  const visibleBrowseKeys = browseClassFilter === "all"
    ? browseKeys
    : browseKeys.filter(k => k === browseClassFilter)

  // ── loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
        <Rocket className="h-12 w-12 text-violet-500" />
      </motion.div>
    </div>
  )

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">My Courses</h1>
          <p className="text-gray-500">Explore and learn from amazing courses</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="enrolled" className="space-y-6">
        <TabsList className="bg-white/80 p-1">
          <TabsTrigger value="enrolled"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
            My Courses ({enrolledCourses.length})
          </TabsTrigger>
          <TabsTrigger value="browse"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
            Browse All ({availableCourses.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Enrolled tab ── */}
        <TabsContent value="enrolled" className="space-y-6">
          {/* Class filter for enrolled */}
          {enrolledNumericKeys.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Filter:</span>
              <Select value={enrolledClassFilter} onValueChange={setEnrolledClassFilter}>
                <SelectTrigger className="w-36 bg-white/80">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {enrolledNumericKeys.map(cls => (
                    <SelectItem key={cls} value={cls}>Class {cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {enrolledCourses.length > 0 ? (
            <div className="space-y-8">
              {visibleEnrolledKeys.map(classKey => {
                const classCourses = enrolledGrouped[classKey]
                return (
                  <div key={classKey} className="space-y-4">
                    <ClassHeading classKey={classKey} count={classCourses.length} />
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {classCourses.map((course, index) => (
                        <motion.div
                          key={course.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.08 }}
                        >
                          <Link href={`/dashboard/student/courses/${course.id}`}>
                            <Card className="group h-full cursor-pointer border-0 bg-white/80 shadow-xl backdrop-blur transition-all hover:scale-[1.02] hover:shadow-2xl">
                              <CardContent className="p-0">
                                <div className="relative h-40 overflow-hidden rounded-t-lg bg-gradient-to-br from-violet-500 to-pink-500">
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <BookOpen className="h-16 w-16 text-white/30" />
                                  </div>
                                  {course.progress === 100 && (
                                    <div className="absolute right-3 top-3">
                                      <Badge className="bg-emerald-500 text-white">
                                        <CheckCircle className="mr-1 h-3 w-3" /> Completed
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                                <div className="p-5">
                                  <h3 className="mb-2 line-clamp-1 text-lg font-bold text-gray-800 group-hover:text-violet-600">
                                    {course.title}
                                  </h3>
                                  <p className="mb-4 line-clamp-2 text-sm text-gray-500">{course.description}</p>
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-500">Progress</span>
                                      <span className="font-bold text-violet-600">{course.progress || 0}%</span>
                                    </div>
                                    <Progress value={course.progress || 0} className="h-2" />
                                  </div>
                                  <Button className="mt-4 w-full bg-gradient-to-r from-violet-500 to-pink-500">
                                    <Play className="mr-2 h-4 w-4" /> Continue Learning
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-pink-100">
                <BookOpen className="h-12 w-12 text-violet-500" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-800">No courses yet!</h3>
              <p className="mb-6 text-gray-500">Start your learning journey by enrolling in a course</p>
            </div>
          )}
        </TabsContent>

        {/* ── Browse tab ── */}
        <TabsContent value="browse" className="space-y-6">
          {/* Class filter for browse */}
          {browseNumericKeys.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Filter:</span>
              <Select value={browseClassFilter} onValueChange={setBrowseClassFilter}>
                <SelectTrigger className="w-36 bg-white/80">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {browseNumericKeys.map(cls => (
                    <SelectItem key={cls} value={cls}>Class {cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {availableCourses.length > 0 ? (
            <div className="space-y-8">
              {visibleBrowseKeys.map(classKey => {
                const classCourses = browseGrouped[classKey]
                return (
                  <div key={classKey} className="space-y-4">
                    <ClassHeading classKey={classKey} count={classCourses.length} />
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {classCourses.map((course, index) => (
                        <motion.div
                          key={course.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.08 }}
                        >
                          <Card className="h-full border-0 bg-white/80 shadow-xl backdrop-blur transition-all hover:scale-[1.02] hover:shadow-2xl">
                            <CardContent className="p-0">
                              <div className="relative h-40 overflow-hidden rounded-t-lg bg-gradient-to-br from-cyan-500 to-blue-500">
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <BookOpen className="h-16 w-16 text-white/30" />
                                </div>
                              </div>
                              <div className="p-5">
                                <h3 className="mb-2 line-clamp-1 text-lg font-bold text-gray-800">{course.title}</h3>
                                <p className="mb-4 line-clamp-2 text-sm text-gray-500">{course.description}</p>
                                <div className="mb-4 flex items-center gap-4 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />{course.teacher_name}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />{course.total_modules} modules
                                  </span>
                                </div>
                                <Button
                                  onClick={() => handleEnroll(course.id)}
                                  disabled={enrollingId === course.id}
                                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                >
                                  {enrollingId === course.id ? (
                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                                      <Rocket className="mr-2 h-4 w-4" />
                                    </motion.div>
                                  ) : (
                                    <Star className="mr-2 h-4 w-4" />
                                  )}
                                  Enroll Now
                                </Button>
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
                <Search className="h-12 w-12 text-cyan-500" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-800">No more courses!</h3>
              <p className="text-gray-500">{"You've enrolled in all available courses"}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
