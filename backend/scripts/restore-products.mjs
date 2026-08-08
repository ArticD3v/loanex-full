import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}

function parseValue(raw) {
  const v = raw.trim();
  if (!v || v === 'NULL') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (Number.isInteger(Number(v)) && String(Number(v)) === v) return Number(v);
  const jsonb = v.match(/^'((?:''|[^'])*)'::jsonb$/);
  if (jsonb) return JSON.parse(jsonb[1].replace(/''/g, "'"));
  const str = v.match(/^'((?:''|[^'])*)'$/);
  if (str) return str[1].replace(/''/g, "'");
  const num = Number(v);
  return Number.isNaN(num) ? v : num;
}

function splitTopLevel(row) {
  const parts = [];
  let cur = '';
  let depth = 0;
  let inStr = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (inStr) {
      cur += c;
      if (c === "'") {
        if (row[i + 1] === "'") { cur += "'"; i++; }
        else inStr = false;
      }
      continue;
    }
    if (c === "'") { inStr = true; cur += c; continue; }
    if (c === '[' || c === '{') depth++;
    if (c === ']' || c === '}') depth--;
    if (c === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += c;
  }
  parts.push(cur);
  return parts;
}

const sql = fs.readFileSync('../supabase-recreated-tables.sql', 'utf-8');
const sec = sql.split('Table: public."products"')[1];
const header = sec.match(/INSERT INTO public\."products" \(([^)]+)\)/)[1];
const cols = header.split(',').map(c => c.trim().replace(/"/g, ''));
const m = sec.match(/VALUES\n([\s\S]*?);/);
const VALUES = m[1].split(/\n/).map(l => l.trim().replace(/,$/, '')).filter(Boolean);

const TARGET = [
  '657ff9b8-cef4-4a96-809a-6cee4ce64235',
  '3350a129-9ca9-486f-b62d-32fb54c9fce1',
  'prod-s24-ultra',
  'prod-sony-tv',
];

const rows = VALUES.map((line) => {
  const raw = line.replace(/^\(/, '').replace(/\)$/, '');
  const values = splitTopLevel(raw);
  const obj = {};
  cols.forEach((c, i) => { obj[c] = parseValue(values[i]); });
  return obj;
});

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

(async () => {
  const toRestore = rows.filter(p => TARGET.includes(p.id));
  console.log('rows parsed from SQL:', rows.length, '| to restore:', toRestore.length);
  if (!toRestore.length) process.exit(0);
  const { data, error } = await supabase.from('products').insert(toRestore).select('id');
  if (error) { console.error('RESTORE FAILED:', error.message); process.exit(1); }
  console.log('restored:', data.length);
  const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
  console.log('products now in supabase:', count);
})();