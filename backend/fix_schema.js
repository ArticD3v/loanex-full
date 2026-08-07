const fs = require('fs');
const schemaPath = './prisma/schema.prisma';
let content = fs.readFileSync(schemaPath, 'utf8');

// Remove @map from any line containing a relation array `[]`
content = content.replace(/(\w+)\s+(\w+)\[\]\s+@map\("[^"]+"\)/g, '$1 $2[]');

// Remove @map from any line containing a relation optional `?`
content = content.replace(/(\w+)\s+(\w+)\?\s+@map\("[^"]+"\)/g, '$1 $2?');

// Remove @map from any line containing `@relation`
content = content.replace(/(\w+)\s+(\w+)\s+@map\("[^"]+"\)\s+@relation/g, '$1 $2 @relation');

// Fix indices
content = content.replace(/@@index\(\[userId\]\)/g, '@@index([user_id])');
content = content.replace(/@@unique\(\[userId, phone\]/g, '@@unique([user_id, phone]');
content = content.replace(/@@index\(\[userId, createdAt\]/g, '@@index([user_id, created_at]');
content = content.replace(/@@unique\(\[userId, clientId\]/g, '@@unique([user_id, client_id]');
content = content.replace(/@@index\(\[userId, grantedAt\(sort: Desc\)\]/g, '@@index([user_id, granted_at(sort: Desc)]');
content = content.replace(/@@index\(\[relatesTo\]/g, '@@index([relates_to]');
content = content.replace(/@@index\(\[tokenHash\]/g, '@@index([token_hash]');
content = content.replace(/@@index\(\[createdAt\(sort: Desc\)\]/g, '@@index([created_at(sort: Desc)]');
content = content.replace(/@@index\(\[forEmail\]/g, '@@index([for_email]');
content = content.replace(/@@index\(\[notAfter\(sort: Desc\)\]/g, '@@index([not_after(sort: Desc)]');
content = content.replace(/@@index\(\[oauthClientId\]/g, '@@index([oauth_client_id]');
content = content.replace(/@@index\(\[entityType, entityId\]/g, '@@index([entity_type, entity_id]');

fs.writeFileSync(schemaPath, content, 'utf8');
console.log('Fixed schema.prisma');
