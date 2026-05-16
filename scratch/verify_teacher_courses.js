const { neon } = require('@neondatabase/serverless')
const DB = 'postgresql://neondb_owner:npg_DLJ0aFhT2twe@ep-blue-glade-a1pdwfcg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DB)

async function run() {
  const teacherEmail = 'teacher@nextgenschool.com'
  const teacherId = 2

  const courses = await sql`
    SELECT 
      c.id, c.title, c.status, c.class,
      u.email AS teacher_email
    FROM courses c
    JOIN users u ON c.teacher_id = u.id
    WHERE u.email = ${teacherEmail}
      AND c.teacher_id = ${teacherId}
    ORDER BY c.class ASC, c.created_at DESC
  `

  console.log('Courses for', teacherEmail, '(' + courses.length + ' total):')
  courses.forEach(c =>
    console.log('  id:', c.id, '| class:', c.class, '| status:', c.status, '|', c.title, '| teacher_email:', c.teacher_email)
  )

  // Confirm no other teacher's courses leak through
  const otherTeachers = [...new Set(courses.map(c => c.teacher_email))]
  console.log('\nDistinct teacher emails in result:', otherTeachers)
  if (otherTeachers.length === 1 && otherTeachers[0] === teacherEmail) {
    console.log('✅ Only', teacherEmail, "'s courses returned — filter is correct.")
  } else {
    console.log('❌ Other teacher emails found — filter is broken.')
  }
}

run().catch(console.error)
