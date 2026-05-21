import { NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { sql } from "@/lib/db"
import nodemailer from "nodemailer"

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json()

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and verification code are required." },
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

    // 2. Check if OTP is expired
    const isExpired = new Date(pending.expires_at) < new Date()
    if (isExpired) {
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new code." },
        { status: 400 }
      )
    }

    // Parse registration data JSON
    let regData = pending.registration_data
    if (typeof regData === "string") {
      regData = JSON.parse(regData)
    }

    // 3. Enforce attempt limits (max 5 incorrect tries)
    const attempts = regData.attempts || 0
    if (attempts >= 5) {
      // Invalidate the OTP immediately by expiring it
      await sql`
        UPDATE pending_registrations
        SET expires_at = NOW() - INTERVAL '1 minute'
        WHERE id = ${pending.id}
      `
      return NextResponse.json(
        { error: "Too many incorrect attempts. This code has been invalidated. Please click 'Resend OTP' to get a new code." },
        { status: 400 }
      )
    }

    // 4. Compare input OTP with stored hash
    const isOtpValid = await compare(otp, pending.otp_hash)
    if (!isOtpValid) {
      // Increment attempt counter
      regData.attempts = attempts + 1
      await sql`
        UPDATE pending_registrations
        SET registration_data = ${JSON.stringify(regData)}
        WHERE id = ${pending.id}
      `

      const remaining = 5 - regData.attempts
      if (remaining <= 0) {
        // Invalidate OTP as we just hit the limit
        await sql`
          UPDATE pending_registrations
          SET expires_at = NOW() - INTERVAL '1 minute'
          WHERE id = ${pending.id}
        `
        return NextResponse.json(
          { error: "Too many incorrect attempts. This code has been invalidated. Please click 'Resend OTP' to get a new code." },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: `Invalid verification code. ${remaining} attempts remaining.` },
        { status: 400 }
      )
    }

    // 5. Success! Mark pending registration as verified
    await sql`
      UPDATE pending_registrations
      SET is_verified = TRUE
      WHERE id = ${pending.id}
    `

    // Extract details for permanent DB insert
    const { name, passwordHash, role, instituteId, userClass } = regData

    // 6. Check platform settings for teacher auto-approval
    let autoApproveTeachers = false
    try {
      const [settings] = await sql`SELECT auto_approve_teachers FROM platform_settings WHERE id = 1`
      if (settings) {
        autoApproveTeachers = settings.auto_approve_teachers !== false && settings.auto_approve_teachers !== 0
      }
    } catch {
      // Keep false if settings not found
    }

    const isApproved = role === "student" || (role === "teacher" && autoApproveTeachers)
    let dbInstituteId = instituteId

    // 7. If registering as an institution, create the institution profile first
    if (role === "institution") {
      const newInst = await sql`
        INSERT INTO institutions (name, email, status)
        VALUES (${name}, ${email}, 'pending')
        RETURNING id
      `
      if (newInst.length > 0) {
        dbInstituteId = newInst[0].id
      }
    }

    // 8. Create the permanent user record
    const newUsers = await sql`
      INSERT INTO users (name, email, password_hash, role, is_approved, institution_id, class)
      VALUES (${name}, ${email}, ${passwordHash}, ${role}, ${isApproved}, ${dbInstituteId}, ${userClass})
      RETURNING id, email, name, role, is_approved
    `

    if (newUsers.length === 0) {
      throw new Error("Failed to insert user record into users table.")
    }

    // 9. Send welcome email via SMTP
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

        const dashboardUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login`

        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"NextGen School" <noreply@nextgenschool.com>`,
          to: email,
          subject: "Welcome to NextGen School! 🎉",
          text: `Hi ${name},\n\nYour email has been verified successfully and your NextGen School LMS account has been created!\n\nAccess your dashboard here: ${dashboardUrl}\n\nHappy Learning!\nThe NextGen School Team`,
          html: `
            <div style="font-family: sans-serif; padding: 32px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 36px; font-weight: bold; background: linear-gradient(135deg, #06b6d4, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">NextGen School</span>
              </div>
              <h2 style="color: #10b981; margin-top: 0; text-align: center; font-size: 26px;">Email Verified Successfully! 🎉</h2>
              <p style="font-size: 16px; line-height: 1.5; color: #4b5563;">Hi <strong>${name}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.5; color: #4b5563;">Welcome aboard! We are thrilled to confirm that your email address has been verified successfully. Your NextGen School account is now officially created and ready to use.</p>
              
              ${
                isApproved
                  ? `<div style="margin: 32px 0; text-align: center;">
                      <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #06b6d4, #8b5cf6); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);">Go to Login & Dashboard</a>
                     </div>`
                  : `<div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; margin: 24px 0;">
                      <p style="margin: 0; font-size: 14px; color: #b45309; font-weight: bold;">Approval Pending</p>
                      <p style="margin: 4px 0 0 0; font-size: 14px; color: #78350f;">As a ${role}, your account requires administrative approval before you can access the dashboard. We will notify you by email as soon as your account is reviewed!</p>
                     </div>`
              }

              <p style="font-size: 15px; line-height: 1.5; color: #4b5563;">If you have any questions or need assistance, feel free to reply to this email or visit our help center.</p>
              <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 32px 0 24px 0;" />
              <p style="font-size: 14px; color: #6b7280; text-align: center;">Happy Learning!<br/><strong>The NextGen School Team</strong></p>
            </div>
          `,
        })
      } catch (emailError) {
        console.error("Nodemailer error in registration welcome email:", emailError)
        // Non-blocking error
      }
    }

    return NextResponse.json({
      message: "Your email has been verified successfully. Your account has been created.",
      user: {
        id: newUsers[0].id,
        email: newUsers[0].email,
        name: newUsers[0].name,
        role: newUsers[0].role,
      },
      requiresApproval: !isApproved,
    })
  } catch (error) {
    console.error("Registration verify-otp error:", error)
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    )
  }
}
