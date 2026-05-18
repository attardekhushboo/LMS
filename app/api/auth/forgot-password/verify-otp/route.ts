import { NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { email, accountType, otp } = await request.json()

    if (!email || !accountType || !otp) {
      return NextResponse.json(
        { error: "Email, account type, and OTP are required." },
        { status: 400 }
      )
    }

    // Fetch the latest active token for this email and account type
    const tokens = await sql`
      SELECT otp_hash, expires_at 
      FROM password_reset_tokens 
      WHERE email = ${email} AND user_type = ${accountType} AND is_used = FALSE
      ORDER BY created_at DESC 
      LIMIT 1
    `

    if (tokens.length === 0) {
      return NextResponse.json(
        { error: "No active OTP found. Please request a new OTP." },
        { status: 400 }
      )
    }

    const token = tokens[0] as any

    // Check expiration
    const now = new Date()
    const expiresAt = new Date(token.expires_at)
    if (now > expiresAt) {
      return NextResponse.json(
        { error: "OTP has expired. Please request a new OTP." },
        { status: 400 }
      )
    }

    // Compare OTP input with stored bcrypt hash
    const isMatch = await compare(otp, token.otp_hash)

    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid OTP. Please check the code and try again." },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully.",
    })
  } catch (error) {
    console.error("Verify OTP Error:", error)
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    )
  }
}
