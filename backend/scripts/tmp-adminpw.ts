import { getMongoDb } from '../src/config/mongo';
import { hashPassword } from '../src/common/utils/password';
async function main() {
  const db = await getMongoDb();
  const admin = await db.collection('users').findOne({ email: 'admin@loanex.com' });
  if (!admin) { console.error('admin not found'); process.exit(1); }
  const hash = await hashPassword('Admin@123');
  await db.collection('users').updateOne({ id: admin.id }, { $set: { encryptedPassword: hash } });
  console.log('admin password reset for', admin.id);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
