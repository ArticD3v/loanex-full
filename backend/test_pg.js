const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Musharraf%401@localhost:5432/postgres';

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : false,
});

async function run() {
  console.log('Testing PG Pool connection...');
  const res = await pool.query('SELECT NOW()');
  console.log('PostgreSQL Connected successfully:', res.rows[0].now);
  await pool.end();
}

run().catch(console.error);
