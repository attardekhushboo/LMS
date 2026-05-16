const { neon } = require('@neondatabase/serverless')
const DB = 'postgresql://neondb_owner:npg_DLJ0aFhT2twe@ep-blue-glade-a1pdwfcg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DB)

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
