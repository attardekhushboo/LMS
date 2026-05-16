const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Try to find .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([^#\s][^=]*)\s*=\s*(.*)$/);
    if (match) {
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[match[1].trim()] = value;
    }
  });
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL not found in .env.local');
  process.exit(1);
}

const sql = neon(dbUrl);

async function checkDatabase() {
  console.log('🔍 Database Analysis Starting...');
  
  try {
    // 1. List all tables
    console.log('\n--- Tables ---');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.table(tables);

    // 2. Check platform_settings specifically
    const hasSettings = tables.some(t => t.table_name === 'platform_settings');
    if (hasSettings) {
      console.log('\n--- platform_settings Content ---');
      const settings = await sql`SELECT * FROM platform_settings`;
      console.table(settings);
    } else {
      console.log('\n❌ platform_settings table NOT FOUND');
    }

    // 3. Check users table columns
    console.log('\n--- users Table Schema ---');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
    `;
    console.table(columns);

  } catch (error) {
    console.error('❌ Error during database analysis:', error);
  }
}

checkDatabase();
