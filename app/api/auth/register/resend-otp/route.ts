import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { sql } from "@/lib/db"
import nodemailer from "nodemailer"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      )
    }

    // 1. Retrieve the latest pending registration for this email
    const pendingRows = await sql`
      SELECT * FROM pending_registrations
      WHERE email = ${email} AND is_verified = FALSE
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (pendingRows.length === 0) {
      return NextResponse.json(
        { error: "No pending registration found for this email address." },
        { status: 404 }
      )
    }

    const pending = pendingRows[0]

    // 2. Enforce rate limit (max 3 resend / code requests in the last hour)
    const rateLimitRows = await sql`
      SELECT COUNT(*) as count FROM pending_registrations
      WHERE email = ${email} AND created_at > NOW() - INTERVAL '1 hour'
    `
    const count = parseInt(rateLimitRows[0]?.count || "0", 10)
    if (count >= 3) {
      return NextResponse.json(
        { error: "You have reached the limit of 3 verification code requests per hour. Please try again later." },
        { status: 429 }
      )
    }

    // 3. Generate a new 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    const otpHash = await hash(otp, 10)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // Fresh 10 minutes

    // Parse registration data JSON
    let regData = pending.registration_data
    if (typeof regData === "string") {
      regData = JSON.parse(regData)
    }
    
    // Reset attempt counter for the new OTP
    regData.attempts = 0

    // 4. Delete old pending entry and insert a fresh one to update timestamps for rate-limiting
    await sql`
      DELETE FROM pending_registrations 
      WHERE email = ${email} AND is_verified = FALSE
    `

    await sql`
      INSERT INTO pending_registrations (email, user_type, registration_data, otp_hash, expires_at)
      VALUES (${email}, ${pending.user_type}, ${JSON.stringify(regData)}, ${otpHash}, ${expiresAt})
    `

    // 5. Deliver email via SMTP
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
          from: process.env.SMTP_FROM || `"NextGen School" <noreply@nextgenschool.com>`,
          to: email,
          subject: "Verify Your Email Address - NextGen School",
          text: `Welcome to NextGen School!\n\nYour new verification code is: ${otp}\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
          html: `
            <div style="font-family: sans-serif; padding: 32px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 36px; font-weight: bold; background: linear-gradient(135deg, #06b6d4, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">NextGen School</span>
              </div>
              <h2 style="color: #6d28d9; margin-top: 0; text-align: center; font-size: 24px;">Your New Verification Code</h2>
              <p style="font-size: 16px; line-height: 1.5; color: #4b5563; text-align: center;">We received a request to resend your verification code. Use the new 6-digit code below to finalize your registration:</p>
              <div style="background: linear-gradient(135deg, #f5f3ff, #ecfeff); border: 2px dashed #8b5cf6; padding: 20px; text-align: center; border-radius: 12px; margin: 24px 0;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #7c3aed; font-family: monospace;">${otp}</span>
              </div>
              <p style="font-size: 14px; color: #ef4444; text-align: center; font-weight: bold; margin-bottom: 24px;">This code will expire in 10 minutes.</p>
              <hr style="border: 0; border-top: 1px solid #eaeaea; margin-bottom: 24px;" />
              <p style="font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.5;">If you did not initiate this registration, you can safely ignore this email.</p>
            </div>
          `,
        })
      } catch (emailError) {
        console.error("Nodemailer error in registration resend-otp:", emailError)
        // Non-blocking fallback
      }
    }

    return NextResponse.json({
      message: "A new verification code has been sent to your email.",
    })
  } catch (error) {
    console.error("Registration resend-otp error:", error)
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    )
  }
}
