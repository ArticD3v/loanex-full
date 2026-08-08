/**
 * Connectivity probe for PostgreSQL (backup/source).
 * Requires DATABASE_URL in the environment — no hardcoded credentials.
 */
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!connectionString) {
  console.error('Missing DATABASE_URL (or DIRECT_URL). Set it in the environment; do not hardcode credentials.');
  process.exit(1);
}

const client = new Client({ connectionString });

client
  .connect()
  .then(() => {
    console.log('Connected successfully');
    return client.query('SELECT NOW()');
  })
  .then((res) => {
    console.log('Time from DB:', res.rows[0].now);
  })
  .catch((err) => {
    console.error('Connection error', err.message);
  })
  .finally(() => {
    client.end();
  });
