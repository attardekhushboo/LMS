const { neon } = require('@neondatabase/serverless')
const DB = 'postgresql://neondb_owner:npg_DLJ0aFhT2twe@ep-blue-glade-a1pdwfcg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DB)

async function run() {
  // Simulate student class 8 (Khushboo)
  const studentClass = 8

  // 1. Browse All — class-filtered, valid only
  const browseCourses = await sql`
    SELECT c.id, c.title, c.class, u.email AS teacher_email
    FROM courses c
    JOIN users u ON c.teacher_id = u.id
    WHERE c.status = 'approved'
      AND u.email IS NOT NULL
      AND (c.class = ${studentClass} OR CAST(c.class AS TEXT) = ${String(studentClass)})
    ORDER BY c.created_at DESC
  `
  console.log('Browse All (class 8, valid only):', browseCourses.length, 'courses')
  browseCourses.forEach(c =>
    console.log('  id:', c.id, '| class:', c.class, '| teacher:', c.teacher_email, '|', c.title)
  )

  // 2. totalCourses count for class 8
  const countResult = await sql`
    SELECT COUNT(*) as count
    FROM courses c
    JOIN users u ON c.teacher_id = u.id
    WHERE c.class = ${studentClass}
      AND c.status = 'approved'
      AND u.email IS NOT NULL
  `
  console.log('\ntotalCourses for class 8:', countResult[0].count)

  // 3. Confirm no orphan courses leak through
  const orphanCheck = await sql`
    SELECT c.id, c.title FROM courses c
    LEFT JOIN users u ON c.teacher_id = u.id
    WHERE c.status = 'approved'
      AND (u.email IS NULL OR c.teacher_id IS NULL)
  `
  console.log('\nOrphan approved courses (should be 0):', orphanCheck.length)
}

run().catch(console.error)
