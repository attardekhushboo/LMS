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

async function check() {
  const enrollments = await sql`SELECT user_id, course_id, status FROM enrollments`;
  console.log("Enrollments:", enrollments);
}
check();
