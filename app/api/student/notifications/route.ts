import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = parseInt(session.user.id, 10)

    // 1. Fetch recently approved enrollments (last 7 days)
    const enrollments = await sql`
      SELECT 
        e.id, 
        e.updated_at as event_time, 
        c.title as course_title
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ${userId} 
        AND e.status = 'approved'
        AND e.updated_at >= NOW() - INTERVAL '7 days'
      ORDER BY e.updated_at DESC
      LIMIT 10
    `

    // 2. Fetch recently published assignments in enrolled courses (last 3 days)
    const assignments = await sql`
      SELECT 
        a.id, 
        a.created_at as event_time, 
        a.title as assignment_title, 
        c.title as course_title
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN enrollments e ON e.course_id = c.id
      WHERE e.user_id = ${userId} 
        AND e.status = 'approved'
        AND a.created_at >= NOW() - INTERVAL '3 days'
      ORDER BY a.created_at DESC
      LIMIT 10
    `

    // 3. Fetch upcoming quiz deadlines in enrolled courses (due in next 3 days)
    const quizzes = await sql`
      SELECT 
        q.id, 
        q.due_date as event_time, 
        q.title as quiz_title, 
        c.title as course_title
      FROM quizzes q
      JOIN courses c ON q.course_id = c.id
      JOIN enrollments e ON e.course_id = c.id
      WHERE e.user_id = ${userId} 
        AND e.status = 'approved'
        AND q.due_date > NOW() 
        AND q.due_date <= NOW() + INTERVAL '3 days'
      ORDER BY q.due_date ASC
      LIMIT 10
    `

    // 4. Fetch recently earned certificates (last 7 days)
    const certificates = await sql`
      SELECT 
        cert.id, 
        cert.issued_at as event_time, 
        c.title as course_title
      FROM certificates cert
      JOIN courses c ON cert.course_id = c.id
      WHERE cert.user_id = ${userId}
        AND cert.issued_at >= NOW() - INTERVAL '7 days'
      ORDER BY cert.issued_at DESC
      LIMIT 10
    `

    const notificationList: any[] = [
      ...enrollments.map((e: any) => ({
        id: `enrollment-${e.id}`,
        title: "Enrollment Confirmed",
        description: `Your enrollment in "${e.course_title}" has been approved! Ready to learn?`,
        type: "enrollment",
        timestamp: e.event_time ? new Date(e.event_time).toISOString() : new Date().toISOString(),
        link: "/dashboard/student/courses",
      })),
      ...assignments.map((a: any) => ({
        id: `assignment-${a.id}`,
        title: "New Assignment Published",
        description: `A new assignment "${a.assignment_title}" has been posted in "${a.course_title}".`,
        type: "submission",
        timestamp: a.event_time ? new Date(a.event_time).toISOString() : new Date().toISOString(),
        link: "/dashboard/student/assignments",
      })),
      ...quizzes.map((q: any) => ({
        id: `quiz-${q.id}`,
        title: "Quiz Deadline Near",
        description: `The deadline for "${q.quiz_title}" in "${q.course_title}" ends soon.`,
        type: "deadline",
        timestamp: q.event_time ? new Date(q.event_time).toISOString() : new Date().toISOString(),
        link: "/dashboard/student/quizzes",
      })),
      ...certificates.map((c: any) => ({
        id: `certificate-${c.id}`,
        title: "Certificate Earned",
        description: `Congratulations! You have completed "${c.course_title}" and earned a certificate.`,
        type: "enrollment",
        timestamp: c.event_time ? new Date(c.event_time).toISOString() : new Date().toISOString(),
        link: "/dashboard/student/certificates",
      })),
    ]

    const sortedNotifications = notificationList
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)

    return NextResponse.json({ notifications: sortedNotifications })
  } catch (error) {
    console.error("Student Notifications API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
