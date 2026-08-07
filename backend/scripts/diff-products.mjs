import fs from 'node:fs';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZienVsZ3V4aXl2cG96cGpmeHB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTI1MTEyMCwiZXhwIjoyMTAwODI3MTIwfQ.Li8nsm8mUpDbvPj379oStUN_arZ8fr3YzMSX4FEziU8';
(async () => {
  const sql = fs.readFileSync('../supabase-recreated-tables.sql', 'utf-8');
  const sec = sql.split('Table: public."products"')[1];
  const m = sec.match(/VALUES\n([\s\S]*?);/);
  const lines = m[1].split(/\n/).map(l => l.trim().replace(/,$/, '')).filter(Boolean);
  const seedIds = lines.map(l => { const x = l.match(/^\(\s*'([^']+)'/); return x && x[1]; }).filter(Boolean);
  console.log('sql product inserts:', seedIds.length);

  const res = await fetch('https://vbzulguxiyvpozpjfxpz.supabase.co/rest/v1/products?select=id,name', { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
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