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

    // Total courses
    const coursesResult = await sql`
      SELECT COUNT(*) as count
      FROM courses c
      JOIN users u ON c.teacher_id = u.id
      WHERE u.email = ${teacherEmail}
    `
    const totalCourses = parseInt(coursesResult[0]?.count || "0", 10)

    // Total unique students enrolled in teacher's courses
    const studentsResult = await sql`
      SELECT COUNT(DISTINCT e.user_id) as count 
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON c.teacher_id = u.id
      WHERE u.email = ${teacherEmail}
    `
    const totalStudents = parseInt(studentsResult[0]?.count || "0", 10)

    // Total quizzes personally created
    const quizzesResult = await sql`
      SELECT COUNT(*) as count 
      FROM quizzes q
      WHERE q.teacher_id = ${teacherId}
    `
    const totalQuizzes = parseInt(quizzesResult[0]?.count || "0", 10)

    // Total assignments for teacher's courses
    const assignmentsResult = await sql`
      SELECT COUNT(*) as count 
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN users u ON c.teacher_id = u.id
      WHERE u.email = ${teacherEmail}
    `
    const totalAssignments = parseInt(assignmentsResult[0]?.count || "0", 10)

    // Pending enrollments
    const pendingEnrollmentsResult = await sql`
      SELECT COUNT(*) as count 
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON c.teacher_id = u.id
      WHERE u.email = ${teacherEmail} AND e.status = 'pending'
    `
    const pendingEnrollments = parseInt(pendingEnrollmentsResult[0]?.count || "0", 10)

    // Pending assignment submissions
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
    const pendingSubmissions = parseInt(pendingResult[0]?.count || "0", 10)

    // Recent courses with enrollment count
    const recentCourses = await sql`
      SELECT 
        c.id, 
        c.title, 
        c.status,
        c.class,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'approved') as enrolled_count
      FROM courses c
      JOIN users u ON c.teacher_id = u.id
      WHERE u.email = ${teacherEmail}
      ORDER BY c.created_at DESC
    `

    // --- METRIC 1: AVERAGE QUIZ SCORE ---
    let averageQuizScore = 0
    try {
      const quizScoresResult = await sql`
        SELECT COALESCE(SUM(qr.score), 0) as achieved, COALESCE(SUM(qp.total_points), 0) as total
        FROM quiz_responses qr
        JOIN quizzes q ON qr.quiz_id = q.id
        JOIN (
          SELECT quiz_id, SUM(points) as total_points
          FROM quiz_questions
          GROUP BY quiz_id
        ) qp ON qr.quiz_id = qp.quiz_id
        JOIN courses c ON q.course_id = c.id
        JOIN users u ON c.teacher_id = u.id
        WHERE u.email = ${teacherEmail}
      `
      const achievedScore = parseFloat(quizScoresResult[0]?.achieved || "0")
      const totalPossibleScore = parseFloat(quizScoresResult[0]?.total || "0")
      averageQuizScore = totalPossibleScore > 0 ? Math.round((achievedScore / totalPossibleScore) * 100) : 0
    } catch (e) {
      console.error("Error calculating averageQuizScore:", e)
    }

    // --- METRIC 2: COURSE COMPLETION ---
    let courseCompletion = 0
    try {
      const courseEnrollmentsResult = await sql`
        SELECT COALESCE(SUM(course_enrollments.student_count * course_modules.module_count), 0) as total_assigned
        FROM (
          SELECT course_id, COUNT(*) as student_count
          FROM enrollments
          WHERE status = 'approved'
          GROUP BY course_id
        ) course_enrollments
        JOIN (
          SELECT course_id, COUNT(*) as module_count
          FROM modules
          GROUP BY course_id
        ) course_modules ON course_enrollments.course_id = course_modules.course_id
        JOIN courses c ON course_enrollments.course_id = c.id
        JOIN users u ON c.teacher_id = u.id
        WHERE u.email = ${teacherEmail}
      `
      const totalAssignedModules = parseInt(courseEnrollmentsResult[0]?.total_assigned || "0", 10)

      const completedModulesResult = await sql`
        SELECT COUNT(*) as completed_count
        FROM module_progress mp
        JOIN modules m ON mp.module_id = m.id
        JOIN enrollments e ON m.course_id = e.course_id AND mp.user_id = e.user_id
        JOIN courses c ON m.course_id = c.id
        JOIN users u ON c.teacher_id = u.id
        WHERE u.email = ${teacherEmail} AND mp.completed = true AND e.status = 'approved'
      `
      const completedModules = parseInt(completedModulesResult[0]?.completed_count || "0", 10)
      courseCompletion = totalAssignedModules > 0 ? Math.round((completedModules / totalAssignedModules) * 100) : 0
    } catch (e) {
      console.error("Error calculating courseCompletion:", e)
    }

    // --- METRIC 3: ASSIGNMENT SUBMISSION RATE ---
    let assignmentSubmissionRate = 0
    try {
      const courseAssignmentsResult = await sql`
        SELECT COALESCE(SUM(course_enrollments.student_count * course_assignments.assignment_count), 0) as total_assigned
        FROM (
          SELECT course_id, COUNT(*) as student_count
          FROM enrollments
          WHERE status = 'approved'
          GROUP BY course_id
        ) course_enrollments
        JOIN (
          SELECT course_id, COUNT(*) as assignment_count
          FROM assignments
          GROUP BY course_id
        ) course_assignments ON course_enrollments.course_id = course_assignments.course_id
        JOIN courses c ON course_enrollments.course_id = c.id
        JOIN users u ON c.teacher_id = u.id
        WHERE u.email = ${teacherEmail}
      `
      const totalAssignedAssignments = parseInt(courseAssignmentsResult[0]?.total_assigned || "0", 10)

      const submittedAssignmentsResult = await sql`
        SELECT COUNT(*) as submission_count
        FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN enrollments e ON a.course_id = e.course_id AND s.user_id = e.user_id
        JOIN courses c ON a.course_id = c.id
        JOIN users u ON c.teacher_id = u.id
        WHERE u.email = ${teacherEmail} AND e.status = 'approved'
      `
      const submittedAssignments = parseInt(submittedAssignmentsResult[0]?.submission_count || "0", 10)
      assignmentSubmissionRate = totalAssignedAssignments > 0 ? Math.round((submittedAssignments / totalAssignedAssignments) * 100) : 0
    } catch (e) {
      console.error("Error calculating assignmentSubmissionRate:", e)
    }

    // --- METRIC 4: STUDENT PARTICIPATION ---
    let studentParticipation = 0
    try {
      const totalEnrolledStudentsResult = await sql`
        SELECT COUNT(DISTINCT e.user_id) as total_enrolled
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN users u ON c.teacher_id = u.id
        WHERE u.email = ${teacherEmail} AND e.status = 'approved'
      `
      const totalEnrolledStudents = parseInt(totalEnrolledStudentsResult[0]?.total_enrolled || "0", 10)

      const activeStudentsResult = await sql`
        SELECT COUNT(DISTINCT active_user_id) as active_count
        FROM (
          SELECT qr.user_id as active_user_id
          FROM quiz_responses qr
          JOIN quizzes q ON qr.quiz_id = q.id
          JOIN courses c ON q.course_id = c.id
          JOIN users u ON c.teacher_id = u.id
          WHERE u.email = ${teacherEmail} AND qr.completed_at >= NOW() - INTERVAL '30 days'

          UNION

          SELECT s.user_id as active_user_id
          FROM assignment_submissions s
          JOIN assignments a ON s.assignment_id = a.id
          JOIN courses c ON a.course_id = c.id
          JOIN users u ON c.teacher_id = u.id
          WHERE u.email = ${teacherEmail} AND s.submitted_at >= NOW() - INTERVAL '30 days'

          UNION

          SELECT mp.user_id as active_user_id
          FROM module_progress mp
          JOIN modules m ON mp.module_id = m.id
          JOIN courses c ON m.course_id = c.id
          JOIN users u ON c.teacher_id = u.id
          WHERE u.email = ${teacherEmail} AND mp.completed_at >= NOW() - INTERVAL '30 days'
        ) active_students
      `
      const activeStudents = parseInt(activeStudentsResult[0]?.active_count || "0", 10)
      studentParticipation = totalEnrolledStudents > 0 ? Math.round((activeStudents / totalEnrolledStudents) * 100) : 0
    } catch (e) {
      console.error("Error calculating studentParticipation:", e)
    }

    // --- UPCOMING DEADLINES WIDGET DATA ---
    let upcomingDeadlines: any[] = []
    try {
      const upcomingAssignments = await sql`
        SELECT 
          'assignment' as type,
          a.id,
          a.title,
          a.due_date as deadline_date,
          c.title as course_title,
          c.class as course_class
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN users u ON c.teacher_id = u.id
        WHERE u.email = ${teacherEmail} AND a.due_date >= NOW() - INTERVAL '1 day'
        ORDER BY a.due_date ASC
        LIMIT 5
      `

      const pendingGradingTasks = await sql`
        SELECT DISTINCT
          'grading' as type,
          a.id,
          a.title,
          a.due_date as deadline_date,
          c.title as course_title,
          c.class as course_class
        FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        JOIN users u ON c.teacher_id = u.id
        WHERE u.email = ${teacherEmail} AND s.grade IS NULL
        LIMIT 3
      `

      const mergedDeadlines = [
        ...upcomingAssignments.map((a: any) => ({
          id: `assignment-${a.id}`,
          type: "assignment",
          title: a.title,
          courseTitle: a.course_title,
          courseClass: a.course_class,
          deadlineDate: a.deadline_date,
        })),
        ...pendingGradingTasks.map((t: any) => ({
          id: `grading-${t.id}`,
          type: "grading",
          title: `Grade: ${t.title}`,
          courseTitle: t.course_title,
          courseClass: t.course_class,
          deadlineDate: t.deadline_date,
        }))
      ]

      upcomingDeadlines = Array.from(new Map(mergedDeadlines.map(item => [item.id, item])).values())
        .sort((a, b) => new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime())
        .slice(0, 5)
    } catch (e) {
      console.error("Error generating upcomingDeadlines:", e)
    }

    // --- RECENT ACTIVITY TIMELINE DATA ---
    let recentActivities: any[] = []
    try {
      const submissions = await sql`
        SELECT 
          s.submitted_at as event_time,
          u_student.name as student_name,
          a.title as assignment_title
        FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN users u_student ON s.user_id = u_student.id
        JOIN courses c ON a.course_id = c.id
        JOIN users u_teacher ON c.teacher_id = u_teacher.id
        WHERE u_teacher.email = ${teacherEmail}
        ORDER BY s.submitted_at DESC
        LIMIT 10
      `

      const enrollments = await sql`
        SELECT 
          e.enrolled_at as event_time,
          u_student.name as student_name,
          c.title as course_title
        FROM enrollments e
        JOIN users u_student ON e.user_id = u_student.id
        JOIN courses c ON e.course_id = c.id
        JOIN users u_teacher ON c.teacher_id = u_teacher.id
        WHERE u_teacher.email = ${teacherEmail} AND e.status = 'approved'
        ORDER BY e.enrolled_at DESC
        LIMIT 10
      `

      const quizzes = await sql`
        SELECT 
          q.created_at as event_time,
          q.title as quiz_title
        FROM quizzes q
        JOIN courses c ON q.course_id = c.id
        JOIN users u_teacher ON c.teacher_id = u_teacher.id
        WHERE u_teacher.email = ${teacherEmail}
        ORDER BY q.created_at DESC
        LIMIT 10
      `

      const assignments = await sql`
        SELECT 
          a.created_at as event_time,
          a.title as assignment_title
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN users u_teacher ON c.teacher_id = u_teacher.id
        WHERE u_teacher.email = ${teacherEmail}
        ORDER BY a.created_at DESC
        LIMIT 10
      `

      const courses = await sql`
        SELECT 
          c.created_at as event_time,
          c.title as course_title
        FROM courses c
        JOIN users u_teacher ON c.teacher_id = u_teacher.id
        WHERE u_teacher.email = ${teacherEmail} AND c.status = 'approved'
        ORDER BY c.created_at DESC
        LIMIT 10
      `

      const modules = await sql`
        SELECT 
          m.created_at as event_time,
          m.title as module_title,
          c.title as course_title
        FROM modules m
        JOIN courses c ON m.course_id = c.id
        JOIN users u_teacher ON c.teacher_id = u_teacher.id
        WHERE u_teacher.email = ${teacherEmail}
        ORDER BY m.created_at DESC
        LIMIT 10
      `

      const gradedSubmissions = await sql`
        SELECT 
          s.submitted_at as event_time,
          a.title as assignment_title,
          u_student.name as student_name
        FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN users u_student ON s.user_id = u_student.id
        JOIN courses c ON a.course_id = c.id
        JOIN users u_teacher ON c.teacher_id = u_teacher.id
        WHERE u_teacher.email = ${teacherEmail} AND s.grade IS NOT NULL
        ORDER BY s.submitted_at DESC
        LIMIT 10
      `

      const mergedActivities = [
        ...submissions.map((s: any) => ({
          type: "submission",
          message: `${s.student_name} submitted "${s.assignment_title}"`,
          timestamp: s.event_time,
        })),
        ...enrollments.map((e: any) => ({
          type: "enrollment",
          message: `${e.student_name} enrolled in ${e.course_title}`,
          timestamp: e.event_time,
        })),
        ...quizzes.map((q: any) => ({
          type: "quiz_created",
          message: `Quiz "${q.quiz_title}" created`,
          timestamp: q.event_time,
        })),
        ...assignments.map((a: any) => ({
          type: "assignment_published",
          message: `Assignment "${a.assignment_title}" published`,
          timestamp: a.event_time,
        })),
        ...courses.map((c: any) => ({
          type: "course_published",
          message: `Course "${c.course_title}" published`,
          timestamp: c.event_time,
        })),
        ...modules.map((m: any) => ({
          type: "module_added",
          message: `Module "${m.module_title}" added to ${m.course_title}`,
          timestamp: m.event_time,
        })),
        ...gradedSubmissions.map((g: any) => ({
          type: "graded",
          message: `"${g.assignment_title}" graded for ${g.student_name}`,
          timestamp: g.event_time,
        }))
      ]

      recentActivities = mergedActivities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 6)
    } catch (e) {
      console.error("Error generating recentActivities:", e)
    }

    return NextResponse.json({
      totalCourses,
      totalStudents,
      totalQuizzes,
      totalAssignments,
      pendingEnrollments,
      pendingSubmissions,
      recentCourses,
      teachingAnalytics: {
        averageQuizScore,
        courseCompletion,
        assignmentSubmissionRate,
        studentParticipation
      },
      upcomingDeadlines,
      recentActivities
    })
  } catch (error) {
    console.error("Teacher dashboard API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
