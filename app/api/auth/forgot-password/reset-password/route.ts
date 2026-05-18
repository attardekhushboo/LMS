import { NextResponse } from "next/server"
import { hash, compare } from "bcryptjs"
import { sql } from "@/lib/db"

// Password verification rules
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

export async function POST(request: Request) {
  try {
    const { email, accountType, otp, newPassword } = await request.json()

    if (!email || !accountType || !otp || !newPassword) {
      return NextResponse.json(
        { error: "Email, account type, OTP, and new password are required." },
        { status: 400 }
      )
    }

    // 1. Password strength validation
    if (!PASSWORD_REGEX.test(newPassword)) {
      return NextResponse.json(
        { 
          error: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character." 
        },
        { status: 400 }
      )
    }

    // 2. Strict OTP verification step
    const tokens = await sql`
      SELECT id, otp_hash, expires_at 
      FROM password_reset_tokens 
      WHERE email = ${email} AND user_type = ${accountType} AND is_used = FALSE
      ORDER BY created_at DESC 
      LIMIT 1
    `

    if (tokens.length === 0) {
      return NextResponse.json(
        { error: "No active OTP session found. Please request a new OTP." },
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

    // Match OTP input with stored bcrypt hash
    const isMatch = await compare(otp, token.otp_hash)
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid OTP. Please check the code and try again." },
        { status: 400 }
      )
    }

    // 3. Hash the new password securely
    const newPasswordHash = await hash(newPassword, 10)

    // 4. Update the user password in the users table
    const result = await sql`
      UPDATE users 
      SET password_hash = ${newPasswordHash}, updated_at = NOW()
      WHERE email = ${email}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Failed to locate user account during password reset." },
        { status: 404 }
      )
    }

    // 5. Mark the OTP token as used
    await sql`
      UPDATE password_reset_tokens 
      SET is_used = TRUE 
      WHERE id = ${token.id}
    `

    return NextResponse.json({
      success: true,
      message: "Your password has been reset successfully.",
    })
  } catch (error) {
    console.error("Reset Password Error:", error)
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    )
  }
}
