const { sql } = require('./db')

async function run() {
  // Simulate the updated all-courses query
  const courses = await sql`
    SELECT c.id, c.title, c.status, u.email AS teacher_email
    FROM courses c
    JOIN users u ON c.teacher_id = u.id
    WHERE u.email IS NOT NULL
    ORDER BY c.created_at DESC
  `
  console.log('Valid courses (teacher email NOT NULL):', courses.length)
  courses.forEach(c =>
    console.log('  id:', c.id, '| teacher:', c.teacher_email, '|', c.title)
  )

  // Simulate the updated count
  const count = await sql`
    SELECT COUNT(*) as count FROM courses c
    JOIN users u ON c.teacher_id = u.id
    WHERE u.email IS NOT NULL
  `
  console.log('\ntotalCourses count:', count[0].count)

  // Check if any orphan courses would have been excluded
  const orphans = await sql`
    SELECT c.id, c.title FROM courses c
    LEFT JOIN users u ON c.teacher_id = u.id
    WHERE u.email IS NULL OR c.teacher_id IS NULL
  `
  console.log('\nOrphan courses excluded:', orphans.length)
  if (orphans.length > 0) {
    orphans.forEach(c => console.log('  id:', c.id, '|', c.title))
  } else {
    console.log('  None — all courses have valid teacher emails')
  }
}

run().catch(console.error)
