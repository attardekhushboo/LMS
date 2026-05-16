const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const { hashSync } = require('bcryptjs');

// Load environment variables from .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

const sql = neon(env.DATABASE_URL);

async function seedInstitution() {
  console.log('🌱 Seeding Institution Credentials...');

  try {
    // 1. Create Institution
    console.log('🏢 Creating Harvard University institution...');
    const [institution] = await sql`
      INSERT INTO institutions (name, email, status)
      VALUES ('Harvard University', 'contact@harvard.edu', 'approved')
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;

    // If it already exists, fetch it
    let instId = institution?.id;
    if (!instId) {
      const [existing] = await sql`SELECT id FROM institutions WHERE email = 'contact@harvard.edu'`;
      instId = existing.id;
    }

    // 2. Create Institution User
    const passwordHash = hashSync('demo123', 10);
    console.log('👤 Creating institution user: harvard@institution.com...');
    await sql`
      INSERT INTO users (name, email, password_hash, role, institution_id, is_approved)
      VALUES ('Harvard Admin', 'harvard@institution.com', ${passwordHash}, 'institution', ${instId}, true)
      ON CONFLICT (email) DO NOTHING
    `;

    console.log('✅ Institution seeding completed successfully!');
    console.log('--- credentials ---');
    console.log('Email: harvard@institution.com');
    console.log('Password: demo123');
    console.log('-------------------');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedInstitution();
