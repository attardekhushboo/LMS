const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

const sql = neon(env.DATABASE_URL);

async function checkData() {
  try {
    const users = await sql`SELECT id, name, email, role, institution_id FROM users WHERE role = 'institution'`;
    console.log('Institution Users:', JSON.stringify(users, null, 2));
    
    const institutions = await sql`SELECT * FROM institutions`;
    console.log('Institutions:', JSON.stringify(institutions, null, 2));
  } catch (error) {
    console.error('Error checking data:', error);
  }
}

checkData();
