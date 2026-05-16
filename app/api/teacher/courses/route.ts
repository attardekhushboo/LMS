import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teacherId = parseInt(session.user.id, 10)
    const teacherEmail = session.user.email

    const courses = await sql`
      SELECT 
        c.id, 
        c.title, 
        c.description,
        c.status,
        c.class,
        c.created_at,
        u.email AS teacher_email,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as total_enrolled,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'approved') as approved_enrolled,
        (SELECT COUNT(*) FROM modules WHERE course_id = c.id) as modules_count
      FROM courses c
      JOIN users u ON c.teacher_id = u.id
      WHERE u.email = ${teacherEmail}
        AND c.teacher_id = ${teacherId}
      ORDER BY c.class ASC, c.created_at DESC
    `
    if (process.env.NODE_ENV === "development") {
      console.log("TEACHER EMAIL:", teacherEmail, "| ID:", teacherId, "| courses found:", courses.length)
    }

    return NextResponse.json(courses)
  } catch (error) {
    console.error("Teacher courses API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, description, class: classGrade } = await request.json()

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    // Ensure the class and institution_id columns exist (safe to run every time)
    try {
      await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS class INTEGER`
      await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES institutions(id)`
    } catch {
      // Columns already exist — ignore
    }

    // Extract numeric class from "Class 8", "8", or 8
    const classNumber = classGrade
      ? parseInt(String(classGrade).replace(/\D/g, ""), 10) || null
      : null

    const teacherId = parseInt(session.user.id, 10)
    const institutionId = (session.user as any).institutionId
      ? parseInt((session.user as any).institutionId, 10)
      : null

    const result = await sql`
      INSERT INTO courses (teacher_id, title, description, status, class, class_group, institution_id)
      VALUES (${teacherId}, ${title}, ${description || ""}, 'pending', ${classNumber}, ${classNumber}, ${institutionId})
      RETURNING id
    `

    return NextResponse.json({ id: result[0].id })
  } catch (error) {
    console.error("Create course API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
