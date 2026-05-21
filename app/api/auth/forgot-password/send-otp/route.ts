import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { sql } from "@/lib/db"
import nodemailer from "nodemailer"

export async function POST(request: Request) {
  try {
    const { email, accountType } = await request.json()

    if (!email || !accountType) {
      return NextResponse.json(
        { error: "Email and account type are required." },
        { status: 400 }
      )
    }

    if (accountType !== "user" && accountType !== "institution") {
      return NextResponse.json(
        { error: "Invalid account type." },
        { status: 400 }
      )
    }

    // 1. Check if user exists based on role and email
    let userExists = false
    if (accountType === "user") {
      const users = await sql`
        SELECT id FROM users 
        WHERE email = ${email} AND role IN ('student', 'teacher')
      `
      userExists = users.length > 0
    } else {
      const institutions = await sql`
        SELECT id FROM users 
        WHERE email = ${email} AND role = 'institution'
      `
      userExists = institutions.length > 0
    }

    if (!userExists) {
      return NextResponse.json(
        { error: "No account found with this email address." },
        { status: 404 }
      )
    }

    // 2. Self-healing pre-flight query to create password_reset_tokens table if not exists
    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        user_type VARCHAR(50) NOT NULL,
        otp_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // 3. Generate a secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // 4. Hash the OTP securely using bcrypt
    const otpHash = await hash(otp, 10)

    // 5. Calculate expiration (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // 6. Invalidate previous OTPs for this email & account type
    await sql`
      UPDATE password_reset_tokens 
      SET is_used = TRUE 
      WHERE email = ${email} AND user_type = ${accountType}
    `

    // 7. Store the secure OTP record in the database
    await sql`
      INSERT INTO password_reset_tokens (email, user_type, otp_hash, expires_at, is_used)
      VALUES (${email}, ${accountType}, ${otpHash}, ${expiresAt}, FALSE)
    `

    // 8. Deliver via SMTP if host details are specified in env
    if (process.env.SMTP_HOST) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        })

        await transporter.sendMail({
          from: process.env.SMTP_FROM || "NextGen School <noreply@nextgenschool.com>",
          to: email,
          subject: "NextGen School Password Reset OTP",
          text: `Your OTP for password reset is: ${otp}\nThis OTP will expire in 10 minutes.`,
          html: `
            <div style="font-family: sans-serif; padding: 24px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 12px;">
              <h2 style="color: #6d28d9; margin-bottom: 20px;">Password Reset Request</h2>
              <p>We received a request to reset the password for your NextGen School LMS account.</p>
              <p>Please use the following One-Time Password (OTP) to proceed with the reset. This OTP is valid for <strong>10 minutes</strong>:</p>
              <div style="background-color: #f5f3ff; border: 2px dashed #8b5cf6; padding: 16px; text-align: center; border-radius: 8px; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #7c3aed;">${otp}</span>
              </div>
              <p style="font-size: 13px; color: #666; margin-top: 24px;">If you did not request a password reset, you can safely ignore this email.</p>
            </div>
          `,
        })
      } catch (emailError) {
        console.error("Nodemailer error:", emailError)
        // Keep the OTP hashed in the database and avoid leaking it through logs.
      }
    }

    return NextResponse.json({
      message: "OTP has been sent to your registered email.",
    })
  } catch (error) {
    console.error("Send OTP Error:", error)
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    )
  }
}
