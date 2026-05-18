import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const results = { quizzes: 0, assignments: 0 }
    
    // Delete duplicate quizzes
    const duplicateQuizzes = await sql`
      SELECT course_id, COUNT(*) 
      FROM quizzes 
      GROUP BY course_id 
      HAVING COUNT(*) > 1
    `
    if (duplicateQuizzes.length > 0) {
      const deletedQuizzes = await sql`
        DELETE FROM quizzes
        WHERE id NOT IN (
          SELECT MAX(id)
          FROM quizzes
          GROUP BY course_id
        )
        RETURNING id
      `
      results.quizzes = deletedQuizzes.length
    }

    // Delete duplicate assignments
    const duplicateAssignments = await sql`
      SELECT course_id, COUNT(*) 
      FROM assignments 
      GROUP BY course_id 
      HAVING COUNT(*) > 1
    `
    if (duplicateAssignments.length > 0) {
      const deletedAssignments = await sql`
        DELETE FROM assignments
        WHERE id NOT IN (
          SELECT MAX(id)
          FROM assignments
          GROUP BY course_id
        )
        RETURNING id
      `
      results.assignments = deletedAssignments.length
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error("Cleanup error:", error)
    return NextResponse.json({ error: "Failed to cleanup" }, { status: 500 })
  }
}
