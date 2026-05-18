import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = parseInt(session.user.id, 10)
    const studentName = (session.user as any).name || "Student"
    const studentClass = (session.user as any).class

    // 1. Get enrolled courses count
    const enrolledResult = await sql`
      SELECT COUNT(*) as count FROM enrollments 
      WHERE user_id = ${userId} AND status = 'approved'
    `
    const enrolledCourses = parseInt(enrolledResult[0]?.count || "0", 10)

    // 2. Get total available courses for student class
    let totalCourses = 0
    if (studentClass) {
      const totalResult = await sql`
        SELECT COUNT(*) as count
        FROM courses c
        JOIN users u ON c.teacher_id = u.id
        WHERE c.class = ${studentClass}
          AND c.status = 'approved'
          AND u.email IS NOT NULL
      `
      totalCourses = parseInt(totalResult[0]?.count || "0", 10)
    }

    // 3. Get completed courses count
    const completedResult = await sql`
      SELECT COUNT(*) as count FROM enrollments 
      WHERE user_id = ${userId} AND status = 'approved' AND progress = 100
    `
    const completedCourses = parseInt(completedResult[0]?.count || "0", 10)

    // 4. Get quiz stats
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
      totalQuizzes = parseInt(quizStatsResult[0]?.total_quizzes || "0", 10)
      completedQuizzes = parseInt(quizStatsResult[0]?.completed_quizzes || "0", 10)
    } catch { /* ignored */ }

    // 5. Get assignment stats
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
        LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.user_id = ${userId}
        WHERE e.user_id = ${userId} AND e.status = 'approved'
      `
      totalAssignments = parseInt(assignmentStatsResult[0]?.total_assignments || "0", 10)
      completedAssignments = parseInt(assignmentStatsResult[0]?.completed_assignments || "0", 10)
    } catch { /* ignored */ }

    // 6. Get certificates count
    const certificatesResult = await sql`
      SELECT COUNT(*) as count FROM certificates WHERE user_id = ${userId}
    `
    const certificates = parseInt(certificatesResult[0]?.count || "0", 10)

    // 7. Get dynamic upcoming deadlines (assignments and quizzes in enrolled courses)
    let upcomingDeadlines: any[] = []
    try {
      const activeAssignments = await sql`
        SELECT 
          'assignment' as type,
          a.id,
          a.title,
          a.due_date as deadline_date,
          c.title as course_title
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN enrollments e ON e.course_id = c.id
        LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.user_id = ${userId}
        WHERE e.user_id = ${userId} 
          AND e.status = 'approved' 
          AND a.due_date >= NOW() - INTERVAL '1 day'
          AND s.id IS NULL
        ORDER BY a.due_date ASC
        LIMIT 5
      `

      const activeQuizzes = await sql`
        SELECT 
          'quiz' as type,
          q.id,
          q.title,
          q.due_date as deadline_date,
          c.title as course_title
        FROM quizzes q
        JOIN courses c ON q.course_id = c.id
        JOIN enrollments e ON e.course_id = c.id
        LEFT JOIN quiz_responses qr ON qr.quiz_id = q.id AND qr.user_id = ${userId}
        WHERE e.user_id = ${userId} 
          AND e.status = 'approved' 
          AND q.due_date >= NOW() - INTERVAL '1 day'
          AND qr.id IS NULL
        ORDER BY q.due_date ASC
        LIMIT 5
      `

      const mergedDeadlines = [
        ...activeAssignments.map((a: any) => ({
          id: `assignment-${a.id}`,
          type: "assignment",
          title: a.title,
          courseTitle: a.course_title,
          deadlineDate: a.deadline_date,
        })),
        ...activeQuizzes.map((q: any) => ({
          id: `quiz-${q.id}`,
          type: "quiz",
          title: q.title,
          courseTitle: q.course_title,
          deadlineDate: q.deadline_date,
        }))
      ]

      upcomingDeadlines = mergedDeadlines
        .sort((a, b) => new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime())
        .slice(0, 5)
    } catch (e) {
      console.error("Error gathering upcoming deadlines:", e)
    }

    // 8. Get dynamic recent activities
    let recentActivities: any[] = []
    try {
      const enrollEvents = await sql`
        SELECT 
          e.enrolled_at as event_time, 
          c.title as course_title
        FROM enrollments e 
        JOIN courses c ON e.course_id = c.id 
        WHERE e.user_id = ${userId} AND e.status = 'approved'
        ORDER BY e.enrolled_at DESC 
        LIMIT 5
      `

      const submissionEvents = await sql`
        SELECT 
          s.submitted_at as event_time, 
          a.title as assignment_title
        FROM assignment_submissions s 
        JOIN assignments a ON s.assignment_id = a.id 
        WHERE s.user_id = ${userId}
        ORDER BY s.submitted_at DESC 
        LIMIT 5
      `

      const quizEvents = await sql`
        SELECT 
          qr.completed_at as event_time, 
          q.title as quiz_title, 
          qr.score
        FROM quiz_responses qr 
        JOIN quizzes q ON qr.quiz_id = q.id 
        WHERE qr.user_id = ${userId}
        ORDER BY qr.completed_at DESC 
        LIMIT 5
      `

      const certEvents = await sql`
        SELECT 
          cert.issued_at as event_time, 
          c.title as course_title
        FROM certificates cert 
        JOIN courses c ON cert.course_id = c.id 
        WHERE cert.user_id = ${userId}
        ORDER BY cert.issued_at DESC 
        LIMIT 5
      `

      const mergedActivities = [
        ...enrollEvents.map((e: any) => ({
          type: "enrollment",
          message: `You enrolled in "${e.course_title}"`,
          timestamp: e.event_time,
        })),
        ...submissionEvents.map((s: any) => ({
          type: "submission",
          message: `You submitted assignment "${s.assignment_title}"`,
          timestamp: s.event_time,
        })),
        ...quizEvents.map((q: any) => ({
          type: "quiz",
          message: `You completed quiz "${q.quiz_title}" scoring ${q.score}%`,
          timestamp: q.event_time,
        })),
        ...certEvents.map((c: any) => ({
          type: "certificate",
          message: `Congratulations! You earned a certificate in "${c.course_title}"`,
          timestamp: c.event_time,
        }))
      ]

      recentActivities = mergedActivities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 6)
    } catch (e) {
      console.error("Error gathering recent activity feed:", e)
    }

    // 9. Learning Analytics Calculations
    let averageQuizScore = 0
    let overallCourseCompletion = 0
    let assignmentSubmissionRate = 0
    let weeklyStudyProgress = 0

    try {
      const avgQuizResult = await sql`
        SELECT AVG(score) as avg_score FROM quiz_responses WHERE user_id = ${userId}
      `
      averageQuizScore = Math.round(parseFloat(avgQuizResult[0]?.avg_score || "0"))

      const avgProgressResult = await sql`
        SELECT AVG(progress) as avg_progress FROM enrollments WHERE user_id = ${userId} AND status = 'approved'
      `
      overallCourseCompletion = Math.round(parseFloat(avgProgressResult[0]?.avg_progress || "0"))

      const totalAssignmentsInCourses = await sql`
        SELECT COUNT(DISTINCT a.id) as count
        FROM enrollments e
        JOIN assignments a ON a.course_id = e.course_id
        WHERE e.user_id = ${userId} AND e.status = 'approved'
      `
      const totalCount = parseInt(totalAssignmentsInCourses[0]?.count || "0", 10)
      assignmentSubmissionRate = totalCount > 0 ? Math.min(100, Math.round((completedAssignments / totalCount) * 100)) : 0

      const weeklyModulesResult = await sql`
        SELECT COUNT(*) as count 
        FROM module_progress 
        WHERE user_id = ${userId} 
          AND completed = true 
          AND completed_at >= NOW() - INTERVAL '7 days'
      `
      const weeklyCompletedCount = parseInt(weeklyModulesResult[0]?.count || "0", 10)
      weeklyStudyProgress = enrolledCourses > 0 ? Math.min(100, Math.round((weeklyCompletedCount / (enrolledCourses * 2)) * 100)) : 0
      if (weeklyStudyProgress === 0 && weeklyCompletedCount > 0) {
        weeklyStudyProgress = 50 // baseline engagement
      }
    } catch (e) {
      console.error("Error calculating analytics:", e)
    }

    // 10. Streaks / XP Gamification
    let streak = 0
    try {
      const activeDaysResult = await sql`
        SELECT COUNT(DISTINCT DATE(event_time)) as count
        FROM (
          SELECT completed_at as event_time FROM module_progress WHERE user_id = ${userId} AND completed = true AND completed_at >= NOW() - INTERVAL '7 days'
          UNION
          SELECT submitted_at as event_time FROM assignment_submissions WHERE user_id = ${userId} AND submitted_at >= NOW() - INTERVAL '7 days'
          UNION
          SELECT completed_at as event_time FROM quiz_responses WHERE user_id = ${userId} AND completed_at >= NOW() - INTERVAL '7 days'
        ) active_dates
      `
      const activeDays = parseInt(activeDaysResult[0]?.count || "0", 10)
      streak = activeDays > 0 ? activeDays : (enrolledCourses > 0 ? 1 : 0)
    } catch {
      streak = enrolledCourses > 0 ? 1 : 0
    }

    const xp = (enrolledCourses * 100) + (completedCourses * 250) + (completedQuizzes * 150) + (completedAssignments * 200) + (certificates * 500)

    const allBadges = [
      { name: "Scholar", icon: "Rocket", description: "Enrolled in your first course", earned: enrolledCourses > 0 },
      { name: "Quiz Wizard", icon: "Sparkles", description: "Completed 3+ quizzes", earned: completedQuizzes >= 3 },
      { name: "Taskmaster", icon: "CheckSquare", description: "Submitted 2+ assignments", earned: completedAssignments >= 2 },
      { name: "Graduate", icon: "Award", description: "Earned a course certificate", earned: certificates > 0 },
      { name: "Elite Achiever", icon: "Trophy", description: "Acquired 1000+ learning XP", earned: xp >= 1000 },
    ]
    const badges = allBadges.filter(b => b.earned)

    // 11. Count of tasks due this week (greeting banner logic)
    let tasksDueThisWeek = 0
    try {
      const dueCountResult = await sql`
        SELECT COUNT(*) as count
        FROM (
          SELECT a.id FROM assignments a
          JOIN enrollments e ON a.course_id = e.course_id
          LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.user_id = ${userId}
          WHERE e.user_id = ${userId} 
            AND e.status = 'approved' 
            AND s.id IS NULL 
            AND a.due_date >= NOW() 
            AND a.due_date <= NOW() + INTERVAL '7 days'
          UNION ALL
          SELECT q.id FROM quizzes q
          JOIN enrollments e ON q.course_id = e.course_id
          LEFT JOIN quiz_responses qr ON qr.quiz_id = q.id AND qr.user_id = ${userId}
          WHERE e.user_id = ${userId} 
            AND e.status = 'approved' 
            AND qr.id IS NULL 
            AND q.due_date >= NOW() 
            AND q.due_date <= NOW() + INTERVAL '7 days'
        ) merged_due
      `
      tasksDueThisWeek = parseInt(dueCountResult[0]?.count || "0", 10)
    } catch { /* ignored */ }

    // 12. Retrieve recent courses with the exact next lesson/module
    const recentCoursesList = await sql`
      SELECT 
        c.id, 
        c.title, 
        e.progress,
        c.thumbnail,
        e.updated_at
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON c.teacher_id = u.id
      WHERE e.user_id = ${userId}
        AND e.status = 'approved'
        AND u.email IS NOT NULL
      ORDER BY e.updated_at DESC
      LIMIT 6
    `

    const recentCourses = await Promise.all(
      recentCoursesList.map(async (course: any) => {
        let nextLesson = "All caught up!"
        try {
          const nextModule = await sql`
            SELECT m.title 
            FROM modules m
            LEFT JOIN module_progress mp ON mp.module_id = m.id AND mp.user_id = ${userId} AND mp.completed = true
            WHERE m.course_id = ${course.id} AND mp.id IS NULL
            ORDER BY m.order_number ASC
            LIMIT 1
          `
          if (nextModule.length > 0) {
            nextLesson = nextModule[0].title
          }
        } catch { /* ignored */ }

        return {
          id: course.id,
          title: course.title,
          progress: course.progress,
          thumbnail: course.thumbnail,
          lastAccessed: course.updated_at ? new Date(course.updated_at).toISOString() : new Date().toISOString(),
          nextLesson
        }
      })
    )

    // 13. Dynamic Quick Actions counts
    let availableQuizzesCount = 0
    let pendingAssignmentsCount = 0

    try {
      const availQuizzes = await sql`
        SELECT COUNT(DISTINCT q.id) as count
        FROM enrollments e
        JOIN quizzes q ON q.course_id = e.course_id
        LEFT JOIN quiz_responses qr ON qr.quiz_id = q.id AND qr.user_id = ${userId}
        WHERE e.user_id = ${userId} AND e.status = 'approved' AND qr.id IS NULL
      `
      availableQuizzesCount = parseInt(availQuizzes[0]?.count || "0", 10)

      const pendingAssigns = await sql`
        SELECT COUNT(DISTINCT a.id) as count
        FROM enrollments e
        JOIN assignments a ON a.course_id = e.course_id
        LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.user_id = ${userId}
        WHERE e.user_id = ${userId} AND e.status = 'approved' AND s.id IS NULL
      `
      pendingAssignmentsCount = parseInt(pendingAssigns[0]?.count || "0", 10)
    } catch { /* ignored */ }

    return NextResponse.json({
      studentName,
      enrolledCourses,
      totalCourses,
      completedCourses,
      totalQuizzes,
      completedQuizzes,
      totalAssignments,
      completedAssignments,
      certificates,
      recentCourses,
      upcomingDeadlines,
      recentActivities,
      learningAnalytics: {
        averageQuizScore,
        overallCourseCompletion,
        assignmentSubmissionRate,
        weeklyStudyProgress
      },
      gamification: {
        streak,
        xp,
        badges
      },
      tasksDueThisWeek,
      availableQuizzesCount,
      pendingAssignmentsCount
    })
  } catch (error) {
    console.error("Student Dashboard API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
