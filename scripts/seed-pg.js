const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const { hashSync } = require('bcryptjs');
const crypto = require('crypto');

// Load environment variables from .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    process.env[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

const sql = neon(process.env.DATABASE_URL);

async function seed() {
  console.log('🌱 Seeding NextGen School (PostgreSQL)...');

  try {
    // 1. Seed Demo Users
    const demoPassword = hashSync('demo123', 10);
    const users = [
      { name: 'Admin User', email: 'admin@nextgenschool.com', role: 'admin' },
      { name: 'Demo Teacher', email: 'teacher@nextgenschool.com', role: 'teacher' },
      { name: 'Demo Student', email: 'student@nextgenschool.com', role: 'student', class: 8 }
    ];

    console.log('👤 Creating demo users...');
    for (const user of users) {
      await sql`
        INSERT INTO users (name, email, password_hash, role, is_approved, class)
        VALUES (${user.name}, ${user.email}, ${demoPassword}, ${user.role}, true, ${user.class || null})
        ON CONFLICT (email) DO NOTHING
      `;
    }

    const [teacher] = await sql`SELECT id FROM users WHERE email = 'teacher@nextgenschool.com'`;
    const [student] = await sql`SELECT id FROM users WHERE email = 'student@nextgenschool.com'`;

    // 2. Seed Courses (one for each grade 4-9)
    const subjects = ['Mathematics', 'Science', 'English'];
    console.log('📚 Creating courses and content...');

    for (let grade = 4; grade <= 9; grade++) {
      for (const subject of subjects) {
        const title = `Class ${grade} ${subject} Masterclass`;
        const description = `Comprehensive ${subject} syllabus for Class ${grade}.`;
        
        const [course] = await sql`
          INSERT INTO courses (title, description, teacher_id, class_group, status)
          VALUES (${title}, ${description}, ${teacher.id}, ${grade.toString()}, 'approved')
          RETURNING id
        `;

        // Add 3 Modules
        for (let m = 1; m <= 3; m++) {
          await sql`
            INSERT INTO modules (course_id, title, description, order_number, duration_minutes)
            VALUES (${course.id}, ${`Lesson ${m}: Introduction`}, 'Lesson content here', ${m}, 15)
          `;
        }

        // Add 1 Quiz
        const [quiz] = await sql`
          INSERT INTO quizzes (course_id, title, passing_score)
          VALUES (${course.id}, ${`${subject} Grade ${grade} Quiz`}, 70)
          RETURNING id
        `;

        // Add 2 Questions
        for (let q = 1; q <= 2; q++) {
          await sql`
            INSERT INTO quiz_questions (quiz_id, question, option1, option2, option3, option4, correct_answer)
            VALUES (${quiz.id}, ${`Question ${q}?`}, 'Answer A', 'Answer B', 'Answer C', 'Answer D', 1)
          `;
        }

        // Enroll demo student in some courses
        if (grade <= 6) {
            await sql`
              INSERT INTO enrollments (user_id, course_id, status, progress)
              VALUES (${student.id}, ${course.id}, 'approved', ${grade === 4 ? 100 : 50})
              ON CONFLICT (user_id, course_id) DO NOTHING
            `;
        }
      }
    }

    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
