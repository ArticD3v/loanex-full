const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.runtime');
const text = fs.readFileSync(envPath, 'utf8');
const keys = [...text.matchAll(/^([A-Z0-9_]+)=/gm)].map((m) => m[1]);
console.log(
  keys
    .filter((k) => /SUPABASE|DATABASE|POSTGRES|DIRECT/i.test(k))
    .join('\n'),
);

function present(name) {
  const m = text.match(new RegExp('^' + name + '=(.*)$', 'm'));
  if (!m) return 'missing';
  let v = m[1].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  if (!v) return 'empty';
  return `set len=${v.length} starts=${v.slice(0, 8)}`;
}

for (const k of [
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'DATABASE_URL',
  'POSTGRES_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]) {
  console.log(k, present(k));
}
