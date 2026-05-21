import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    const isStudent = (session?.user as any)?.role === 'student'
    const studentClass = (session?.user as any)?.class

    let courses;
    if (isStudent && studentClass !== undefined && studentClass !== null) {
      courses = await sql`
        SELECT 
          c.id, 
          c.title, 
          c.description,
          c.thumbnail,
          c.status,
          c.class,
          u.name as teacher_name,
          (SELECT COUNT(*) FROM modules WHERE course_id = c.id) as total_modules,
          (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'approved') as enrolled_count
        FROM courses c
        JOIN users u ON c.teacher_id = u.id
        WHERE c.status = 'approved'
          AND u.email IS NOT NULL
          AND (c.class = ${Number(studentClass)} OR CAST(c.class AS TEXT) = ${String(studentClass)})
        ORDER BY c.created_at DESC
      `
    } else {
      courses = await sql`
        SELECT 
          c.id, 
          c.title, 
          c.description,
          c.thumbnail,
          c.status,
          c.class,
          u.name as teacher_name,
          (SELECT COUNT(*) FROM modules WHERE course_id = c.id) as total_modules,
          (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'approved') as enrolled_count
        FROM courses c
        JOIN users u ON c.teacher_id = u.id
        WHERE c.status = 'approved'
          AND u.email IS NOT NULL
        ORDER BY c.class ASC, c.created_at DESC
      `
    }

    return NextResponse.json(courses)
  } catch (error) {
    console.error("Courses API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
