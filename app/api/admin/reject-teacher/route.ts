import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await request.json()

    // Soft-reject: mark as not approved so they see pending-approval page
    await sql`UPDATE users SET is_approved = false, updated_at = NOW() WHERE id = ${userId} AND role != 'admin'`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Reject teacher API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
