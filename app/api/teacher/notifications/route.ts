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

    // 1. Fetch pending enrollments
    const enrollments = await sql`
      SELECT 
        e.id, 
        e.enrolled_at as event_time, 
        u.name as student_name, 
        c.title as course_title,
        c.class as course_class
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      JOIN courses c ON e.course_id = c.id
      WHERE c.teacher_id = ${teacherId} AND e.status = 'pending'
      ORDER BY e.enrolled_at DESC
      LIMIT 10
    `

    // 2. Fetch pending assignment submissions (ungraded)
    const submissions = await sql`
      SELECT 
        s.id, 
        s.submitted_at as event_time, 
        u.name as student_name, 
        a.title as assignment_title, 
        c.title as course_title
      FROM assignment_submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN users u ON s.user_id = u.id
      JOIN courses c ON a.course_id = c.id
      WHERE c.teacher_id = ${teacherId} 
        AND (s.status = 'submitted' OR s.status IS NULL)
        AND s.grade IS NULL
      ORDER BY s.submitted_at DESC
      LIMIT 10
    `

    // 3. Fetch upcoming deadlines (due in next 3 days)
    const deadlines = await sql`
      SELECT 
        a.id, 
        a.due_date as event_time, 
        a.title as assignment_title, 
        c.title as course_title
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE c.teacher_id = ${teacherId} 
        AND a.due_date > NOW() 
        AND a.due_date <= NOW() + INTERVAL '3 days'
      ORDER BY a.due_date ASC
      LIMIT 10
    `

    // 4. Fetch newly scheduled quizzes (created in last 3 days)
    const quizzes = await sql`
      SELECT 
        q.id, 
        q.created_at as event_time, 
        q.title as quiz_title, 
        c.title as course_title
      FROM quizzes q
      JOIN courses c ON q.course_id = c.id
      WHERE c.teacher_id = ${teacherId} 
        AND q.created_at >= NOW() - INTERVAL '3 days'
      ORDER BY q.created_at DESC
      LIMIT 10
    `

    // Formulate and map unified notification items
    const notificationList: any[] = [
      ...enrollments.map((e: any) => ({
        id: `enrollment-${e.id}`,
        title: "New Student Enrollment",
        description: `${e.student_name} requested to join "${e.course_title}" ${e.course_class ? `(Class ${e.course_class})` : ""}`,
        type: "enrollment",
        timestamp: e.event_time ? new Date(e.event_time).toISOString() : new Date().toISOString(),
        link: "/dashboard/teacher/enrollments",
      })),
      ...submissions.map((s: any) => ({
        id: `submission-${s.id}`,
        title: "Assignment Submission",
        description: `${s.student_name} submitted assignment "${s.assignment_title}" in "${s.course_title}"`,
        type: "submission",
        timestamp: s.event_time ? new Date(s.event_time).toISOString() : new Date().toISOString(),
        link: "/dashboard/teacher/assignments",
      })),
      ...deadlines.map((d: any) => ({
        id: `deadline-${d.id}`,
        title: "Upcoming Deadline",
        description: `Deadline approaching for "${d.assignment_title}" in "${d.course_title}"`,
        type: "deadline",
        timestamp: d.event_time ? new Date(d.event_time).toISOString() : new Date().toISOString(),
        link: "/dashboard/teacher/assignments",
      })),
      ...quizzes.map((q: any) => ({
        id: `quiz-${q.id}`,
        title: "New Quiz Scheduled",
        description: `Quiz "${q.quiz_title}" is active in course "${q.course_title}"`,
        type: "deadline",
        timestamp: q.event_time ? new Date(q.event_time).toISOString() : new Date().toISOString(),
        link: "/dashboard/teacher/quizzes",
      })),
    ]

    // Sort by timestamp descending
    const sortedNotifications = notificationList
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)

    return NextResponse.json({ notifications: sortedNotifications })
  } catch (error) {
    console.error("Teacher Notifications API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
