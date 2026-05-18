const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    console.log("Creating unique_quiz_per_course index...");
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS unique_quiz_per_course ON quizzes (course_id)`;
    console.log("Successfully created index.");
    
    const res = await sql("SELECT indexname FROM pg_indexes WHERE tablename = 'quizzes' AND indexname = 'unique_quiz_per_course'");
    console.log("Quiz Index:", res);
  } catch (error) {
    console.error("Failed:", error);
  }
}

run();
