import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"

// Removed legacy ONE-PER-COURSE DB constraints logic as we now support multiple quizzes/assignments per course.

let columnsEnsured = false
async function ensureDbColumns() {
  if (columnsEnsured) return
  try {
    // Add new columns to quizzes
    await sql`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS description TEXT`
    await sql`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published'`
    
    // Add new columns to assignments
    await sql`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published'`
    await sql`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS max_score INTEGER DEFAULT 100`
    
    // Ensure teacher_id exists in quizzes
    await sql`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS teacher_id INTEGER`
    
    columnsEnsured = true
  } catch (err) {
    console.error("ensureDbColumns error:", err)
    columnsEnsured = true
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params
    const teacherId = parseInt(session.user.id, 10)

    // Run self-healing column check
    await ensureDbColumns()

    const course = await sql`
      SELECT c.id, c.title, c.description, c.status,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'approved') as enrolled_count,
        (SELECT COUNT(*) FROM modules WHERE course_id = c.id) as modules_count
      FROM courses c
      WHERE c.id = ${id} AND c.teacher_id = ${teacherId}
    `
    if (!course.length) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const modules = await sql`
      SELECT id, title, description, video_url, content, order_number
      FROM modules WHERE course_id = ${id} ORDER BY order_number
    `

    // Fetch ALL quizzes for this course with description and status
    const quizzes = await sql`
      SELECT q.id, q.title, q.description, q.time_limit, q.passing_score, q.max_attempts, q.status,
        (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count
      FROM quizzes q WHERE q.course_id = ${id}
      ORDER BY q.created_at DESC
    `

    // Fetch ALL assignments for this course with status and max_score
    const assignments = await sql`
      SELECT a.id, a.title, a.description, a.due_date, a.max_score, a.file_url, a.status,
        (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as submission_count
      FROM assignments a WHERE a.course_id = ${id}
      ORDER BY a.created_at DESC
    `

    return NextResponse.json({ ...course[0], modules, quizzes, assignments })
  } catch (error) {
    console.error("Course detail error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params
    await sql`DELETE FROM courses WHERE id = ${id} AND teacher_id = ${parseInt(session.user.id, 10)}`
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
