import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdminApi } from '@/lib/admin-api-guard'

export const dynamic = 'force-dynamic'

const migrations = [
  // Institutions table
  `CREATE TABLE IF NOT EXISTS institutions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Add status column to institutions if missing
  `ALTER TABLE institutions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'`,

  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'teacher', 'admin', 'institution')),
    institution_id INTEGER REFERENCES institutions(id),
    is_approved BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Courses table
  `CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail TEXT,
    teacher_id INTEGER REFERENCES users(id),
    institution_id INTEGER REFERENCES institutions(id),
    class INTEGER,
    class_group VARCHAR(50),
    created_by_admin BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Add class and institution_id columns if they don't exist yet (for existing DBs)
  `ALTER TABLE courses ADD COLUMN IF NOT EXISTS class INTEGER`,
  `ALTER TABLE courses ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES institutions(id)`,

  // Modules table
  `CREATE TABLE IF NOT EXISTS modules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url TEXT,
    content TEXT,
    order_number INTEGER NOT NULL DEFAULT 1,
    duration_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Module progress
  `CREATE TABLE IF NOT EXISTS module_progress (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    UNIQUE(module_id, user_id)
  )`,

  // Enrollments
  `CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    progress INTEGER DEFAULT 0,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE(user_id, course_id)
  )`,

  // Quizzes
  `CREATE TABLE IF NOT EXISTS quizzes (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    time_limit INTEGER DEFAULT 30,
    passing_score INTEGER DEFAULT 70,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Add teacher_id and max_attempts to quizzes if missing (for existing DBs)
  `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES users(id)`,
  `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3`,

  // Quiz questions
  `CREATE TABLE IF NOT EXISTS quiz_questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'multiple_choice',
    points INTEGER DEFAULT 10,
    order_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Ensure new columns are added if quiz_questions table already existed
  `ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(50) DEFAULT 'multiple_choice'`,
  `ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 10`,
 
  // Remove legacy option columns from quiz_questions if they exist
  // (options are stored in quiz_options table, not as columns)
  `ALTER TABLE quiz_questions DROP COLUMN IF EXISTS option1`,
  `ALTER TABLE quiz_questions DROP COLUMN IF EXISTS option2`,
  `ALTER TABLE quiz_questions DROP COLUMN IF EXISTS option3`,
  `ALTER TABLE quiz_questions DROP COLUMN IF EXISTS option4`,
  `ALTER TABLE quiz_questions DROP COLUMN IF EXISTS correct_answer`,

  // Quiz options
  `CREATE TABLE IF NOT EXISTS quiz_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    order_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Quiz responses
  `CREATE TABLE IF NOT EXISTS quiz_responses (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE(quiz_id, user_id)
  )`,

  // Add max_attempts to quizzes if missing
  `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3`,  // Quiz answers
  `CREATE TABLE IF NOT EXISTS quiz_answers (
    id SERIAL PRIMARY KEY,
    response_id INTEGER REFERENCES quiz_responses(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES quiz_questions(id),
    selected_option_id INTEGER REFERENCES quiz_options(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Assignments
  `CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    file_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Add file_url column to assignments if missing (for existing DBs)
  `ALTER TABLE assignments ADD COLUMN IF NOT EXISTS file_url TEXT`,

  // Assignment submissions
  `CREATE TABLE IF NOT EXISTS assignment_submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    submission_text TEXT,
    file_url TEXT,
    status VARCHAR(50) DEFAULT 'submitted',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    grade INTEGER,
    feedback TEXT,
    UNIQUE(assignment_id, user_id)
  )`,

  // Add status column to assignment_submissions if it doesn't exist yet
  `ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'submitted'`,

  // Certificates
  `CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    certificate_number VARCHAR(50) UNIQUE,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    certificate_url TEXT,
    UNIQUE(user_id, course_id)
  )`,

  // Add certificate_number column if missing (for existing DBs)
  `ALTER TABLE certificates ADD COLUMN IF NOT EXISTS certificate_number VARCHAR(50) UNIQUE`,

  // Platform settings
  `CREATE TABLE IF NOT EXISTS platform_settings (
    id SERIAL PRIMARY KEY,
    allow_registration BOOLEAN DEFAULT TRUE,
    auto_approve_teachers BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Seed default platform settings row if not exists
  `INSERT INTO platform_settings (id, allow_registration, auto_approve_teachers)
   VALUES (1, TRUE, FALSE)
   ON CONFLICT (id) DO NOTHING`,

  // Pending registrations table for Email OTP Registration flow
  `CREATE TABLE IF NOT EXISTS pending_registrations (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    registration_data JSONB NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`
]

export async function GET() {
  try {
    const guard = await requireAdminApi()
    if (guard) return guard

    // Run all migrations
    for (const migration of migrations) {
      await sql(migration)
    }

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      migrationsApplied: migrations.length,
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Migration failed',
      },
      { status: 500 }
    )
  }
}
