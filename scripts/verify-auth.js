const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const { compare } = require('bcryptjs');

// Load environment variables from .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    process.env[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

const sql = neon(process.env.DATABASE_URL);

async function verifyAuth() {
  const email = 'teacher@nextgenschool.com';
  const password = 'demo123';
  
  console.log(`🔍 Verifying auth for ${email}...`);
  
  try {
    const users = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (users.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = users[0];
    console.log('👤 User found:', { email: user.email, role: user.role, is_approved: user.is_approved });
    
    const isValid = await compare(password, user.password_hash);
    console.log('🔑 Password valid:', isValid);
    
    if (!isValid) {
      console.log('⚠️ Password hash in DB:', user.password_hash);
    }
  } catch (error) {
    console.error('❌ Error verifying auth:', error);
  }
}

verifyAuth();
