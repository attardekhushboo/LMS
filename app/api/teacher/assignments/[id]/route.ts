import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const teacherId = parseInt(session.user.id, 10)

    // Verify course ownership
    const [assignment] = await sql`
      SELECT a.id FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE a.id = ${id} AND c.teacher_id = ${teacherId}
    `
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found or permission denied" }, { status: 404 })
    }

    await sql`DELETE FROM assignments WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete assignment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const teacherId = parseInt(session.user.id, 10)

    // Verify course ownership
    const [assignment] = await sql`
      SELECT a.id FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE a.id = ${id} AND c.teacher_id = ${teacherId}
    `
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found or permission denied" }, { status: 404 })
    }

    const { title, description, dueDate, maxScore, status } = await request.json()

    if (!title?.trim() || !dueDate) {
      return NextResponse.json({ error: "Title and due date are required." }, { status: 400 })
    }

    await sql`
      UPDATE assignments
      SET title = ${title.trim()},
          description = ${description?.trim() || null},
          due_date = ${dueDate},
          max_score = ${maxScore || 100},
          status = ${status || 'published'}
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update assignment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
