import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== "institution") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const institutionId = (session.user as any).institutionId
    const notifications: any[] = []

    // 1. New student registrations in last 7 days
    try {
      const recentStudents = await sql`
        SELECT id, name, created_at FROM users 
        WHERE institution_id = ${institutionId} AND role = 'student' AND created_at >= NOW() - INTERVAL '7 days'
        ORDER BY created_at DESC
        LIMIT 10
      `
      for (const student of recentStudents) {
        notifications.push({
          id: `reg-${student.id}`,
          type: "registration",
          message: `New Student Registration: ${student.name} joined the platform.`,
          timestamp: student.created_at,
          link: "/dashboard/institution/students"
        })
      }
    } catch { /* ignored */ }

    // 2. Course completions
    try {
      const completions = await sql`
        SELECT e.id, u.name as student_name, c.title as course_title, e.updated_at 
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        JOIN courses c ON e.course_id = c.id
        WHERE u.institution_id = ${institutionId} AND e.progress = 100 AND e.status = 'approved'
        ORDER BY e.updated_at DESC
        LIMIT 10
      `
      for (const comp of completions) {
        notifications.push({
          id: `comp-${comp.id}`,
          type: "completion",
          message: `Course Completed: ${comp.student_name} finished "${comp.course_title}".`,
          timestamp: comp.updated_at,
          link: "/dashboard/institution/performance"
        })
      }
    } catch { /* ignored */ }

    // 3. Certificates issued
    try {
      const certs = await sql`
        SELECT cert.id, u.name as student_name, c.title as course_title, cert.issued_at 
        FROM certificates cert
        JOIN users u ON cert.user_id = u.id
        JOIN courses c ON cert.course_id = c.id
        WHERE u.institution_id = ${institutionId}
        ORDER BY cert.issued_at DESC
        LIMIT 10
      `
      for (const cert of certs) {
        notifications.push({
          id: `cert-${cert.id}`,
          type: "certificate",
          message: `Certificate issued to ${cert.student_name} for "${cert.course_title}".`,
          timestamp: cert.issued_at,
          link: "/dashboard/institution/reports"
        })
      }
    } catch { /* ignored */ }

    // 4. Low engagement alerts
    try {
      const lowEngagement = await sql`
        SELECT e.id, u.name as student_name, c.title as course_title, e.progress, e.enrolled_at 
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        JOIN courses c ON e.course_id = c.id
        WHERE u.institution_id = ${institutionId} AND e.status = 'approved' AND e.progress < 10 AND e.enrolled_at <= NOW() - INTERVAL '14 days'
        ORDER BY e.progress ASC
        LIMIT 5
      `
      for (const low of lowEngagement) {
        notifications.push({
          id: `low-${low.id}`,
          type: "engagement",
          message: `Engagement Alert: ${low.student_name} has low progress (${low.progress}%) in "${low.course_title}".`,
          timestamp: low.enrolled_at,
          link: "/dashboard/institution/students"
        })
      }
    } catch { /* ignored */ }

    // Sort by timestamp desc
    const sortedNotifications = notifications
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20)

    return NextResponse.json({ notifications: sortedNotifications })
  } catch (error) {
    console.error("Institution notifications API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
