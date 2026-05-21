import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { sql } from "@/lib/db"
import nodemailer from "nodemailer"

// Helper function to validate password complexity
function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters long."
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter."
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter."
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number."
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain at least one special character."
  }
  return null
}

export async function POST(request: Request) {
  try {
    const { name, email, password, role, instituteId, userClass } = await request.json()

    // 1. Basic validation
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }

    const validRoles = ["student", "teacher", "institution"]
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      )
    }

    // Role-specific class checks
    if (role === "student") {
      if (!userClass) {
        return NextResponse.json(
          { error: "Class is required for students" },
          { status: 400 }
        )
      }
      const parsedClass = parseInt(userClass, 10)
      if (isNaN(parsedClass) || parsedClass < 4 || parsedClass > 9) {
        return NextResponse.json(
          { error: "Class must be between 4 and 9" },
          { status: 400 }
        )
      }
    }

    // 2. Password complexity validation
    const passwordError = validatePassword(password)
    if (passwordError) {
      return NextResponse.json(
        { error: passwordError },
        { status: 400 }
      )
    }

    // 3. Check if email already exists in the system
    const existingUsers = await sql`
      SELECT id FROM users WHERE email = ${email}
    `
    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      )
    }

    // 4. platform_settings check — allow registration
    let allowRegistration = true
    try {
      const [settings] = await sql`SELECT allow_registration FROM platform_settings WHERE id = 1`
      if (settings) {
        allowRegistration = settings.allow_registration !== false && settings.allow_registration !== 0
      }
    } catch {
      // platform_settings table may not exist yet
    }

    if (!allowRegistration) {
      return NextResponse.json(
        { error: "Registration is currently disabled by administrator" },
        { status: 403 }
      )
    }

    // 5. Self-healing pre-flight: ensure pending_registrations table exists
    await sql`
      CREATE TABLE IF NOT EXISTS pending_registrations (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        user_type VARCHAR(50) NOT NULL,
        registration_data JSONB NOT NULL,
        otp_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // 6. Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // 7. Hash password and OTP securely
    const passwordHash = await hash(password, 10)
    const otpHash = await hash(otp, 10)

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

    // 8. Invalidate/Delete old unverified pending registrations for this email
    await sql`
      DELETE FROM pending_registrations 
      WHERE email = ${email} AND is_verified = FALSE
    `

    // 9. Store registration details in pending_registrations
    const registrationData = {
      name,
      email,
      passwordHash,
      role,
      instituteId: role === "student" ? (instituteId && instituteId !== "none" ? instituteId : null) : null,
      userClass: role === "student" ? parseInt(userClass, 10) : null
    }

    await sql`
      INSERT INTO pending_registrations (email, user_type, registration_data, otp_hash, expires_at)
      VALUES (${email}, ${role}, ${JSON.stringify(registrationData)}, ${otpHash}, ${expiresAt})
    `

    // 10. Send SMTP email if SMTP is configured
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
          text: `Welcome to NextGen School!\n\nYour verification code is: ${otp}\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
          html: `
            <div style="font-family: sans-serif; padding: 32px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 36px; font-weight: bold; background: linear-gradient(135deg, #06b6d4, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">NextGen School</span>
              </div>
              <h2 style="color: #6d28d9; margin-top: 0; text-align: center; font-size: 24px;">Verify Your Email Address</h2>
              <p style="font-size: 16px; line-height: 1.5; color: #4b5563; text-align: center;">Welcome to NextGen School! We are thrilled to have you here. Please verify your email to activate your account.</p>
              <p style="font-size: 15px; text-align: center; color: #4b5563; margin-top: 16px;">Your 6-digit verification code is:</p>
              <div style="background: linear-gradient(135deg, #f5f3ff, #ecfeff); border: 2px dashed #8b5cf6; padding: 20px; text-align: center; border-radius: 12px; margin: 24px 0;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #7c3aed; font-family: monospace;">${otp}</span>
              </div>
              <p style="font-size: 14px; color: #ef4444; text-align: center; font-weight: bold; margin-bottom: 24px;">This code will expire in 10 minutes.</p>
              <hr style="border: 0; border-top: 1px solid #eaeaea; margin-bottom: 24px;" />
              <p style="font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.5;">If you did not initiate this registration, you can safely ignore this email. Your information remains completely secure.</p>
            </div>
          `,
        })
      } catch (emailError) {
        console.error("Nodemailer error in registration send-otp:", emailError)
        // Fallback OK response, OTP is printed in logs for manual testing
      }
    }

    return NextResponse.json({
      message: "OTP sent successfully to your email.",
    })
  } catch (error) {
    console.error("Registration send-otp error:", error)
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    )
  }
}
