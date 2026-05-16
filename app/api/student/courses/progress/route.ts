import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { moduleId, courseId, completed } = await request.json()

    if (!moduleId || !courseId) {
      return NextResponse.json({ error: "Module ID and Course ID required" }, { status: 400 })
    }

    // 1. Update module_progress
    if (completed) {
      await sql`
        INSERT INTO module_progress (module_id, user_id, completed, completed_at)
        VALUES (${moduleId}, ${session.user.id}, true, NOW())
        ON CONFLICT(module_id, user_id) DO UPDATE SET completed = true, completed_at = NOW()
      `
    } else {
      await sql`
        UPDATE module_progress 
        SET completed = false, completed_at = NULL 
        WHERE module_id = ${moduleId} AND user_id = ${session.user.id}
      `
    }

    // 2. Re-calculate overall course progress
    const [stats] = await sql`
      SELECT 
        (SELECT COUNT(*) FROM modules WHERE course_id = ${courseId}) as total_modules,
        (SELECT COUNT(*) FROM module_progress mp 
         JOIN modules m ON mp.module_id = m.id 
         WHERE m.course_id = ${courseId} AND mp.user_id = ${session.user.id} AND mp.completed = true) as completed_count
    `

    const totalModules = parseInt(stats.total_modules || "0")
    const completedCount = parseInt(stats.completed_count || "0")
    const progressPercent = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0

    // 3. Update enrollment table
    if (progressPercent === 100) {
      await sql`
        UPDATE enrollments 
        SET progress = ${progressPercent}, 
            updated_at = NOW(),
            completed_at = NOW()
        WHERE user_id = ${session.user.id} AND course_id = ${courseId}
      `
    } else {
      await sql`
        UPDATE enrollments 
        SET progress = ${progressPercent}, 
            updated_at = NOW(),
            completed_at = NULL
        WHERE user_id = ${session.user.id} AND course_id = ${courseId}
      `
    }

    return NextResponse.json({ 
      success: true, 
      progress: progressPercent,
      isNewlyCompleted: progressPercent === 100 
    })
  } catch (error) {
    console.error("Progress update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
