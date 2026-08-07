const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const replacements = [
  { from: /prisma\.user\./g, to: 'prisma.users.' },
  { from: /prisma\.product\./g, to: 'prisma.products.' },
  { from: /prisma\.order\./g, to: 'prisma.orders.' },
  { from: /prisma\.cartItem\./g, to: 'prisma.cart_items.' },
  { from: /prisma\.wishlistItem\./g, to: 'prisma.wishlist_items.' },
  { from: /prisma\.category\./g, to: 'prisma.categories.' },
  { from: /prisma\.brand\./g, to: 'prisma.brands.' },
  { from: /prisma\.banner\./g, to: 'prisma.banners.' },
  { from: /prisma\.emiPlan\./g, to: 'prisma.emi_plans.' },
  { from: /prisma\.emiApplication\./g, to: 'prisma.emi_applications.' },
  { from: /prisma\.emiSchedule\./g, to: 'prisma.emi_schedules.' },
  { from: /prisma\.auditLog\./g, to: 'prisma.audit_log.' },
  { from: /Prisma\.User/g, to: 'Prisma.users' },
  { from: /Prisma\.Product/g, to: 'Prisma.products' },
  { from: /Prisma\.Order/g, to: 'Prisma.orders' },
  { from: /Prisma\.CartItem/g, to: 'Prisma.cart_items' },
  { from: /Prisma\.WishlistItem/g, to: 'Prisma.wishlist_items' },
  { from: /Prisma\.Category/g, to: 'Prisma.categories' },
  { from: /Prisma\.Brand/g, to: 'Prisma.brands' },
  { from: /Prisma\.Banner/g, to: 'Prisma.banners' },
  { from: /Prisma\.EmiPlan/g, to: 'Prisma.emi_plans' },
  { from: /Prisma\.EmiApplication/g, to: 'Prisma.emi_applications' },
  { from: /Prisma\.EmiSchedule/g, to: 'Prisma.emi_schedules' },
  { from: /Prisma\.AuditLog/g, to: 'Prisma.audit_log' },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      for (const replacement of replacements) {
        if (content.match(replacement.from)) {
          content = content.replace(replacement.from, replacement.to);
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(directoryPath);
console.log('Done refactoring basic Prisma models.');
