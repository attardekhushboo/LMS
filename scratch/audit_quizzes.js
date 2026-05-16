const { neon } = require('@neondatabase/serverless')
const DB = 'postgresql://neondb_owner:npg_DLJ0aFhT2twe@ep-blue-glade-a1pdwfcg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DB)

async function run() {
  // 1. Quiz table schema
  const schema = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'quizzes'
    ORDER BY ordinal_position
  `
  console.log('=== QUIZZES TABLE SCHEMA ===')
  schema.forEach(c => console.log(c.column_name.padEnd(20), c.data_type.padEnd(20), 'nullable:', c.is_nullable))

  // 2. All quizzes with course + teacher info
  const quizzes = await sql`
    SELECT q.id, q.title, q.course_id,
           c.title AS course_title, c.teacher_id,
           u.email AS teacher_email, u.name AS teacher_name
    FROM quizzes q
    LEFT JOIN courses c ON q.course_id = c.id
    LEFT JOIN users u ON c.teacher_id = u.id
    ORDER BY q.id
  `
  console.log('\n=== ALL QUIZZES (' + quizzes.length + ' total) ===')
  quizzes.forEach(q =>
    console.log(
      'id:' + String(q.id).padEnd(4),
      ('course_id:' + (q.course_id ?? 'NULL')).padEnd(14),
      (q.teacher_email ?? '*** NULL ***').padEnd(35),
      q.title?.substring(0, 35)
    )
  )

  // 3. Summary
  const noTeacher = quizzes.filter(q => !q.teacher_email)
  const hasTeacher = quizzes.filter(q => q.teacher_email)
  console.log('\n=== SUMMARY ===')
  console.log('Total quizzes         :', quizzes.length)
  console.log('With teacher_email    :', hasTeacher.length)
  console.log('WITHOUT teacher_email :', noTeacher.length)

  // 4. Quizzes per teacher
  const perTeacher = await sql`
    SELECT u.email, u.name, COUNT(q.id) AS quiz_count
    FROM users u
    LEFT JOIN courses c ON c.teacher_id = u.id
    LEFT JOIN quizzes q ON q.course_id = c.id
    WHERE u.role = 'teacher'
    GROUP BY u.id, u.email, u.name
  `
  console.log('\n=== QUIZZES PER TEACHER ===')
  perTeacher.forEach(t =>
    console.log('email:', t.email, '| quizzes:', t.quiz_count)
  )

  // 5. Simulate teacher dashboard count (current broken query)
  const teacherEmail = 'teacher@nextgenschool.com'
  const brokenCount = await sql`
    SELECT COUNT(*) as count FROM quizzes q
    JOIN courses c ON q.course_id = c.id
    WHERE c.teacher_id = (SELECT id FROM users WHERE email = ${teacherEmail})
  `
  console.log('\n=== TEACHER DASHBOARD QUIZ COUNT (current query) ===')
  console.log('WHERE teacher_id = teacher_id →', brokenCount[0].count, '(this is what shows as 18)')

  // 6. Check if quizzes were seeded (not created by teacher)
  const seededCheck = await sql`
    SELECT q.id, q.title, c.title as course_title, c.created_by_admin
    FROM quizzes q
    JOIN courses c ON q.course_id = c.id
    ORDER BY q.id LIMIT 5
  `
  console.log('\n=== SAMPLE QUIZZES (checking if seeded) ===')
  seededCheck.forEach(q =>
    console.log('quiz_id:', q.id, '| course:', q.course_title, '| created_by_admin:', q.created_by_admin)
  )
}

run().catch(console.error)
