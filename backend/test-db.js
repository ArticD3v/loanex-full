const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.sfddelyotptsfbigwllg:djCAuMcovTYEt2gl@pooler.supabase.com:6543/postgres',
});

client.connect()
  .then(() => {
    console.log('Connected successfully');
    return client.query('SELECT NOW()');
  })
  .then(res => {
    console.log('Time from DB:', res.rows[0].now);
  })
  .catch(err => {
    console.error('Connection error', err.stack);
  })
  .finally(() => {
    client.end();
  });
