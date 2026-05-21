import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { neon } from "@neondatabase/serverless"

const sql_neon = neon(process.env.DATABASE_URL!.replace(/^['"]|['"]$/g, ""))

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // 1. Fetch Quiz Details
    const [quiz] = await sql`
      SELECT id, title, time_limit, passing_score 
      FROM quizzes WHERE id = ${id}
    `

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    // 2. Fetch attempt history for this student
    const attempts = await sql`
      SELECT score, completed_at as submitted_at,
        CASE WHEN score >= ${(quiz as any).passing_score} THEN 1 ELSE 0 END as passed
      FROM quiz_responses
      WHERE quiz_id = ${id} AND user_id = ${session.user.id}
      ORDER BY completed_at DESC
    `

    // 3. Fetch max_attempts
    const [quizMeta] = await sql`SELECT max_attempts FROM quizzes WHERE id = ${id}`

    // 3. Fetch Questions & Options
    const questions = await sql`
      SELECT q.id, q.question, q.question_type, q.points, q.order_number
      FROM quiz_questions q
      WHERE q.quiz_id = ${id}
      ORDER BY q.order_number ASC
      LIMIT 10
    `

    const questionIds = questions.map((q: any) => q.id)
    if (questionIds.length === 0) {
      return NextResponse.json({
        ...quiz,
        max_attempts: quizMeta?.max_attempts ?? 3,
        questions: [],
        attempts: attempts.map((a: any) => ({ ...a, passed: a.passed === 1 })),
        completed: (attempts as any[]).some((a: any) => a.passed === 1 || a.passed === true),
        previousScore: (attempts as any[])[0]?.score
      })
    }

    // Build individual $N placeholders for the IN clause
    // (passing an array as a single parameter returns 0 rows in PostgreSQL)
    const placeholderList = questionIds.map((_: any, i: number) => `$${i + 1}`).join(",")
    const optionsRaw = await sql_neon(
      `SELECT id, question_id, option_text, order_number
       FROM quiz_options
       WHERE question_id IN (${placeholderList})
       ORDER BY order_number ASC`,
      questionIds
    )
    const options = optionsRaw

    // Merge options into each question as option1/option2/option3/option4
    // so the frontend can read q.option1, q.option2, etc. directly
    const questionsWithOptions = questions.map((q: any) => {
      const qOpts = (options as any[])
        .filter((o: any) => o.question_id === q.id)
        .sort((a: any, b: any) => a.order_number - b.order_number)
      
      return {
        ...q,
        option1: qOpts[0]?.option_text ?? "",
        option2: qOpts[1]?.option_text ?? "",
        option3: qOpts[2]?.option_text ?? "",
        option4: qOpts[3]?.option_text ?? "",
      }
    })

    return NextResponse.json({
      ...quiz,
      max_attempts: quizMeta?.max_attempts ?? 3,
      questions: questionsWithOptions,
      attempts: (attempts as any[]).map((a: any) => ({ ...a, passed: a.passed === 1 })),
      completed: (attempts as any[]).some((a: any) => a.passed === 1 || a.passed === true),
      previousScore: (attempts as any[])[0]?.score
    })
  } catch (error) {
    console.error("Quiz API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { answers } = await request.json()

    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Answers are required" }, { status: 400 })
    }

    // Fetch quiz to get passing_score
    const [quiz] = await sql`SELECT id, passing_score FROM quizzes WHERE id = ${id}`
    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 })

    // Check attempt limit
    const existingAttempts = await sql`
      SELECT COUNT(*) as count FROM quiz_responses WHERE quiz_id = ${id} AND user_id = ${session.user.id}
    `
    const [quizMeta] = await sql`SELECT max_attempts FROM quizzes WHERE id = ${id}`
    const maxAttempts = quizMeta?.max_attempts ?? 3
    const attemptCount = parseInt((existingAttempts[0] as any).count || "0")
    if (attemptCount >= maxAttempts) {
      return NextResponse.json({ error: "Maximum attempts reached" }, { status: 400 })
    }

    // Fetch all questions and their correct options
    const questions = await sql`
      SELECT q.id as question_id, o.id as option_id, o.order_number, o.is_correct
      FROM quiz_questions q
      JOIN quiz_options o ON o.question_id = q.id
      WHERE q.quiz_id = ${id}
    `

    // Calculate score
    let correct = 0
    const total = new Set((questions as any[]).map((q: any) => q.question_id)).size

    for (const questionId of Object.keys(answers)) {
      const selectedOptionOrder = answers[questionId] // 1-based order number
      const questionOptions = (questions as any[]).filter((q: any) => String(q.question_id) === String(questionId))
      const selectedOption = questionOptions.find((o: any) => o.order_number === selectedOptionOrder)
      if (selectedOption?.is_correct === 1 || selectedOption?.is_correct === true) {
        correct++
      }
    }

    const score = total > 0 ? Math.round((correct / total) * 100) : 0
    const passed = score >= (quiz as any).passing_score

    // Save response
    await sql`
      INSERT INTO quiz_responses (quiz_id, user_id, score, completed_at)
      VALUES (${id}, ${session.user.id}, ${score}, NOW())
    `

    return NextResponse.json({ score, passed, correct, total })
  } catch (error) {
    console.error("Quiz submit error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
