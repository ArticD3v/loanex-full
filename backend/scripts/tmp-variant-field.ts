import { getMongoDb } from '../src/config/mongo';
async function main() {
  const db = await getMongoDb();
  const p = await db.collection('products').findOne({ id: '8d25276c-d24a-44dd-9c9d-ff8367cfe602' });
  console.log('has productVariants:', Array.isArray(p.productVariants));
  console.log('has product_variants:', Array.isArray(p.product_variants));
  console.log('has variants:', Array.isArray(p.variants));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
