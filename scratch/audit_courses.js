const { sql } = require('./db')

async function run() {
  // 1. Schema
  const schema = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'courses'
    ORDER BY ordinal_position
  `
  console.log('\n=== COURSES TABLE SCHEMA ===')
  schema.forEach(c =>
    console.log(c.column_name.padEnd(22), c.data_type.padEnd(22), 'nullable:', c.is_nullable)
  )

  // 2. All courses with teacher info
  const courses = await sql`
    SELECT c.id, c.title, c.status, c.teacher_id, c.class, c.created_by_admin,
           u.name AS teacher_name, u.email AS teacher_email
    FROM courses c
    LEFT JOIN users u ON c.teacher_id = u.id
    ORDER BY c.id
  `
  console.log('\n=== ALL COURSES (' + courses.length + ' total) ===')
  courses.forEach(c => {
    const t = c.teacher_id
      ? (c.teacher_email + ' (id:' + c.teacher_id + ')')
      : '*** NULL — NO TEACHER ***'
    console.log(
      'id:' + String(c.id).padEnd(5),
      ('class:' + (c.class ?? 'NULL')).padEnd(10),
      c.status.padEnd(12),
      c.title.substring(0, 38).padEnd(39),
      t
    )
  })

  // 3. Summary
  const noTeacher = courses.filter(c => !c.teacher_id)
  const hasTeacher = courses.filter(c => c.teacher_id)
  console.log('\n=== SUMMARY ===')
  console.log('Total courses       :', courses.length)
  console.log('With teacher_id     :', hasTeacher.length)
  console.log('NULL teacher_id     :', noTeacher.length)

  if (noTeacher.length > 0) {
    console.log('\nCourses with NULL teacher_id:')
    noTeacher.forEach(c =>
      console.log('  id:', c.id, '| title:', c.title, '| status:', c.status, '| admin_created:', c.created_by_admin)
    )
  }

  // 4. Teachers
  const teachers = await sql`SELECT id, name, email FROM users WHERE role = 'teacher'`
  console.log('\n=== TEACHERS IN DB ===')
  teachers.forEach(t => console.log('id:', t.id, '| email:', t.email, '| name:', t.name))

  // 5. Courses per teacher
  const perTeacher = await sql`
    SELECT u.id, u.email, u.name, COUNT(c.id) AS course_count
    FROM users u
    LEFT JOIN courses c ON c.teacher_id = u.id
    WHERE u.role = 'teacher'
    GROUP BY u.id, u.email, u.name
    ORDER BY u.id
  `
  console.log('\n=== COURSES PER TEACHER ===')
  perTeacher.forEach(t =>
    console.log('teacher_id:', t.id, '| email:', t.email, '| courses:', t.course_count)
  )
}

run().catch(console.error)
