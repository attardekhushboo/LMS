import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { updateCourseProgress } from "@/lib/progress"

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

    // 2. Re-calculate overall course progress including quiz + assignment
    const result = await updateCourseProgress(session.user.id, courseId)

    return NextResponse.json({ 
      success: true, 
      ...result
    })
  } catch (error) {
    console.error("Progress update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
