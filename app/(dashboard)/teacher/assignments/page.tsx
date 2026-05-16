"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileText, PlusCircle, Loader2, Users, Clock, Calendar, Rocket, AlertCircle } from "lucide-react"

interface Assignment {
  id: string; title: string; description: string; due_date?: string
  max_score: number; course_title: string; course_id: string
  submission_count: number; pending_count: number; created_at: string
}
interface Course { id: string; title: string }

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ courseId: "", title: "", description: "", dueDate: "", maxScore: 100 })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [aRes, cRes] = await Promise.all([fetch("/api/teacher/assignments"), fetch("/api/teacher/courses")])
    if (aRes.ok) setAssignments(await aRes.json())
    if (cRes.ok) setCourses(await cRes.json())
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch("/api/teacher/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setDialogOpen(false)
        setForm({ courseId: "", title: "", description: "", dueDate: "", maxScore: 100 })
        fetchData()
      }
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
        <Rocket className="h-12 w-12 text-amber-500" />
      </motion.div>
    </div>
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">Assignments</h1>
          <p className="text-gray-500">Create and grade student assignments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500">
              <PlusCircle className="h-5 w-5" /> Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create New Assignment</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Course *</Label>
                <Select value={form.courseId} onValueChange={v => setForm(p => ({ ...p, courseId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Assignment title" required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Assignment instructions..." rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="datetime-local" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Max Score</Label>
                  <Input type="number" value={form.maxScore} onChange={e => setForm(p => ({ ...p, maxScore: +e.target.value }))} min={1} max={1000} />
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500" disabled={saving || !form.courseId || !form.title}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {assignments.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((a, index) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="border-0 bg-white/80 shadow-xl backdrop-blur h-full">
                <CardContent className="p-0">
                  <div className="h-28 bg-gradient-to-br from-amber-500 to-orange-500 rounded-t-lg flex items-center justify-center relative">
                    <FileText className="h-12 w-12 text-white/30" />
                    {a.pending_count > 0 && (
                      <div className="absolute right-3 top-3">
                        <Badge className="bg-white text-amber-600">{a.pending_count} pending</Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-sm font-medium text-amber-600 mb-1">{a.course_title}</p>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{a.title}</h3>
                    {a.description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{a.description}</p>}
                    <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                      {a.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(a.due_date).toLocaleDateString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1"><Users className="h-4 w-4" />{a.submission_count} submissions</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100">
            <FileText className="h-12 w-12 text-amber-500" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-800">No assignments yet</h3>
          <p className="text-gray-500">Create your first assignment for students</p>
        </div>
      )}
    </div>
  )
}
