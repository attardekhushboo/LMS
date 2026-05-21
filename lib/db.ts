import { neon } from '@neondatabase/serverless'

const dbUrl = process.env.DATABASE_URL?.replace(/^['"]|['"]$/g, '')
const sql_neon = neon(dbUrl!)

export const sql = async (
  strings: TemplateStringsArray | string,
  ...values: unknown[]
) => {
  let query = ""
  if (typeof strings === "string") {
    query = strings
  } else {
    // 1. Build the query string with $1, $2, etc. placeholders for PostgreSQL
    query = strings[0]
    for (let i = 1; i < strings.length; i++) {
      query += `$${i}` + strings[i]
    }
  }

  // 2. Compatibility: Replace SQLite-specific syntax with PostgreSQL equivalents
  // Replace DATETIME('now') with NOW()
  query = query.replace(/DATETIME\('now'\)/gi, 'NOW()')
  
  // Replace SQLite specific auto-increment logic if any (unlikely in queries)
  // but most importantly, ensure "is_approved = 1" still works if possible,
  // though better to fix the schema to return real booleans.

  try {
    const result = await sql_neon(query, values)
    
    // Determine if this was an INSERT/UPDATE/DELETE and return accordingly
    // Neon returns rows directly from the promise if it's a select or has RETURNING
    // We want the behavior to be consistent with how it's used in the app.
    // Most logic expects an array of rows.
    return result
  } catch (error) {
    console.error('Database error:', error)
    throw error
  }
}

export type SqlQuery = typeof sql

