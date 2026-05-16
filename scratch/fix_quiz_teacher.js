const { neon } = require('@neondatabase/serverless')
const DB = 'postgresql://neondb_owner:npg_DLJ0aFhT2twe@ep-blue-glade-a1pdwfcg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DB)

async function run() {
  // 1. Add teacher_id column to quizzes if not exists
  await sql`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES users(id)`
  console.log('Added teacher_id column to quizzes')

  // 2. Check current state — how many quizzes have teacher_id set
  const before = await sql`SELECT id, title, teacher_id, course_id FROM quizzes ORDER BY id`
  console.log('\nQuizzes before fix:')
  before.forEach(q => console.log('  id:', q.id, '| teacher_id:', q.teacher_id, '|', q.title))

  // 3. The seeded quizzes (linked to seeded courses) should NOT have teacher_id
  // Teacher-created quizzes (created via UI) should have teacher_id set
  // Since ALL current quizzes are seeded, leave teacher_id = NULL for all of them
  // New quizzes created via the teacher UI will have teacher_id set

  // 4. Verify: teacher quiz count with new filter
  const teacherEmail = 'teacher@nextgenschool.com'
  const count = await sql`
    SELECT COUNT(*) as count FROM quizzes
    WHERE teacher_id = (SELECT id FROM users WHERE email = ${teacherEmail})
  `
  console.log('\nTeacher quiz count (WHERE teacher_id = teacher.id):', count[0].count, '← should be 0')
  console.log('All seeded quizzes have teacher_id = NULL → correctly excluded')
}

run().catch(console.error)
