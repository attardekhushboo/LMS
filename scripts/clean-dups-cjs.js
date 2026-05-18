const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    console.log("Checking duplicate quizzes...");
    const duplicateQuizzes = await sql`
      SELECT course_id, COUNT(*) 
      FROM quizzes 
      GROUP BY course_id 
      HAVING COUNT(*) > 1
    `;
    console.log("Duplicate Quizzes:", duplicateQuizzes);

    if (duplicateQuizzes.length > 0) {
      console.log("Deleting duplicate quizzes (keeping the newest one)...");
      const deletedQuizzes = await sql`
        DELETE FROM quizzes
        WHERE id NOT IN (
          SELECT MAX(id)
          FROM quizzes
          GROUP BY course_id
        )
        RETURNING id
      `;
      console.log(`Deleted ${deletedQuizzes.length} duplicate quizzes.`);
    }

    console.log("Checking duplicate assignments...");
    const duplicateAssignments = await sql`
      SELECT course_id, COUNT(*) 
      FROM assignments 
      GROUP BY course_id 
      HAVING COUNT(*) > 1
    `;
    console.log("Duplicate Assignments:", duplicateAssignments);

    if (duplicateAssignments.length > 0) {
      console.log("Deleting duplicate assignments (keeping the newest one)...");
      const deletedAssignments = await sql`
        DELETE FROM assignments
        WHERE id NOT IN (
          SELECT MAX(id)
          FROM assignments
          GROUP BY course_id
        )
        RETURNING id
      `;
      console.log(`Deleted ${deletedAssignments.length} duplicate assignments.`);
    }

    console.log("Done.");
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
