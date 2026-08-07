const fs = require('fs');

const schemaPath = './prisma/schema.prisma';
let content = fs.readFileSync(schemaPath, 'utf8');

// Function to convert snake_case to camelCase
function toCamelCase(str) {
  return str.replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''));
}

// Regex to find field definitions in prisma model
// Matches: 
// start of line spaces (1)
// field name (2)
// spaces (3)
// field type (4)
// other decorators (5)
const fieldRegex = /^(\s+)([a-z_][a-z0-9_]+)(\s+)([A-Za-z0-9_]+(\[\]|\?)?)(\s+.*)?$/gm;

let modifiedContent = content.replace(fieldRegex, (match, space1, fieldName, space2, fieldType, brackets, decorators) => {
  if (fieldName.includes('_')) {
    const camelName = toCamelCase(fieldName);
    // Don't map if it's already camelCase or no underscore
    if (camelName !== fieldName) {
       // Insert @map("fieldName") before other decorators
       const extra = decorators || '';
       return `${space1}${camelName}${space2}${fieldType} @map("${fieldName}")${extra}`;
    }
  }
  return match;
});

// Also replace relations arrays like fields: [user_id] to fields: [userId]
modifiedContent = modifiedContent.replace(/fields:\s*\[([^\]]+)\]/g, (match, fieldsStr) => {
  const mappedFields = fieldsStr.split(',').map(f => toCamelCase(f.trim())).join(', ');
  return `fields: [${mappedFields}]`;
});

// Also replace @@index([user_id]) to @@index([userId])
modifiedContent = modifiedContent.replace(/@@index\(\[([^\]]+)\]/g, (match, fieldsStr) => {
  const mappedFields = fieldsStr.split(',').map(f => {
    let parts = f.trim().split(' ');
    parts[0] = toCamelCase(parts[0]);
    return parts.join(' ');
  }).join(', ');
  return `@@index([${mappedFields}]`;
});

// Also replace @@unique([provider_id, provider])
modifiedContent = modifiedContent.replace(/@@unique\(\[([^\]]+)\]/g, (match, fieldsStr) => {
  const mappedFields = fieldsStr.split(',').map(f => toCamelCase(f.trim())).join(', ');
  return `@@unique([${mappedFields}]`;
});

fs.writeFileSync(schemaPath, modifiedContent, 'utf8');
console.log('Schema converted to camelCase fields.');
