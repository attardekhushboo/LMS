import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teacherId = parseInt(session.user.id, 10)
    const teacherEmail = session.user.email

    if (process.env.NODE_ENV === "development") {
      console.log("TEACHER EMAIL:", teacherEmail, "| ID:", teacherId)
    }

    // Total courses — filter by teacher email via JOIN
    const coursesResult = await sql`
      SELECT COUNT(*) as count
      FROM courses c
      JOIN users u ON c.teacher_id = u.id
      WHERE u.email = ${teacherEmail}
    `
    const totalCourses = parseInt(coursesResult[0]?.count || "0")

    // Total unique students enrolled in teacher's courses
    const studentsResult = await sql`
      SELECT COUNT(DISTINCT e.user_id) as count 
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON c.teacher_id = u.id
      WHERE u.email = ${teacherEmail}
    `
    const totalStudents = parseInt(studentsResult[0]?.count || "0")

    // Total quizzes — only quizzes the teacher personally created (teacher_id set on quiz)
    const quizzesResult = await sql`
      SELECT COUNT(*) as count 
      FROM quizzes q
      WHERE q.teacher_id = ${teacherId}
    `
    const totalQuizzes = parseInt(quizzesResult[0]?.count || "0")

    // Total assignments for teacher's courses
    const assignmentsResult = await sql`
      SELECT COUNT(*) as count 
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN users u ON c.teacher_id = u.id
      WHERE u.email = ${teacherEmail}
    `
    const totalAssignments = parseInt(assignmentsResult[0]?.count || "0")

    // Pending enrollments for teacher's courses
    const pendingEnrollmentsResult = await sql`
      SELECT COUNT(*) as count 
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON c.teacher_id = u.id
      WHERE u.email = ${teacherEmail} AND e.status = 'pending'
    `
    const pendingEnrollments = parseInt(pendingEnrollmentsResult[0]?.count || "0")

    // Pending assignment submissions for teacher's courses
    // Ensure status column exists (added after initial migration)
    try {
      await sql`ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'submitted'`
    } catch { /* already exists */ }

    const pendingResult = await sql`
      SELECT COUNT(*) as count 
      FROM assignment_submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      JOIN users u ON c.teacher_id = u.id
      WHERE u.email = ${teacherEmail}
        AND (s.status = 'submitted' OR s.status IS NULL)
    `
    const pendingSubmissions = parseInt(pendingResult[0]?.count || "0")

    console.log("Teacher Dashboard Stats", { teacherEmail, totalCourses, totalStudents, pendingEnrollments, pendingSubmissions })

    // Recent courses with enrollment count
    const recentCourses = await sql`
      SELECT 
        c.id, 
        c.title, 
        c.status,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'approved') as enrolled_count
      FROM courses c
      JOIN users u ON c.teacher_id = u.id
      WHERE u.email = ${teacherEmail}
      ORDER BY c.created_at DESC
      LIMIT 5
    `

    return NextResponse.json({
      totalCourses,
      totalStudents,
      totalQuizzes,
      totalAssignments,
      pendingEnrollments,
      pendingSubmissions,
      recentCourses,
    })
  } catch (error) {
    console.error("Teacher dashboard API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
