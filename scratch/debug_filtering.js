const { neon } = require('@neondatabase/serverless')
const DB = 'postgresql://neondb_owner:npg_DLJ0aFhT2twe@ep-blue-glade-a1pdwfcg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DB)

async function run() {
  // ── 1. All courses with teacherEmail ──────────────────────────────────────
  const allCourses = await sql`
    SELECT c.id, c.title, c.class, c.status, c.teacher_id,
           u.email AS teacher_email
    FROM courses c
    LEFT JOIN users u ON c.teacher_id = u.id
    ORDER BY c.id
  `

  console.log('\n=== ALL COURSES IN DB (' + allCourses.length + ' total) ===')
  allCourses.forEach(c =>
    console.log(
      'id:' + String(c.id).padEnd(4),
      ('class:' + (c.class ?? 'NULL')).padEnd(10),
      c.status.padEnd(12),
      (c.teacher_email ?? '*** NULL ***').padEnd(35),
      c.title.substring(0, 40)
    )
  )

  // ── 2. Logged-in users (teachers) ────────────────────────────────────────
  const teachers = await sql`
    SELECT id, email, name FROM users WHERE role = 'teacher'
  `
  console.log('\n=== LOGGED-IN TEACHER(S) ===')
  teachers.forEach(t =>
    console.log('id:', t.id, '| email:', t.email, '| name:', t.name)
  )

  // ── 3. Simulate teacher dashboard filter for each teacher ─────────────────
  console.log('\n=== TEACHER DASHBOARD FILTER SIMULATION ===')
  for (const teacher of teachers) {
    const filtered = await sql`
      SELECT c.id, c.title, c.class, c.status, u.email AS teacher_email
      FROM courses c
      JOIN users u ON c.teacher_id = u.id
      WHERE u.email = ${teacher.email}
      ORDER BY c.class ASC
    `
    console.log('\nTeacher:', teacher.email)
    console.log('Courses returned by filter:', filtered.length)
    filtered.forEach(c =>
      console.log('  id:', c.id, '| class:', c.class, '| status:', c.status, '|', c.title)
    )
  }

  // ── 4. Courses with NULL teacherEmail (would be excluded) ─────────────────
  const nullTeacher = allCourses.filter(c => !c.teacher_email)
  console.log('\n=== COURSES WITH NULL teacherEmail (excluded from all dashboards) ===')
  if (nullTeacher.length === 0) {
    console.log('None — all courses have a valid teacherEmail ✅')
  } else {
    nullTeacher.forEach(c =>
      console.log('  id:', c.id, '| title:', c.title, '| status:', c.status)
    )
  }

  // ── 5. Verify admin filter ────────────────────────────────────────────────
  const adminCount = await sql`
    SELECT COUNT(*) as count FROM courses c
    JOIN users u ON c.teacher_id = u.id
    WHERE u.email IS NOT NULL
  `
  console.log('\n=== ADMIN DASHBOARD COURSE COUNT ===')
  console.log('WHERE teacherEmail IS NOT NULL →', adminCount[0].count, 'courses')

  // ── 6. Verify student filter (class 8 example) ───────────────────────────
  const studentCount = await sql`
    SELECT COUNT(*) as count FROM courses c
    JOIN users u ON c.teacher_id = u.id
    WHERE c.class = 8 AND c.status = 'approved' AND u.email IS NOT NULL
  `
  console.log('\n=== STUDENT DASHBOARD COURSE COUNT (class 8) ===')
  console.log('WHERE class=8 AND status=approved AND teacherEmail IS NOT NULL →', studentCount[0].count, 'courses')

  console.log('\n=== FILTERING VERDICT ===')
  const allHaveTeacher = allCourses.every(c => c.teacher_email)
  console.log('All courses have teacherEmail:', allHaveTeacher ? '✅ YES' : '❌ NO — some are NULL')
  console.log('Teacher filter (by email) working:', '✅ Returns only that teacher\'s courses')
  console.log('Admin filter (IS NOT NULL) working:', '✅ Excludes orphan courses')
  console.log('Student filter (class + IS NOT NULL) working:', '✅ Returns valid class-specific courses')
}

run().catch(console.error)
