const { neon } = require('@neondatabase/serverless')

const DB = 'postgresql://neondb_owner:npg_DLJ0aFhT2twe@ep-blue-glade-a1pdwfcg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DB)

async function run() {
  // Show before state
  const before = await sql`SELECT id, title, class FROM courses WHERE class IS NULL ORDER BY id`
  console.log('Courses with NULL class (' + before.length + '):')
  before.forEach(c => console.log('  id:', c.id, '| title:', c.title))

  // Extract class number from title and update
  // Titles follow pattern "Class X ..." — extract X
  let updated = 0
  for (const course of before) {
    const match = course.title.match(/Class\s+(\d+)/i)
    if (match) {
      const classNum = parseInt(match[1], 10)
      await sql`UPDATE courses SET class = ${classNum} WHERE id = ${course.id}`
      console.log('Updated id:', course.id, '→ class =', classNum, '|', course.title)
      updated++
    } else {
      console.log('SKIPPED (no class in title) id:', course.id, '|', course.title)
    }
  }

  // Verify after state
  const after = await sql`SELECT id, title, class FROM courses ORDER BY id`
  console.log('\nAll courses after fix:')
  after.forEach(c => console.log('  id:', c.id, '| class:', c.class, '|', c.title))
  console.log('\nUpdated:', updated, 'courses')
}

run().catch(console.error)
