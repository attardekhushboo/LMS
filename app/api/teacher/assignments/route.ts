import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"

// ── Ensure file_url column exists (run once, cached after first call) ──────────
let fileUrlColumnEnsured = false
async function ensureFileUrlColumn() {
  if (fileUrlColumnEnsured) return
  try {
    await sql`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS file_url TEXT`
    fileUrlColumnEnsured = true
  } catch {
    fileUrlColumnEnsured = true // column already exists
  }
}

// ── Save uploaded file to /public/uploads/ ─────────────────────────────────────
async function saveFile(file: File): Promise<string> {
  const { writeFile, mkdir } = await import("fs/promises")
  const { join } = await import("path")

  const timestamp = Date.now()
  const filename = `assignment_${timestamp}.pdf`
  const uploadDir = join(process.cwd(), "public", "uploads")

  await mkdir(uploadDir, { recursive: true })

  const bytes = await file.arrayBuffer()
  await writeFile(join(uploadDir, filename), Buffer.from(bytes))

  return `/uploads/${filename}`
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await ensureFileUrlColumn()

    const teacherId = parseInt(session.user.id, 10)

    const assignments = await sql`
      SELECT 
        a.id, a.title, a.description, a.due_date, a.max_score, a.file_url,
        c.title as course_title, c.id as course_id,
        (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as submission_count,
        (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id AND status = 'submitted') as pending_count
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE c.teacher_id = ${teacherId}
      ORDER BY a.created_at DESC
    `

    return NextResponse.json(assignments)
  } catch (error) {
    console.error("Teacher Assignments GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Ensure file_url column exists before any INSERT
    await ensureFileUrlColumn()

    // ── Parse request (multipart OR JSON) ──────────────────────────────────────
    const contentType = request.headers.get("content-type") || ""
    let title = "", description = "", courseId = "", dueDate = ""
    let fileUrl: string | null = null

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      title       = (formData.get("title")       as string) || ""
      description = (formData.get("description") as string) || ""
      courseId    = (formData.get("courseId")    as string) || ""
      dueDate     = (formData.get("dueDate")     as string) || ""

      const file = formData.get("file") as File | null

      if (file && file.size > 0) {
        if (file.type !== "application/pdf") {
          return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 })
        }
        if (file.size > 5 * 1024 * 1024) {
          return NextResponse.json({ error: "File size must be under 5MB." }, { status: 400 })
        }
        try {
          fileUrl = await saveFile(file)
        } catch (fileError) {
          console.error("File save error:", fileError)
          // Don't block assignment creation if file save fails
          fileUrl = null
        }
      }
    } else {
      // JSON fallback (no file)
      const body = await request.json()
      title       = body.title       || ""
      description = body.description || ""
      courseId    = body.courseId    || ""
      dueDate     = body.dueDate     || ""
    }

    // ── Validate required fields ───────────────────────────────────────────────
    if (!title.trim()) {
      return NextResponse.json({ error: "Assignment title is required." }, { status: 400 })
    }
    if (!courseId) {
      return NextResponse.json({ error: "Please select a course." }, { status: 400 })
    }
    if (!dueDate) {
      return NextResponse.json({ error: "Due date is required." }, { status: 400 })
    }

    // ── Verify teacher owns the course ─────────────────────────────────────────
    const teacherId = parseInt(session.user.id, 10)
    const [course] = await sql`
      SELECT id FROM courses WHERE id = ${courseId} AND teacher_id = ${teacherId}
    `
    if (!course) {
      return NextResponse.json({ error: "Course not found or access denied." }, { status: 403 })
    }

    // ── Insert assignment ──────────────────────────────────────────────────────
    const result = await sql`
      INSERT INTO assignments (course_id, title, description, due_date, max_score, file_url)
      VALUES (
        ${courseId},
        ${title.trim()},
        ${description.trim() || null},
        ${dueDate},
        100,
        ${fileUrl}
      )
      RETURNING id
    `

    return NextResponse.json({
      success: true,
      id: result[0]?.id,
      message: "Assignment created successfully!",
      fileUrl,
    })
  } catch (error) {
    console.error("Teacher Assignment POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
