const fs = require('fs');
const schemaPath = './prisma/schema.prisma';
let content = fs.readFileSync(schemaPath, 'utf8');

function toCamelCase(str) {
  return str.replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''));
}

// 1. Ensure all `user_id` fields are properly mapped to `userId`
// Wait, the previous script `map_common_fields.js` already added `@map("user_id")` and made the field `userId`.
// So the field IS `userId` in the schema.
// We just need to fix the `fields: [user_id]` inside `@relation` and `@@index([user_id])`.
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

for (const [snake, camel] of Object.entries(snakeToCamel)) {
  // Fix @relation(fields: [user_id]) to fields: [userId]
  const relRegex = new RegExp(`fields:\\s*\\[([^\\]]*)\\b${snake}\\b([^\\]]*)\\]`, 'g');
  content = content.replace(relRegex, `fields: [$1${camel}$2]`);

  // Fix @@index([user_id]) to @@index([userId])
  const idxRegex = new RegExp(`@@(index|unique)\\(\\[([^\\]]*)\\b${snake}\\b([^\\]]*)\\](.*)\\)`, 'g');
  content = content.replace(idxRegex, `@@$1([$2${camel}$3]$4)`);
  
  // Fix nested @@index([user_id, created_at]) since one replacement pass might miss the second field if overlapping.
  // Actually, we can just replace all occurrences of `snake` inside the brackets of @@index and @@unique.
  // A safer way is to find all @@index([...]) and replace inside.
}

// Ensure fields that are still snake_case (like oauth_client_id) get mapped to camelCase.
// In the error, "fields must refer only to existing fields. The following fields do not exist: userId" 
// wait! If it says "userId" doesn't exist, it means the FIELD is still "user_id"!
// Why is the field still "user_id"?
// Let's ensure the scalar fields are mapped.
for (const [snake, camel] of Object.entries(snakeToCamel)) {
  const fieldRegex = new RegExp(`^(\\s+)${snake}(\\s+)(String|DateTime|Boolean|Int|Float|Json|Json\\?|String\\?|DateTime\\?|Boolean\\?|Int\\?|Float\\?)(.*)$`, 'gm');
  content = content.replace(fieldRegex, `$1${camel}$2$3 @map("${snake}")$4`);
}

// Run replacement on @@index and @@unique again just to be safe
content = content.replace(/@@(index|unique)\(\[([^\]]+)\](.*)\)/g, (match, type, fields, rest) => {
  let newFields = fields;
  for (const [snake, camel] of Object.entries(snakeToCamel)) {
    newFields = newFields.replace(new RegExp(`\\b${snake}\\b`, 'g'), camel);
  }
  return `@@${type}([${newFields}]${rest})`;
});

content = content.replace(/fields:\s*\[([^\]]+)\]/g, (match, fields) => {
  let newFields = fields;
  for (const [snake, camel] of Object.entries(snakeToCamel)) {
    newFields = newFields.replace(new RegExp(`\\b${snake}\\b`, 'g'), camel);
  }
  return `fields: [${newFields}]`;
});


fs.writeFileSync(schemaPath, content, 'utf8');
console.log('Fixed final schema issues');
