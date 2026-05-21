import { sql } from "../lib/db"

async function run() {
  try {
    const rows = await sql`
      SELECT id, name, email, role, is_approved, class FROM users 
      WHERE email = 'student_otp_9845@example.com'
    `
    console.log("DATABASE_VERIFICATION_RESULT:", JSON.stringify(rows))
  } catch (err) {
    console.error("Verification error:", err)
  }
}

run()
