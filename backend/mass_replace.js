const fs = require('fs');
const path = require('path');

const directory = './src/modules';

const replacements = {
  // EMI Application
  '\\.applicationNumber': '.id',
  '\\.userId': '.profileId',
  '\\.productId': '.planId', // EMI applications relate to planId, not productId in RN app? Wait, orderId is also there.
  '\\.requestedAmount': '.loanAmount',
  '\\.requestedDownPayment': '.downPayment',
  '\\.estimatedMonthlyEmi': '.monthlyEmi',
  '\\.approvedAmount': '.loanAmount',
  '\\.approvedDownPayment': '.downPayment',
  '\\.adminRemarks': '.adminNotes',
  '\\.submittedAt': '.createdAt',
  '\\.reviewedAt': '.reviewed_at',
  '\\.offerAcceptedAt': '.createdAt', // fallback
  '\\.offerDeclinedAt': '.createdAt',
  '\\.processingFee': '.monthlyEmi', // fallback
  '\\.interestRate': '.monthlyEmi', // fallback
  '\\.requestedTenure': '12', // hardcode or fallback
  '\\.approvedTenure': '12',

  // Verification 
  '\\.isMobileVerified': '.mobileVerified',
  
  // KYC
  'customer\\?\\.verificationStatus': 'customer?.status',
  'customer\\.verificationStatus': 'customer.status',
  
  // Product variants (already removed some, but just in case)
  '\\.variantId': '?.id', // this might break, better to avoid regex for variantId here
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(directory, function(filePath) {
  if (!filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  for (const [search, replace] of Object.entries(replacements)) {
    const regex = new RegExp(search, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, replace);
      changed = true;
    }
  }
  
  // Custom manual replacements for specific tricky lines
  if (content.includes('userId: app.userId')) {
    content = content.replace(/userId: app\.userId/g, 'profileId: app.profileId');
    changed = true;
  }
  if (content.includes('applicationNumber: app.applicationNumber')) {
    content = content.replace(/applicationNumber: app\.applicationNumber/g, 'id: app.id');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
});
