import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== "institution") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const institutionId = (session.user as any).institutionId
    if (process.env.NODE_ENV === "development") {
      console.log("USER ID:", session?.user?.id)
    }

    const studentsResult = await sql`
      SELECT COUNT(*) as count FROM users 
      WHERE institution_id = ${institutionId} AND role = 'student'
    `
    const totalStudents = parseInt(studentsResult[0]?.count || "0")

    const coursesResult = await sql`
      SELECT COUNT(*) as count FROM courses WHERE institution_id = ${institutionId}
    `
    const totalCourses = parseInt(coursesResult[0]?.count || "0")

    const enrollmentsResult = await sql`
      SELECT COUNT(*) as count FROM enrollments e
      JOIN users u ON e.user_id = u.id
      WHERE u.institution_id = ${institutionId} AND e.status = 'approved'
    `
    const totalEnrollments = parseInt(enrollmentsResult[0]?.count || "0")

    const progressResult = await sql`
      SELECT COALESCE(AVG(e.progress), 0) as avg_progress 
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      WHERE u.institution_id = ${institutionId} AND e.status = 'approved'
    `
    const averageProgress = Math.round(parseFloat(progressResult[0]?.avg_progress || "0"))

    const certificatesResult = await sql`
      SELECT COUNT(*) as count FROM certificates c
      JOIN users u ON c.user_id = u.id
      WHERE u.institution_id = ${institutionId}
    `
    const certificatesEarned = parseInt(certificatesResult[0]?.count || "0")

    const topStudents = await sql`
      SELECT 
        u.id, 
        u.name, 
        u.email,
        (SELECT COUNT(*) FROM enrollments WHERE user_id = u.id AND status = 'approved') as courses_enrolled,
        (SELECT COUNT(*) FROM certificates WHERE user_id = u.id) as certificates,
        COALESCE((SELECT AVG(progress) FROM enrollments WHERE user_id = u.id AND status = 'approved'), 0) as avg_progress
      FROM users u
      WHERE u.institution_id = ${institutionId} AND u.role = 'student'
      GROUP BY u.id, u.name, u.email
      ORDER BY avg_progress DESC, certificates DESC
      LIMIT 5
    `

    return NextResponse.json({
      totalStudents,
      totalCourses,
      totalEnrollments,
      averageProgress,
      certificatesEarned,
      topStudents,
    })
  } catch (error) {
    console.error("Institution dashboard API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
