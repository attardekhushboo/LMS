const { neon } = require('@neondatabase/serverless')
const DB = 'postgresql://neondb_owner:npg_DLJ0aFhT2twe@ep-blue-glade-a1pdwfcg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DB)

async function run() {
  // 1. Students
  const students = await sql`SELECT id, name, email, class FROM users WHERE role = 'student' ORDER BY id`
  console.log('=== STUDENTS ===')
  students.forEach(s => console.log('  id:', s.id, '| class:', s.class, '| email:', s.email, '| name:', s.name))

  // 2. Enrollments
  const enrollments = await sql`
    SELECT e.id, e.user_id, e.course_id, e.status, c.title as course_title, u.email as student_email
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    JOIN users u ON e.user_id = u.id
    ORDER BY e.id
  `
  console.log('\n=== ENROLLMENTS (' + enrollments.length + ') ===')
  enrollments.forEach(e => console.log('  enrollment_id:', e.id, '| student:', e.student_email, '| course:', e.course_title, '| status:', e.status))

  // 3. Quizzes with course linkage
  const quizzes = await sql`
    SELECT q.id, q.title, q.course_id, q.teacher_id, c.title as course_title
    FROM quizzes q
    LEFT JOIN courses c ON q.course_id = c.id
    WHERE q.teacher_id IS NOT NULL
    ORDER BY q.id DESC LIMIT 10
  `
  console.log('\n=== TEACHER-CREATED QUIZZES (last 10) ===')
  quizzes.forEach(q => console.log('  id:', q.id, '| course_id:', q.course_id, '| course:', q.course_title, '|', q.title))

  // 4. Assignments with course linkage
  const assignments = await sql`
    SELECT a.id, a.title, a.course_id, c.title as course_title
    FROM assignments a
    LEFT JOIN courses c ON a.course_id = c.id
    ORDER BY a.id DESC LIMIT 10
  `
  console.log('\n=== ASSIGNMENTS (last 10) ===')
  assignments.forEach(a => console.log('  id:', a.id, '| course_id:', a.course_id, '| course:', a.course_title, '|', a.title))

  // 5. Simulate student quiz query for each student
  console.log('\n=== QUIZ VISIBILITY PER STUDENT ===')
  for (const student of students) {
    const quizzesForStudent = await sql`
      SELECT q.id, q.title, c.title as course_title
      FROM quizzes q
      JOIN courses c ON q.course_id = c.id
      JOIN enrollments e ON e.course_id = c.id
      WHERE e.user_id = ${student.id} AND e.status = 'approved'
    `
    console.log('  Student:', student.email, '→', quizzesForStudent.length, 'quizzes visible')
    quizzesForStudent.forEach(q => console.log('    -', q.title, '(course:', q.course_title + ')'))
  }

  // 6. Simulate student assignment query for each student
  console.log('\n=== ASSIGNMENT VISIBILITY PER STUDENT ===')
  for (const student of students) {
    const assignmentsForStudent = await sql`
      SELECT a.id, a.title, c.title as course_title
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN enrollments e ON e.course_id = c.id
      WHERE e.user_id = ${student.id} AND e.status = 'approved'
    `
    console.log('  Student:', student.email, '→', assignmentsForStudent.length, 'assignments visible')
    assignmentsForStudent.forEach(a => console.log('    -', a.title, '(course:', a.course_title + ')'))
  }
}

run().catch(console.error)
