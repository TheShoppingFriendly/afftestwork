const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = neon(process.env.DATABASE_URL);

// Test connection
async function testConnection() {
  try {
    await sql`SELECT 1`;
    console.log('✅ Connected to Neon PostgreSQL');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();

module.exports = { sql };
