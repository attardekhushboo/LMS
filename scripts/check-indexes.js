const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

sql("SELECT indexname FROM pg_indexes WHERE tablename = 'quizzes' AND indexname = 'unique_quiz_per_course'").then(res => {
  console.log("Quiz Index:", res);
});

sql("SELECT indexname FROM pg_indexes WHERE tablename = 'assignments' AND indexname = 'unique_assignment_per_course'").then(res => {
  console.log("Assignment Index:", res);
});
