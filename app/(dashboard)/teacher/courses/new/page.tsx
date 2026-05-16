"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BookOpen, Loader2, AlertCircle, ArrowLeft, Sparkles } from "lucide-react"
import Link from "next/link"

export default function CreateCoursePage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [courseClass, setCourseClass] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!courseClass) {
      setError("Please select a class for this course.")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/teacher/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, class: Number(courseClass) }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to create course")
        setIsLoading(false)
        return
      }

      router.push(`/teacher/courses/${data.id}`)
    } catch {
      setError("Something went wrong. Please try again!")
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link 
        href="/teacher/courses" 
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-cyan-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Courses
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-0 bg-white/80 shadow-xl backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-gray-800">Create New Course</CardTitle>
            <p className="text-gray-500">Share your knowledge with students</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="border-rose-200 bg-rose-50 text-rose-700">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="title" className="font-semibold text-gray-700">
                  Course Title
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Introduction to Mathematics"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 border-2 border-cyan-200 bg-white/70 text-base focus:border-cyan-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="font-semibold text-gray-700">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe what students will learn in this course..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  disabled={isLoading}
                  className="border-2 border-cyan-200 bg-white/70 text-base focus:border-cyan-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="class" className="font-semibold text-gray-700">
                  Target Class <span className="text-rose-500">*</span>
                </Label>
                <Select value={courseClass} onValueChange={setCourseClass} disabled={isLoading}>
                  <SelectTrigger className="h-12 border-2 border-cyan-200 bg-white/70 text-base focus:border-cyan-400">
                    <SelectValue placeholder="Select which class this course is for" />
                  </SelectTrigger>
                  <SelectContent>
                    {[4, 5, 6, 7, 8, 9].map((num) => (
                      <SelectItem key={num} value={String(num)}>
                        <span className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-cyan-500" />
                          Class {num}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Only students of this class will see this course.
                </p>
              </div>

              <div className="rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 p-4 ring-1 ring-cyan-200/50">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-cyan-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-700">What happens next?</p>
                    <p className="text-sm text-gray-500">
                      After creating the course, you can add modules, quizzes, and assignments. 
                      Your course will be reviewed by an admin before being published.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Link href="/teacher/courses" className="flex-1">
                  <Button type="button" variant="outline" className="w-full h-12 border-2">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  className="flex-1 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 font-semibold" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Course"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
