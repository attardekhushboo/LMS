import { sql } from "@/lib/db";

export async function updateCourseProgress(userId: string | number, courseId: string | number) {
  // 1. Calculate modules progress
  const [moduleStats] = await sql`
    SELECT 
      (SELECT COUNT(*) FROM modules WHERE course_id = ${courseId}) as total_modules,
      (SELECT COUNT(*) FROM module_progress mp 
       JOIN modules m ON mp.module_id = m.id 
       WHERE m.course_id = ${courseId} AND mp.user_id = ${userId} AND mp.completed = true) as completed_modules
  `;

  const totalModules = parseInt(moduleStats.total_modules || "0");
  const completedModules = parseInt(moduleStats.completed_modules || "0");

  // 2. Calculate quizzes progress (must pass)
  const quizzes = await sql`
    SELECT q.id, q.passing_score,
      (SELECT MAX(score) FROM quiz_responses WHERE quiz_id = q.id AND user_id = ${userId}) as best_score
    FROM quizzes q WHERE q.course_id = ${courseId}
  `;
  const totalQuizzes = quizzes.length;
  let passedQuizzes = 0;
  quizzes.forEach((q: any) => {
    if (q.best_score !== null && Number(q.best_score) >= Number(q.passing_score)) {
      passedQuizzes++;
    }
  });

  // 3. Calculate assignments progress (must submit/be graded)
  const assignments = await sql`
    SELECT a.id,
      (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id AND user_id = ${userId}) as submission_count
    FROM assignments a WHERE a.course_id = ${courseId}
  `;
  const totalAssignments = assignments.length;
  let submittedAssignments = 0;
  assignments.forEach((a: any) => {
    if (parseInt(a.submission_count || "0") > 0) {
      submittedAssignments++;
    }
  });

  // 4. Combine all to get total progress
  let completedSlots = completedModules + passedQuizzes + submittedAssignments;
  let totalSlots = totalModules + totalQuizzes + totalAssignments;

  const progressPercent = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

  // 5. Update enrollment table
  if (progressPercent === 100) {
    await sql`
      UPDATE enrollments 
      SET progress = ${progressPercent}, 
          updated_at = NOW(),
          completed_at = NOW()
      WHERE user_id = ${userId} AND course_id = ${courseId}
    `;
  } else {
    await sql`
      UPDATE enrollments 
      SET progress = ${progressPercent}, 
          updated_at = NOW(),
          completed_at = NULL
      WHERE user_id = ${userId} AND course_id = ${courseId}
    `;
  }

  return {
    progress: progressPercent,
    isNewlyCompleted: progressPercent === 100,
    details: {
      modules: `${completedModules}/${totalModules}`,
      quizzes: `${passedQuizzes}/${totalQuizzes}`,
      assignments: `${submittedAssignments}/${totalAssignments}`,
    }
  };
}
