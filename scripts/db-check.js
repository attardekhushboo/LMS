const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

// Load environment variables from .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    process.env[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

const sql = neon(process.env.DATABASE_URL);

async function checkUsers() {
  console.log('🔍 Checking users in database...');
  try {
    const users = await sql`SELECT id, email, role, is_approved FROM users`;
    console.table(users);
  } catch (error) {
    console.error('❌ Error checking users:', error);
  }
}

checkUsers();
