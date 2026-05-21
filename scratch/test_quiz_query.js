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
    console.log("Using Database URL:", dbUrl);
    
    const quizId = "29";
    
    // 1. Fetch Quiz Details
    console.log("\n1. Fetching quiz...");
    const quiz = await sql_neon(`SELECT id, title, time_limit, passing_score FROM quizzes WHERE id = $1`, [quizId]);
    console.log("Quiz result:", quiz);
    
    if (quiz.length === 0) {
      console.log("Quiz not found.");
      return;
    }
    
    // 2. Fetch Questions (No legacy options)
    console.log("\n2. Fetching questions...");
    const questions = await sql_neon(
      `SELECT q.id, q.question, q.question_type, q.points, q.order_number
       FROM quiz_questions q
       WHERE q.quiz_id = $1
       ORDER BY q.order_number ASC
       LIMIT 10`,
      [quizId]
    );
    console.log("Questions found:", questions.length);
    
    if (questions.length === 0) {
      console.log("No questions found.");
      return;
    }
    
    const questionIds = questions.map(q => q.id);
    console.log("Question IDs:", questionIds);
    
    // 3. Fetch options raw
    console.log("\n3. Fetching options raw...");
    const placeholderList = questionIds.map((_, i) => `$${i + 1}`).join(",");
    console.log("Placeholder list:", placeholderList);
    
    const optionsRaw = await sql_neon(
      `SELECT id, question_id, option_text, order_number
       FROM quiz_options
       WHERE question_id IN (${placeholderList})
       ORDER BY order_number ASC`,
      questionIds
    );
    console.log("Options found:", optionsRaw.length);
    
  } catch (error) {
    console.error("Database query failed with error:", error);
  }
}

run();
