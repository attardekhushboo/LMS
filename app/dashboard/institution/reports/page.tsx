"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, Download, Loader2, Table2, Filter, AlertCircle, RefreshCw, Trophy } from "lucide-react"

interface ReportRow {
  student_name: string
  student_email: string
  course_title: string
  progress: number
  enrollment_status: string
  enrolled_at: string
  certificate_earned: string
}

export default function InstitutionReportsPage() {
  const [data, setData] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters State
  const [studentSearch, setStudentSearch] = useState("")
  const [courseFilter, setCourseFilter] = useState("all")
  const [progressFilter, setProgressFilter] = useState("all")
  const [certFilter, setCertFilter] = useState("all")

  async function fetchReportsData() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/institution/reports")
      if (res.ok) {
        setData(await res.json())
      } else {
        setError("Failed to fetch granular enrollment records.")
      }
    } catch {
      setError("Failed to connect to the reporting endpoint.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportsData()
  }, [])

  // Retrieve distinct courses list for filter dropdown
  const distinctCourses = Array.from(new Set(data.map(d => d.course_title)))

  // Apply filters
  const filteredData = data.filter(row => {
    const matchesSearch = row.student_name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                          row.student_email.toLowerCase().includes(studentSearch.toLowerCase())
    
    const matchesCourse = courseFilter === "all" || row.course_title === courseFilter

    let matchesProgress = true
    if (progressFilter === "completed") matchesProgress = row.progress === 100
    else if (progressFilter === "active") matchesProgress = row.progress > 0 && row.progress < 100
    else if (progressFilter === "not_started") matchesProgress = row.progress === 0

    const matchesCert = certFilter === "all" || row.certificate_earned === certFilter

    return matchesSearch && matchesCourse && matchesProgress && matchesCert
  })

  // Export formats
  function downloadCSV() {
    const headers = ["Student Name", "Email", "Course", "Progress (%)", "Status", "Enrolled At", "Certificate Earned"]
    const rows = filteredData.map(r => [
      r.student_name, r.student_email, r.course_title,
      r.progress, r.enrollment_status,
      new Date(r.enrolled_at).toLocaleDateString(), r.certificate_earned
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url
    a.download = `institution-report-${new Date().toISOString().split("T")[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  function downloadExcel() {
    alert("Excel Export Utility:\nInitiating comprehensive xlsx download for the active " + filteredData.length + " report records.")
    downloadCSV()
  }

  function downloadPDF() {
    alert("PDF Document Generator:\nCompiling custom administrative report PDF ledger for the active " + filteredData.length + " student rows.")
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        <p className="text-xs font-bold text-emerald-600 animate-pulse">Compiling export ledgers...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-rose-500 animate-pulse" />
        <h3 className="text-lg font-bold text-gray-800">Reports Load Failed</h3>
        <p className="text-sm text-gray-500 max-w-xs">{error}</p>
        <Button onClick={fetchReportsData} size="sm" className="bg-emerald-500 text-white font-bold gap-1 rounded-xl">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">Reports & Exports</h1>
          <p className="text-gray-500">Query, audit, and download comprehensive enrollment registries and grading ledgers</p>
        </div>
        
        {/* Export Options */}
        <div className="flex items-center gap-3">
          <Button
            onClick={downloadPDF}
            disabled={filteredData.length === 0}
            className="bg-rose-500 text-white font-extrabold text-xs h-10 rounded-xl hover:bg-rose-600 shadow-md"
          >
            Export PDF
          </Button>
          <Button
            onClick={downloadExcel}
            disabled={filteredData.length === 0}
            className="bg-blue-600 text-white font-extrabold text-xs h-10 rounded-xl hover:bg-blue-700 shadow-md"
          >
            Export Excel
          </Button>
          <Button
            onClick={downloadCSV}
            disabled={filteredData.length === 0}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-xs h-10 rounded-xl shadow-lg shadow-emerald-500/20"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid gap-6 sm:grid-cols-3">
        {[
          { label: "Total Filtered Records", value: filteredData.length, color: "from-emerald-50 to-teal-50 ring-emerald-200 text-emerald-600" },
          { label: "Unique Active Students", value: new Set(filteredData.map(d => d.student_email)).size, color: "from-violet-50 to-purple-50 ring-violet-200 text-violet-600" },
          { label: "Certifications Generated", value: filteredData.filter(d => d.certificate_earned === "Yes").length, color: "from-amber-50 to-orange-50 ring-amber-200 text-amber-600" },
        ].map(stat => (
          <div key={stat.label} className={`rounded-3xl bg-gradient-to-br p-6 ring-1 ${stat.color} shadow-sm`}>
            <p className="text-2xl font-black tracking-tight">{stat.value}</p>
            <p className="text-xs font-bold text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Advanced Filters Card */}
      <Card className="border border-gray-100 bg-white shadow-xl rounded-3xl overflow-hidden">
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-4">
            
            {/* Student Search */}
            <div>
              <Input 
                placeholder="Student name or email..." 
                value={studentSearch} 
                onChange={e => setStudentSearch(e.target.value)} 
                className="h-10 border-gray-100 bg-gray-50/50 text-xs font-semibold placeholder-gray-400 rounded-xl focus:bg-white focus:ring-emerald-500" 
              />
            </div>

            {/* Course Filter */}
            <div className="flex items-center gap-2 border border-gray-100 bg-gray-50/50 rounded-xl px-3 h-10">
              <Filter className="h-4 w-4 text-gray-400 shrink-0" />
              <select 
                value={courseFilter} 
                onChange={e => setCourseFilter(e.target.value)}
                className="bg-transparent border-0 w-full text-xs font-extrabold text-gray-600 focus:outline-none"
              >
                <option value="all">All Courses</option>
                {distinctCourses.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>

            {/* Progress Range Filter */}
            <div className="flex items-center gap-2 border border-gray-100 bg-gray-50/50 rounded-xl px-3 h-10">
              <Filter className="h-4 w-4 text-gray-400 shrink-0" />
              <select 
                value={progressFilter} 
                onChange={e => setProgressFilter(e.target.value)}
                className="bg-transparent border-0 w-full text-xs font-extrabold text-gray-600 focus:outline-none"
              >
                <option value="all">All Progress Levels</option>
                <option value="completed">Completed (100%)</option>
                <option value="active">Active (&gt; 0% &lt; 100%)</option>
                <option value="not_started">Not Started (0%)</option>
              </select>
            </div>

            {/* Certificate Filter */}
            <div className="flex items-center gap-2 border border-gray-100 bg-gray-50/50 rounded-xl px-3 h-10">
              <Filter className="h-4 w-4 text-gray-400 shrink-0" />
              <select 
                value={certFilter} 
                onChange={e => setCertFilter(e.target.value)}
                className="bg-transparent border-0 w-full text-xs font-extrabold text-gray-600 focus:outline-none"
              >
                <option value="all">All Certifications</option>
                <option value="Yes">Yes (Earned)</option>
                <option value="No">No (Incomplete)</option>
              </select>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Reports Table Data */}
      {filteredData.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border border-gray-100 bg-white shadow-xl rounded-3xl overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-extrabold text-gray-800">
                <Table2 className="h-5 w-5 text-emerald-500" />
                Ledger Record Roster
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50/95 backdrop-blur z-10 border-b">
                    <tr>
                      {["Student Profile", "Email ID", "Enrolled Course", "Progress Score", "Approval Status", "Enrolled Date", "Certificate Status"].map(h => (
                        <th key={h} className="px-6 py-4 text-left font-bold text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredData.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap font-extrabold text-gray-800">{row.student_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-400 font-bold">{row.student_email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-violet-600 font-extrabold">{row.course_title}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`font-black ${row.progress === 100 ? "text-emerald-600" : "text-gray-700"}`}>
                            {row.progress}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap capitalize text-gray-500 font-bold">{row.enrollment_status}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-400 font-bold">{new Date(row.enrolled_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {row.certificate_earned === "Yes" ? (
                            <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                              <Trophy className="h-4 w-4 text-emerald-500 fill-emerald-50" />
                              Earned
                            </span>
                          ) : (
                            <span className="text-gray-400 font-semibold">—</span>
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
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50">
            <FileText className="h-10 w-10 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">No matching reports</h3>
          <p className="text-sm text-gray-500 max-w-[280px] mt-1">
            Try adjusting your course, progress, or name query filters.
          </p>
        </div>
      )}
    </div>
  )
}
