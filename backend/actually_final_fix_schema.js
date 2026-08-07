const fs = require('fs');
const schemaPath = './prisma/schema.prisma';
let content = fs.readFileSync(schemaPath, 'utf8');

// Fix the malformed @map due to question marks
// From `DateTime @map("created_at")?` to `DateTime? @map("created_at")`
content = content.replace(/([A-Za-z]+)\s+@map\("([^"]+)"\)\?/g, '$1? @map("$2")');

// Wait, I missed mapping some createdAt and updatedAt fields because they were already optional, 
// and `map_common_fields.js` didn't catch them.
// Let's do a safe global rename of snake_case basic fields to camelCase
const snakeToCamel = {
  'user_id': 'userId',
  'client_id': 'clientId',
  'created_at': 'createdAt',
  'granted_at': 'grantedAt',
  'relates_to': 'relatesTo',
  'entity_type': 'entityType',
  'entity_id': 'entityId',
  'provider_id': 'providerId',
  'oauth_client_id': 'oauthClientId',
  'product_id': 'productId',
  'plan_id': 'planId',
  'profile_id': 'profileId',
  'category_id': 'categoryId',
  'updated_at': 'updatedAt',
  'variant_id': 'variantId',
  'application_id': 'applicationId',
  'attribute_id': 'attributeId',
  'value_id': 'valueId'
};

// First, fix the field definitions.
for (const [snake, camel] of Object.entries(snakeToCamel)) {
  // We want to match: `  user_id    String?   @db.Uuid`
  // Ensure we don't double map if @map is already there
  const regex = new RegExp(`^(\\s+)${snake}(\\s+)([A-Za-z]+\\??)(\\s+)(?!@map)(.*)$`, 'gm');
  content = content.replace(regex, `$1${camel}$2$3 @map("${snake}")$4$5`);
}

// Then, fix @@index and @@unique
content = content.replace(/@@(index|unique)\(\[([^\]]+)\](.*)\)/g, (match, type, fields, rest) => {
  let newFields = fields;
  for (const [snake, camel] of Object.entries(snakeToCamel)) {
    newFields = newFields.replace(new RegExp(`\\b${snake}\\b`, 'g'), camel);
  }
  return `@@${type}([${newFields}]${rest})`;
});

// And @relation fields:
content = content.replace(/fields:\s*\[([^\]]+)\]/g, (match, fields) => {
  let newFields = fields;
  for (const [snake, camel] of Object.entries(snakeToCamel)) {
    newFields = newFields.replace(new RegExp(`\\b${snake}\\b`, 'g'), camel);
  }
  return `fields: [${newFields}]`;
});

fs.writeFileSync(schemaPath, content, 'utf8');
console.log('Fixed question marks and indices');
