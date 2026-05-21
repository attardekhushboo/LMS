const { neon } = require('@neondatabase/serverless')
const fs = require('fs')
const path = require('path')

const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach((line) => {
    const match = line.match(/^\s*([^#\s][^=]*)\s*=\s*(.*)$/)
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '')
    }
  })
}

const dbUrl = process.env.DATABASE_URL?.replace(/^['"]|['"]$/g, '')
if (!dbUrl) {
  throw new Error('DATABASE_URL is required. Add it to .env.local before running scratch scripts.')
}

module.exports = {
  sql: neon(dbUrl),
}
