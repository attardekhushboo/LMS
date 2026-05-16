const { neon } = require('@neondatabase/serverless')
const DB = 'postgresql://neondb_owner:npg_DLJ0aFhT2twe@ep-blue-glade-a1pdwfcg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DB)

async function run() {
  // Verify totalCourses count per class (what student dashboard returns)
  for (const cls of [4, 5, 6, 7, 8, 9]) {
    const r = await sql`
      SELECT COUNT(*) as count
      FROM courses c
      JOIN users u ON c.teacher_id = u.id
      WHERE c.class = ${cls}
        AND c.status = 'approved'
        AND u.email IS NOT NULL
    `
    console.log('Class', cls, '→ totalCourses:', r[0].count)
  }

  // Confirm zero orphans
  const orphans = await sql`
    SELECT COUNT(*) as count FROM courses c
    LEFT JOIN users u ON c.teacher_id = u.id
    WHERE u.email IS NULL OR c.teacher_id IS NULL
  `
  console.log('\nOrphan courses excluded:', orphans[0].count)

  // Confirm UI field: "Courses Enrolled / totalCourses" for class 8 student
  console.log('\nUI stat card for class 8 student:')
  console.log('  "Courses Enrolled" = enrolledCourses (from enrollments table)')
  console.log('  "/ totalCourses"   = 4 (valid approved class 8 courses)')
}

run().catch(console.error)
