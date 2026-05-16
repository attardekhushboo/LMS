const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
// Load environment variables from .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    process.env[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('🚀 Starting PostgreSQL migration...');

  try {
    const schemaPath = path.join(__dirname, '001-create-tables.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolon to run statements individually if needed, 
    // but neon() can often handle multiple statements if they are compatible.
    // However, it's safer to run them one by one or as a block.
    // For Neon serverless, we can just send the block.
    
    console.log('📄 Reading schema...');
    
    // For a clean migration, we drop tables first in reverse order of dependencies
    const dropTables = [
      'submissions', 'quiz_submissions', 'quiz_answers', 'quiz_responses', 
      'quiz_options', 'quiz_questions', 'quizzes', 'module_progress', 
      'enrollments', 'modules', 'certificates', 'courses', 'users', 'institutions'
    ];
    
    console.log('🗑️ Cleaning up existing tables...');
    for (const table of dropTables) {
      await sql(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }

    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Executing ${statements.length} SQL statements...`);

    for (const statement of statements) {
      await sql(statement);
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
