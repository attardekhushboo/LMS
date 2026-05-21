const { sql } = require('./db')

async function run() {
  const teacherEmail = 'teacher@nextgenschool.com'

  const result = await sql`
    SELECT COUNT(*) as count
    FROM courses c
    JOIN users u ON c.teacher_id = u.id
    WHERE u.email = ${teacherEmail}
  `
  console.log('Course count for', teacherEmail, ':', result[0].count)
}

run().catch(console.error)
