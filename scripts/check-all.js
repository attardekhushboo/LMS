const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

sql('SELECT id, course_id, title FROM quizzes ORDER BY course_id').then(res => {
  console.log(res);
});
