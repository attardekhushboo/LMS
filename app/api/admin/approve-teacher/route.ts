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

    await sql`
      UPDATE users SET is_approved = true, updated_at = NOW() WHERE id = ${userId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Approve teacher API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
