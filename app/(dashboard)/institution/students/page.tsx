"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Users, Search, Trophy, BookOpen, Loader2, GraduationCap, TrendingUp, 
  Upload, Filter, Download, ArrowUpDown, ChevronRight, UserCheck, RefreshCw, AlertCircle
} from "lucide-react"
import Link from "next/link"

interface Student {
  id: string
  name: string
  email: string
  created_at: string
  courses_enrolled: number
  certificates: number
  avg_progress: number
}

export default function InstitutionStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Search & Filter State
  const [search, setSearch] = useState("")
  const [progressFilter, setProgressFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"name" | "progress" | "certificates">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  async function fetchStudents() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/institution/students")
      if (res.ok) {
        setStudents(await res.json())
      } else {
        setError("Failed to fetch students roster.")
      }
    } catch {
      setError("Failed to connect to the administration server.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  const toggleSort = (field: "name" | "progress" | "certificates") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("desc")
    }
  }

  // Filter students
  const filtered = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(search.toLowerCase()) || 
                          student.email.toLowerCase().includes(search.toLowerCase())
    
    let matchesProgress = true
    if (progressFilter === "low") matchesProgress = student.avg_progress < 30
    else if (progressFilter === "medium") matchesProgress = student.avg_progress >= 30 && student.avg_progress < 80
    else if (progressFilter === "high") matchesProgress = student.avg_progress >= 80

    let matchesStatus = true
    if (statusFilter === "active") matchesStatus = student.courses_enrolled > 0
    else if (statusFilter === "inactive") matchesStatus = student.courses_enrolled === 0

    return matchesSearch && matchesProgress && matchesStatus
  })

  // Sort students
  const sorted = [...filtered].sort((a, b) => {
    let comp = 0
    if (sortBy === "name") {
      comp = a.name.localeCompare(b.name)
    } else if (sortBy === "progress") {
      comp = a.avg_progress - b.avg_progress
    } else if (sortBy === "certificates") {
      comp = a.certificates - b.certificates
    }
    return sortOrder === "asc" ? comp : -comp
  })

  const totalCerts = students.reduce((sum, s) => sum + Number(s.certificates), 0)
  const averageEngagement = students.length 
    ? Math.round(students.reduce((sum, s) => sum + Number(s.avg_progress), 0) / students.length)
    : 0

  const handleBulkImport = () => {
    alert("CSV Student Batch Register Tool:\nPlease select a comma-separated values (.csv) file formatted with Name and Email to batch upload student records.")
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
        <p className="text-xs font-bold text-amber-600 animate-pulse">Loading Roster Directory...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-rose-500 animate-pulse" />
        <h3 className="text-lg font-bold text-gray-800">Roster Sync Failed</h3>
        <p className="text-sm text-gray-500 max-w-xs">{error}</p>
        <Button onClick={fetchStudents} size="sm" className="bg-amber-500 text-white font-bold gap-1 rounded-xl">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">Students Directory</h1>
          <p className="text-gray-500">Manage, query, and monitor all active students registered under your institution</p>
        </div>
        <Button onClick={handleBulkImport} className="gap-2 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold shadow-lg shadow-amber-500/20 rounded-xl h-10">
          <Upload className="h-4 w-4" />
          Bulk CSV Import
        </Button>
      </div>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Total Students", value: students.length, icon: Users, color: "from-amber-500 to-orange-500", desc: "Linked registered profiles" },
          { label: "Overall Progress", value: `${averageEngagement}%`, icon: TrendingUp, color: "from-violet-500 to-purple-500", desc: "Average class completion" },
          { label: "Total Certifications", value: totalCerts, icon: Trophy, color: "from-emerald-500 to-teal-500", desc: "Graduation awards issued" },
        ].map(stat => (
          <div key={stat.label} className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-xl border border-gray-50 flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow-md`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-800">{stat.value}</p>
              <p className="text-xs font-bold text-gray-700">{stat.label}</p>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{stat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Filters Card */}
      <Card className="border border-gray-100 bg-white shadow-xl rounded-3xl overflow-hidden">
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-4">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search name or email..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="pl-10 h-10 border-gray-100 bg-gray-50/50 text-xs font-semibold placeholder-gray-400 rounded-xl focus:bg-white focus:ring-amber-500" 
              />
            </div>

            {/* Progress Range Filter */}
            <div className="flex items-center gap-2 border border-gray-100 bg-gray-50/50 rounded-xl px-3 h-10">
              <TrendingUp className="h-4 w-4 text-gray-400 shrink-0" />
              <select 
                value={progressFilter} 
                onChange={e => setProgressFilter(e.target.value)}
                className="bg-transparent border-0 w-full text-xs font-extrabold text-gray-600 focus:outline-none"
              >
                <option value="all">All Progress Rates</option>
                <option value="low">Low progress (&lt; 30%)</option>
                <option value="medium">Average progress (30% - 80%)</option>
                <option value="high">High progress (&ge; 80%)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 border border-gray-100 bg-gray-50/50 rounded-xl px-3 h-10">
              <UserCheck className="h-4 w-4 text-gray-400 shrink-0" />
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-transparent border-0 w-full text-xs font-extrabold text-gray-600 focus:outline-none"
              >
                <option value="all">All Engagement Levels</option>
                <option value="active">Active (Enrolled)</option>
                <option value="inactive">Inactive (0 Enrollments)</option>
              </select>
            </div>

            {/* Total Results display */}
            <div className="flex items-center justify-end text-xs font-extrabold text-amber-600">
              Showing {sorted.length} of {students.length} students
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roster Table */}
      {sorted.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border border-gray-100 bg-white shadow-xl rounded-3xl overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50/70">
                      <th onClick={() => toggleSort("name")} className="px-6 py-4 text-left font-bold text-gray-600 cursor-pointer select-none hover:bg-gray-100/50">
                        <span className="flex items-center gap-1">
                          Student Name / Email
                          <ArrowUpDown className="h-3 w-3 text-gray-400" />
                        </span>
                      </th>
                      <th className="px-6 py-4 text-left font-bold text-gray-600">Enrolled Courses</th>
                      <th onClick={() => toggleSort("progress")} className="px-6 py-4 text-left font-bold text-gray-600 cursor-pointer select-none hover:bg-gray-100/50">
                        <span className="flex items-center gap-1">
                          Average Progress
                          <ArrowUpDown className="h-3 w-3 text-gray-400" />
                        </span>
                      </th>
                      <th onClick={() => toggleSort("certificates")} className="px-6 py-4 text-left font-bold text-gray-600 cursor-pointer select-none hover:bg-gray-100/50">
                        <span className="flex items-center gap-1">
                          Certificates Earned
                          <ArrowUpDown className="h-3 w-3 text-gray-400" />
                        </span>
                      </th>
                      <th className="px-6 py-4 text-left font-bold text-gray-600">Created At</th>
                      <th className="px-6 py-4 text-left font-bold text-gray-600">Status</th>
                      <th className="px-6 py-4 text-center font-bold text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sorted.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-400 font-extrabold text-sm text-white shadow-sm">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-gray-800 text-sm truncate">{student.name}</p>
                              <p className="text-xs text-gray-400 font-bold truncate">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-black text-violet-600">
                          {student.courses_enrolled}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3.5">
                            <Progress value={student.avg_progress} className="h-2 w-20" />
                            <span className="text-xs font-black text-gray-700">{Math.round(student.avg_progress)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {student.certificates > 0 ? (
                            <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 gap-1 rounded-lg">
                              <Trophy className="h-3.5 w-3.5" />
                              {student.certificates} Earned
                            </Badge>
                          ) : (
                            <span className="text-gray-400 font-semibold text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-400">
                          {new Date(student.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={student.courses_enrolled > 0 ? "bg-emerald-500" : "bg-gray-400"}>
                            {student.courses_enrolled > 0 ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <Link href="/dashboard/institution/performance">
                            <Button size="sm" variant="ghost" className="text-xs font-extrabold text-amber-600 hover:text-amber-700 gap-0.5 rounded-lg">
                              View Performance
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
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
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50">
            <GraduationCap className="h-10 w-10 text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">No matching students</h3>
          <p className="text-sm text-gray-500 max-w-[280px] mt-1 mb-4">
            Try adjusting your search criteria or register a student.
          </p>
          <Button onClick={() => { setSearch(""); setProgressFilter("all"); setStatusFilter("all"); }} size="sm" className="bg-amber-500 text-white font-extrabold rounded-xl">
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  )
}
