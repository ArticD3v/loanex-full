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

async function exportDatabase() {
  console.log('Exporting Native PostgreSQL Database data...');
  let sql = `-- ========================================================\n`;
  sql += `-- LoanEx Complete Native PostgreSQL Dump & Setup Script\n`;
  sql += `-- Generated on: ${new Date().toISOString()}\n`;
  sql += `-- ========================================================\n\n`;

  sql += `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n`;
  sql += `CREATE EXTENSION IF NOT EXISTS "pgcrypto";\n\n`;

  const tables = [
    'categories',
    'sub_categories',
    'brands',
    'manufacturers',
    'suppliers',
    'warehouses',
    'dealers',
    'products',
    'product_attributes',
    'product_attribute_values',
    'product_variant_attributes',
    'product_dealers',
    'product_suppliers',
    'product_photos',
    'product_emi_plans',
    'emi_plans',
    'banners',
    'users',
    'profiles',
    'addresses',
    'customer_kyc',
    'kyc',
    'experian_reports',
    'digilocker_reports',
    'orders',
    'order_items',
    'emi_applications',
    'emi_details',
    'emi_schedules',
    'reviews',
    'cart_items',
    'wishlist_items',
    'notifications'
  ];

  const client = await pool.connect();
  try {
    for (const table of tables) {
      try {
        const res = await client.query(`SELECT * FROM "${table}"`);
        const records = res.rows;
        if (!records || records.length === 0) continue;

        sql += `-- Table: public.${table} (${records.length} records)\n`;

        for (const record of records) {
          const keys = Object.keys(record);
          const quotedCols = keys.map(k => `"${k}"`).join(', ');
          
          const vals = keys.map(k => {
            const val = record[k];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number' || typeof val === 'boolean') return `${val}`;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
            return `'${String(val).replace(/'/g, "''")}'`;
          }).join(', ');

          sql += `INSERT INTO public."${table}" (${quotedCols}) VALUES (${vals}) ON CONFLICT DO NOTHING;\n`;
        }
        sql += `\n`;
      } catch (e) {
        console.log(`Skipped table ${table}: ${e.message}`);
      }
    }

    const exportPath = path.join(__dirname, 'loanex_full_database.sql');
    fs.writeFileSync(exportPath, sql);
    console.log(`Export completed! Written to ${exportPath}`);
  } finally {
    client.release();
    await pool.end();
  }
}

exportDatabase().catch(console.error);
