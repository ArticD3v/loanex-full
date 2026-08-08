const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Prefer DATABASE_URL from the environment. Fall back to a passwordless
// local Postgres (peer/trust auth) so local dev keeps working with no
// embedded credentials.
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/postgres';

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : false,
});

async function setupDatabase() {
  console.log('🚀 Initializing Native PostgreSQL Database for LoanEx...');
  const client = await pool.connect();
  
  try {
    const schemaSqlPath = path.join(__dirname, '..', 'schema.sql');
    if (fs.existsSync(schemaSqlPath)) {
      console.log('📜 Executing schema.sql DDL...');
      const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
      await client.query(schemaSql);
      console.log('✅ Schema tables created successfully!');
    }


    const dumpSqlPath = path.join(__dirname, '..', 'loanex_full_database.sql');
    if (fs.existsSync(dumpSqlPath)) {
      console.log('🌱 Executing loanex_full_database.sql seed data...');
      const dumpSql = fs.readFileSync(dumpSqlPath, 'utf8');
      await client.query(dumpSql);
      console.log('✅ Database populated with seed data successfully!');
    }

    console.log('🎉 PostgreSQL setup complete!');
  } catch (err) {
    console.error('❌ Database setup error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();
