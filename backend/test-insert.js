const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.products.findFirst();
  if (product) {
    console.log('Adding EMI plans for', product.id);
    await prisma.product_emi_plans.deleteMany({ where: { productId: product.id }});
    await prisma.product_emi_plans.createMany({
      data: [
        {
          id: require('crypto').randomUUID(),
          productId: product.id,
          months: 6,
          downPayment: 2500,
          serviceCharge: 500,
          deliveryCharge: 0,
          minEligibilityAmount: 5000,
          customerVisibility: 'visible'
        },
        {
          id: require('crypto').randomUUID(),
          productId: product.id,
          months: 12,
          downPayment: 1500,
          serviceCharge: 800,
          deliveryCharge: 0,
          minEligibilityAmount: 5000,
          customerVisibility: 'visible'
        }
      ]
    });
    console.log('Inserted successfully!');
  }
}

main().finally(() => prisma.$disconnect());
