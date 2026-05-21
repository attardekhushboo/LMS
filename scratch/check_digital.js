const { sql } = require('./db')

async function run() {
  // Check Digital Electronics course
  const course = await sql`
    SELECT c.id, c.title, c.teacher_id, c.class, c.status,
           u.email AS teacher_email, u.name AS teacher_name
    FROM courses c
    LEFT JOIN users u ON c.teacher_id = u.id
    WHERE c.title ILIKE '%digital%'
  `

  console.log('=== Digital Electronics Course ===')
  if (course.length === 0) {
    console.log('NOT FOUND in database.')
    return
  }

  const c = course[0]
  console.log('id          :', c.id)
  console.log('title       :', c.title)
  console.log('teacher_id  :', c.teacher_id)
  console.log('teacher_email:', c.teacher_email)
  console.log('teacher_name :', c.teacher_name)
  console.log('class       :', c.class)
  console.log('status      :', c.status)

  // Check if teacher email matches expected
  const expected = 'teacher@nextgenschool.com'
  if (c.teacher_email === expected) {
    console.log('\n✅ teacher_email is CORRECT:', expected)
    console.log('No update needed.')
  } else {
    console.log('\n❌ teacher_email is WRONG or NULL:', c.teacher_email)
    console.log('Expected:', expected)

    // Find the correct teacher id
    const teacher = await sql`SELECT id, email FROM users WHERE email = ${expected}`
    if (teacher.length === 0) {
      console.log('ERROR: Teacher', expected, 'not found in users table.')
      return
    }

    const correctTeacherId = teacher[0].id
    console.log('Correct teacher_id:', correctTeacherId)

    // Update only this course
    await sql`UPDATE courses SET teacher_id = ${correctTeacherId} WHERE id = ${c.id}`
    console.log('✅ Updated course id:', c.id, '→ teacher_id =', correctTeacherId)

    // Verify
    const verify = await sql`
      SELECT c.id, c.title, c.teacher_id, u.email AS teacher_email
      FROM courses c
      LEFT JOIN users u ON c.teacher_id = u.id
      WHERE c.id = ${c.id}
    `
    console.log('Verified teacher_email:', verify[0].teacher_email)
  }
}

run().catch(console.error)
