import fs from 'node:fs';

const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const URL = process.env.SUPABASE_URL;
if (!KEY || !URL) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}

(async () => {
  const sql = fs.readFileSync('../supabase-recreated-tables.sql', 'utf-8');
  const sec = sql.split('Table: public."products"')[1];
  const m = sec.match(/VALUES\n([\s\S]*?);/);
  const lines = m[1].split(/\n/).map(l => l.trim().replace(/,$/, '')).filter(Boolean);
  const seedIds = lines.map(l => { const x = l.match(/^\(\s*'([^']+)'/); return x && x[1]; }).filter(Boolean);
  console.log('sql product inserts:', seedIds.length);

  const res = await fetch(`${URL}/rest/v1/products?select=id,name`, {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY },
  });
  const rows = await res.json();
  const live = new Set(rows.map(r => r.id));
  console.log('supabase products:', rows.length);
  console.log('MISSING:');
  seedIds.forEach(id => {
    if (!live.has(id)) {
      const line = lines.find(x => x.startsWith("'" + id)) || '';
      console.log(' -', id, '|', line.slice(0, 110));
    }
  });
})();
