const { sql } = require('./db')

async function run() {
  // 1. Check if quiz_options table exists
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('quiz_questions','quiz_options','quizzes')
    ORDER BY table_name
  `
  console.log('Tables that exist:', tables.map(t => t.table_name).join(', '))

  // 2. Check recent quizzes
  const quizzes = await sql`
    SELECT id, title, teacher_id, course_id FROM quizzes ORDER BY id DESC LIMIT 5
  `
  console.log('\nRecent quizzes:')
  quizzes.forEach(q => console.log('  id:', q.id, '| teacher_id:', q.teacher_id, '|', q.title))

  // 3. Check questions for each quiz
  for (const quiz of quizzes) {
    const questions = await sql`SELECT id, question FROM quiz_questions WHERE quiz_id = ${quiz.id}`
    console.log('\nQuiz', quiz.id, '(' + quiz.title + ') has', questions.length, 'questions')
    for (const question of questions) {
      console.log('  Q:', question.id, question.question)
      // Check if quiz_options exists before querying
      try {
        const opts = await sql`SELECT id, option_text, is_correct FROM quiz_options WHERE question_id = ${question.id}`
        console.log('    Options:', opts.length, opts.map(o => o.option_text + (o.is_correct ? ' ✓' : '')).join(', '))
      } catch (e) {
        console.log('    quiz_options table does NOT exist yet')
      }
    }
  }
}

run().catch(console.error)
