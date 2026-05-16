import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { courseId } = await request.json()

    await sql`
      UPDATE courses SET status = 'rejected', updated_at = NOW() WHERE id = ${courseId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Reject course API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
