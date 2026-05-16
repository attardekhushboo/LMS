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
    if (!session?.user?.id || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const teacherId = parseInt(session.user.id, 10)

    // Fetch quiz — verify teacher owns it via quiz.teacher_id OR course ownership
    const [quiz] = await sql`
      SELECT q.id, q.title, q.time_limit, q.passing_score, q.max_attempts, q.created_at,
             c.title as course_title, c.id as course_id
      FROM quizzes q
      JOIN courses c ON q.course_id = c.id
      WHERE q.id = ${id}
        AND (q.teacher_id = ${teacherId} OR c.teacher_id = ${teacherId})
    `

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    // Fetch questions
    const questions = await sql`
      SELECT id, question, order_number
      FROM quiz_questions
      WHERE quiz_id = ${id}
      ORDER BY order_number ASC
    `

    if ((questions as any[]).length === 0) {
      return NextResponse.json({ ...quiz, questions: [], total_attempts: 0, avg_score: 0 })
    }

    // Build $1,$2,$3... placeholders for PostgreSQL IN clause
    // NOTE: must use $N format — bare numbers like "1,2,3" are NOT parameters
    const questionIds = (questions as any[]).map((q: any) => q.id)
    const placeholders = questionIds.map((_: any, i: number) => "$" + (i + 1)).join(",")

    const optionsRaw = await sql_neon(
      "SELECT id, question_id, option_text, is_correct, order_number " +
      "FROM quiz_options " +
      "WHERE question_id IN (" + placeholders + ") " +
      "ORDER BY question_id, order_number ASC",
      questionIds
    )
    const options = optionsRaw as any[]

    // Merge options into each question
    const questionsWithOptions = (questions as any[]).map((q: any) => {
      const qOpts = options
        .filter((o: any) => o.question_id === q.id)
        .sort((a: any, b: any) => a.order_number - b.order_number)
      return {
        id: q.id,
        question: q.question,
        order_number: q.order_number,
        options: qOpts.map((o: any) => ({
          id: o.id,
          text: o.option_text,
          // PostgreSQL returns actual boolean — handle both boolean and integer (1/0)
          isCorrect: o.is_correct === true || o.is_correct === 1,
          order_number: o.order_number,
        })),
        // 1-based index of the correct option
        correctAnswer: qOpts.findIndex((o: any) => o.is_correct === true || o.is_correct === 1) + 1,
      }
    })

    // Submission stats
    const [stats] = await sql`
      SELECT COUNT(*) as total_attempts,
             COALESCE(AVG(score), 0) as avg_score
      FROM quiz_responses
      WHERE quiz_id = ${id}
    `

    return NextResponse.json({
      ...quiz,
      questions: questionsWithOptions,
      total_attempts: parseInt((stats as any).total_attempts || "0"),
      avg_score: Math.round(parseFloat((stats as any).avg_score || "0")),
    })
  } catch (error) {
    console.error("Teacher quiz detail error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const teacherId = parseInt(session.user.id, 10)

    const [quiz] = await sql`
      SELECT q.id FROM quizzes q
      JOIN courses c ON q.course_id = c.id
      WHERE q.id = ${id} AND c.teacher_id = ${teacherId}
    `
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    await sql`DELETE FROM quizzes WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete quiz error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
