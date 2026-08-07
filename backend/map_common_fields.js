const fs = require('fs');
const schemaPath = './prisma/schema.prisma';
let content = fs.readFileSync(schemaPath, 'utf8');

const fieldsToMap = [
  'user_id', 'product_id', 'order_id', 'plan_id', 'profile_id', 'category_id',
  'created_at', 'updated_at', 'variant_id', 'is_active', 'application_id', 'attribute_id', 'value_id'
];

function toCamelCase(str) {
  return str.replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''));
}

for (const field of fieldsToMap) {
  const camelName = toCamelCase(field);
  // Match `  user_id String ` etc.
  const regex = new RegExp(`^(\\s+)${field}(\\s+)(String|DateTime|Boolean|Int|Float|Json)(.*)$`, 'gm');
  content = content.replace(regex, `$1${camelName}$2$3 @map("${field}")$4`);
  
  // Also fix relations e.g. fields: [user_id] -> fields: [userId]
  const relRegex = new RegExp(`fields:\\s*\\[([^\\]]*)\\b${field}\\b([^\\]]*)\\]`, 'g');
  content = content.replace(relRegex, `fields: [$1${camelName}$2]`);

  // Fix indices
  const idxRegex = new RegExp(`@@(index|unique)\\(\\[([^\\]]*)\\b${field}\\b([^\\]]*)\\](.*)\\)`, 'g');
  content = content.replace(idxRegex, `@@$1([$2${camelName}$3]$4)`);
}

fs.writeFileSync(schemaPath, content, 'utf8');
console.log('Mapped common fields.');
