import { neon } from "@neondatabase/serverless";
import fs from "fs";

// Load environment variables from .env.local manually
const envFile = fs.readFileSync(".env.local", "utf8");
envFile.split("\n").forEach((line) => {
  const [key, ...value] = line.split("=");
  if (key && value) {
    process.env[key.trim()] = value.join("=").trim().replace(/^['"]|['"]$/g, "");
  }
});

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log("🚀 Starting database constraint migration...");

  try {
    // 1. Drop existing one-per-course constraints if they exist
    console.log("Dropping old constraints (unique_quiz_per_course, unique_assignment_per_course)...");
    await sql`DROP INDEX IF EXISTS unique_quiz_per_course`;
    await sql`DROP INDEX IF EXISTS unique_assignment_per_course`;

    // 2. Add new unique title per course constraints
    console.log("Creating new unique constraints for titles...");
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS unique_quiz_title_per_course ON quizzes (course_id, title)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS unique_assignment_title_per_course ON assignments (course_id, title)`;

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
