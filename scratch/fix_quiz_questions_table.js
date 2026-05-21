const { neon } = require("@neondatabase/serverless");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "../.env.local");
let dbUrl = "";

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  const match = content.match(/DATABASE_URL=['"]?([^'\n\r"]+)['"]?/);
  if (match) {
    dbUrl = match[1];
  }
}

const sql_neon = neon(dbUrl);

async function run() {
  try {
    console.log("Altering quiz_questions table to add missing columns...");
    
    // Add question_type column
    await sql_neon("ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(50) DEFAULT 'multiple_choice'");
    console.log("Added column 'question_type' successfully!");

    // Add points column
    await sql_neon("ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 10");
    console.log("Added column 'points' successfully!");

    // Verify columns again
    const sample = await sql_neon("SELECT * FROM quiz_questions LIMIT 1");
    console.log("Updated question columns:", Object.keys(sample[0] || {}));
    
  } catch (error) {
    console.error("Migration failed with error:", error);
  }
}

run();
