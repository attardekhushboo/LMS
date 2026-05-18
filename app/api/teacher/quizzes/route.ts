import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { neon } from "@neondatabase/serverless"

const sql_neon = neon(process.env.DATABASE_URL!.replace(/^['"]|['"]$/g, ""))

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teacherId = parseInt(session.user.id, 10)
    const teacherEmail = session.user.email

    const quizzes = await sql`
      SELECT 
        q.id, q.title, q.time_limit, q.passing_score, q.created_at,
        c.title as course_title, c.id as course_id, c.class as course_class,
        (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count,
        (SELECT COUNT(*) FROM quiz_responses WHERE quiz_id = q.id) as submission_count
      FROM quizzes q
      JOIN courses c ON q.course_id = c.id
      JOIN users u ON c.teacher_id = u.id
      WHERE u.email = ${teacherEmail}
        AND q.teacher_id = ${teacherId}
      ORDER BY c.class ASC, q.created_at DESC
    `
    return NextResponse.json(quizzes)
  } catch (error) {
    console.error("Teacher quizzes error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { courseId, title, description, timeLimit, passingScore, maxAttempts, status, questions } = await request.json()

    if (!courseId || !title || !questions?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const teacherId = parseInt(session.user.id, 10)
    const teacherEmail = session.user.email

    // Drop legacy columns from quiz_questions if they still exist in the DB
    const legacyDrops = [
      'ALTER TABLE quiz_questions DROP COLUMN IF EXISTS option1',
      'ALTER TABLE quiz_questions DROP COLUMN IF EXISTS option2',
      'ALTER TABLE quiz_questions DROP COLUMN IF EXISTS option3',
      'ALTER TABLE quiz_questions DROP COLUMN IF EXISTS option4',
      'ALTER TABLE quiz_questions DROP COLUMN IF EXISTS correct_answer',
    ]
    for (const stmt of legacyDrops) {
      try { await sql_neon(stmt) } catch { /* already dropped */ }
    }

    // Verify teacher owns this course (check by both id and email for safety)
    const course = await sql`
      SELECT c.id FROM courses c
      JOIN users u ON c.teacher_id = u.id
      WHERE c.id = ${courseId} AND u.email = ${teacherEmail}
    `
    if (!course.length) {
      return NextResponse.json({ error: "Course not found or you don't have permission." }, { status: 404 })
    }

    // ── Check for duplicate title within the same course ──────────────────────────
    const existingQuiz = await sql`SELECT id FROM quizzes WHERE course_id = ${courseId} AND title = ${title} LIMIT 1`
    if (existingQuiz.length > 0) {
      return NextResponse.json({ error: "Quiz with this title already exists in this course." }, { status: 409 })
    }

    // Insert quiz with teacher_id, description, status so it's correctly attributed
    const quiz = await sql`
      INSERT INTO quizzes (course_id, title, description, time_limit, passing_score, max_attempts, status, teacher_id)
      VALUES (${courseId}, ${title}, ${description || null}, ${timeLimit || 30}, ${passingScore || 70}, ${maxAttempts || 3}, ${status || 'published'}, ${teacherId})
      RETURNING id
    `

    const quizId = quiz[0].id
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const questionResult = await sql`
        INSERT INTO quiz_questions (quiz_id, question, order_number)
        VALUES (${quizId}, ${q.question}, ${i + 1})
        RETURNING id
      `
      const questionId = questionResult[0].id

      // Insert 4 options into quiz_options
      const options = [
        { text: q.option1, isCorrect: q.correctAnswer === 1 },
        { text: q.option2, isCorrect: q.correctAnswer === 2 },
        { text: q.option3, isCorrect: q.correctAnswer === 3 },
        { text: q.option4, isCorrect: q.correctAnswer === 4 },
      ]

      for (let j = 0; j < options.length; j++) {
        await sql`
          INSERT INTO quiz_options (question_id, option_text, is_correct, order_number)
          VALUES (${questionId}, ${options[j].text}, ${options[j].isCorrect}, ${j + 1})
        `
      }
    }

    return NextResponse.json({ id: quizId })
  } catch (error) {
    console.error("Create quiz error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
