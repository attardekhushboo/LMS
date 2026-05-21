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

async function run() {
  try {
    const tables = await sql("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log("TABLES IN DATABASE:");
    console.log(tables.map(t => t.table_name));

    for (const t of tables) {
      const tableName = t.table_name;
      const columns = await sql(`
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_schema='public' AND table_name = '${tableName}'
      `);
      console.log(`\nTable: ${tableName}`);
      console.table(columns);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
