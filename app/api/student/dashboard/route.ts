import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    if (process.env.NODE_ENV === "development") {
      console.log("USER ID:", session?.user?.id);
    }

    // Get enrolled courses count
    const enrolledResult = await sql`
      SELECT COUNT(*) as count FROM enrollments 
      WHERE user_id = ${userId} AND status = 'approved'
    `
    const enrolledCourses = parseInt(enrolledResult[0]?.count || "0")

    // Get total available courses for student class (valid courses only — teacher email must exist)
    let totalCourses = 0
    if (session.user.class) {
      const totalResult = await sql`
        SELECT COUNT(*) as count
        FROM courses c
        JOIN users u ON c.teacher_id = u.id
        WHERE c.class = ${session.user.class}
          AND c.status = 'approved'
          AND u.email IS NOT NULL
      `
      totalCourses = parseInt(totalResult[0]?.count || "0")
    }

    // Get completed courses count
    const completedResult = await sql`
      SELECT COUNT(*) as count FROM enrollments 
      WHERE user_id = ${userId} AND status = 'approved' AND progress = 100
    `
    const completedCourses = parseInt(completedResult[0]?.count || "0")

    // Ensure quiz and assignment tables exist before querying them
    try {
      await sql`CREATE TABLE IF NOT EXISTS quiz_responses (
        id SERIAL PRIMARY KEY,
        quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        UNIQUE(quiz_id, user_id)
      )`
      await sql`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3`
      await sql`ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'submitted'`
    } catch { /* tables already exist */ }

    // Get quiz stats
    let totalQuizzes = 0
    let completedQuizzes = 0
    try {
      const quizStatsResult = await sql`
        SELECT 
          COUNT(DISTINCT q.id) as total_quizzes,
          COUNT(DISTINCT qr.id) as completed_quizzes
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN users u ON c.teacher_id = u.id
        LEFT JOIN quizzes q ON q.course_id = c.id AND q.teacher_id IS NOT NULL
        LEFT JOIN quiz_responses qr ON qr.quiz_id = q.id AND qr.user_id = ${userId} AND qr.score >= q.passing_score
        WHERE e.user_id = ${userId}
          AND e.status = 'approved'
          AND u.email IS NOT NULL
      `
      totalQuizzes = parseInt(quizStatsResult[0]?.total_quizzes || "0")
      completedQuizzes = parseInt(quizStatsResult[0]?.completed_quizzes || "0")
    } catch { /* quiz_responses not yet populated */ }

    // Get assignment stats
    let totalAssignments = 0
    let completedAssignments = 0
    try {
      const assignmentStatsResult = await sql`
        SELECT 
          COUNT(DISTINCT a.id) as total_assignments,
          COUNT(DISTINCT s.assignment_id) as completed_assignments
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN assignments a ON a.course_id = c.id
        LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.user_id = ${userId} AND s.status = 'graded'
        WHERE e.user_id = ${userId} AND e.status = 'approved'
      `
      totalAssignments = parseInt(assignmentStatsResult[0]?.total_assignments || "0")
      completedAssignments = parseInt(assignmentStatsResult[0]?.completed_assignments || "0")
    } catch { /* assignment_submissions not yet populated */ }

    // Get certificates count
    const certificatesResult = await sql`
      SELECT COUNT(*) as count FROM certificates WHERE user_id = ${userId}
    `
    const certificates = parseInt(certificatesResult[0]?.count || "0")

    // Get recent courses with progress (valid courses only — teacher email must exist)
    const recentCourses = await sql`
      SELECT 
        c.id, 
        c.title, 
        e.progress,
        c.thumbnail
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON c.teacher_id = u.id
      WHERE e.user_id = ${userId}
        AND e.status = 'approved'
        AND u.email IS NOT NULL
      ORDER BY e.updated_at DESC
      LIMIT 6
    `

    return NextResponse.json({
      enrolledCourses,
      totalCourses,
      completedCourses,
      totalQuizzes,
      completedQuizzes,
      totalAssignments,
      completedAssignments,
      certificates,
      recentCourses,
    })
  } catch (error) {
    console.error("Dashboard API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
