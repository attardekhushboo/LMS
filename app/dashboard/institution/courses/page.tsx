"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, BookOpen, Users, Clock, Search, AlertCircle, Rocket, PlusCircle, MoreVertical, Edit, Trash2, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Course {
  id: string
  title: string
  description: string
  status: string
  thumbnail: string
  class: string
  enrolled_count: number
}

export default function InstitutionCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Advanced filters state
  const [classFilter, setClassFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    fetchCourses()
  }, [])

  async function fetchCourses() {
    try {
      const res = await fetch("/api/institution/courses")
      if (res.ok) {
        setCourses(await res.json())
      }
    } catch (e) {
      console.error("Failed to load courses")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(courseId: string) {
    if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) return
    
    try {
      const res = await fetch(`/api/course/${courseId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        fetchCourses()
      } else {
        alert("Failed to delete the course.")
      }
    } catch (error) {
      console.error("Failed to delete course:", error)
    }
  }

  // Filter courses
  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesClass = classFilter === "all" || String(c.class) === classFilter
    const matchesStatus = statusFilter === "all" || c.status === statusFilter

    return matchesSearch && matchesClass && matchesStatus
  })

  // Extract distinct classes for dynamic filter option list
  const distinctClasses = Array.from(new Set(courses.map(c => String(c.class)))).sort()

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        >
          <Rocket className="h-14 w-14 text-amber-500" />
        </motion.div>
        <p className="text-xs font-bold text-amber-600 animate-pulse">Loading Course Catalog...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">Institution Courses</h1>
          <p className="text-gray-500">Manage, audit, and create academic catalogs for your student body</p>
        </div>
        
        <Link href="/dashboard/institution/courses/create">
          <Button className="bg-gradient-to-r from-amber-500 to-rose-500 text-white font-extrabold shadow-lg shadow-amber-500/20 rounded-xl h-10">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Course
          </Button>
        </Link>
      </div>

      {/* Advanced Filters Roster */}
      <Card className="border border-gray-100 bg-white shadow-xl rounded-3xl overflow-hidden">
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-4">
            
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title or topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 rounded-xl border-gray-100 bg-gray-50/50 py-2 py-2.5 pl-10 pr-4 text-xs font-semibold placeholder-gray-400 transition-all focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Class Filter */}
            <div className="flex items-center gap-2 border border-gray-100 bg-gray-50/50 rounded-xl px-3 h-10">
              <Filter className="h-4 w-4 text-gray-400 shrink-0" />
              <select 
                value={classFilter} 
                onChange={e => setClassFilter(e.target.value)}
                className="bg-transparent border-0 w-full text-xs font-extrabold text-gray-600 focus:outline-none"
              >
                <option value="all">All Classes</option>
                {distinctClasses.map(cGrade => (
                  <option key={cGrade} value={cGrade}>Class {cGrade}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 border border-gray-100 bg-gray-50/50 rounded-xl px-3 h-10">
              <Filter className="h-4 w-4 text-gray-400 shrink-0" />
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-transparent border-0 w-full text-xs font-extrabold text-gray-600 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Courses Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course, idx) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              <Card className="group overflow-hidden border-0 bg-white shadow-xl rounded-3xl transition-all hover:-translate-y-1 hover:shadow-2xl">
                <div className="aspect-video relative overflow-hidden bg-gray-50">
                  
                  {/* Status Badge */}
                  <div className="absolute right-3.5 top-3.5 z-10 flex gap-2">
                    <Badge className={
                      course.status === 'approved' ? 'bg-emerald-500 text-white' : 
                      course.status === 'pending' ? 'bg-amber-500 text-white' : 
                      'bg-rose-500 text-white'
                    }>
                      {course.status}
                    </Badge>
                  </div>

                  {/* Actions Dropdown Trigger */}
                  <div className="absolute left-3.5 top-3.5 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/20 text-white hover:bg-black/40 rounded-xl backdrop-blur-md">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="rounded-xl shadow-xl">
                        <DropdownMenuItem asChild className="rounded-lg">
                          <Link href={`/dashboard/institution/courses/${course.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Course
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-rose-600 rounded-lg"
                          onClick={() => handleDelete(course.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Course
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Card Thumbnail Image */}
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
                      <BookOpen className="h-12 w-12 text-amber-300" />
                    </div>
                  )}
                </div>

                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-black text-gray-800 line-clamp-1 group-hover:text-amber-600 transition-colors" title={course.title}>
                      {course.title}
                    </h3>
                    <p className="text-xs text-gray-400 font-semibold line-clamp-2 leading-relaxed">
                      {course.description || "No description provided for this academic catalog entry."}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-xs font-bold text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-violet-500" />
                      <span>{course.enrolled_count} Students Enrolled</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-pink-500" />
                      <span>Class {course.class}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50">
            <BookOpen className="h-10 w-10 text-amber-500 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">No courses matching filters</h3>
          <p className="text-sm text-gray-500 max-w-[280px] mt-1 mb-4">
            Create a course to populate your institution's study catalog.
          </p>
          <Link href="/dashboard/institution/courses/create">
            <Button className="bg-gradient-to-r from-amber-500 to-rose-500 text-white font-extrabold rounded-xl">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Course
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
