const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const kyc = await prisma.customer_kyc.findMany();
  console.log(JSON.stringify(kyc, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
