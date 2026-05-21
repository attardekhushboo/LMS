const { sql } = require('./db')

async function run() {
  // Check current state
  const courses = await sql`
    SELECT id, title, created_by_admin, teacher_id FROM courses ORDER BY id
  `
  console.log('Current courses:')
  courses.forEach(c =>
    console.log('  id:', c.id, '| created_by_admin:', c.created_by_admin, '|', c.title)
  )

  // Mark ALL seeded courses (those with NULL created_by_admin) as created_by_admin = true
  // These are the 18 masterclass courses seeded before the teacher used the platform
  const updated = await sql`
    UPDATE courses
    SET created_by_admin = true
    WHERE created_by_admin IS NULL
    RETURNING id, title
  `
  console.log('\nMarked as created_by_admin = true:')
  updated.forEach(c => console.log('  id:', c.id, '|', c.title))

  // Verify
  const after = await sql`
    SELECT id, title, created_by_admin FROM courses ORDER BY id
  `
  console.log('\nAfter fix:')
  after.forEach(c =>
    console.log('  id:', c.id, '| created_by_admin:', c.created_by_admin, '|', c.title)
  )

  // Simulate teacher quiz count with strict filter
  const teacherEmail = 'teacher@nextgenschool.com'
  const quizCount = await sql`
    SELECT COUNT(*) as count
    FROM quizzes q
    JOIN courses c ON q.course_id = c.id
    JOIN users u ON c.teacher_id = u.id
    WHERE u.email = ${teacherEmail}
      AND c.created_by_admin = false
  `
  console.log('\nTeacher quiz count (strict filter):', quizCount[0].count, '← should be 0')
}

run().catch(console.error)
