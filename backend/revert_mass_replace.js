const fs = require('fs');
const path = require('path');

const directory = './src/modules';

const replacements = {
  // Revert EMI Application
  '\\.id': '.applicationNumber', // DANGEROUS! Will change app.id to app.applicationNumber!
  '\\.profileId': '.userId',
  '\\.planId': '.productId',
  '\\.loanAmount': '.requestedAmount',
  '\\.downPayment': '.requestedDownPayment',
  '\\.monthlyEmi': '.estimatedMonthlyEmi',
  '\\.adminNotes': '.adminRemarks',
  // submittedAt was changed to createdAt, so reverting createdAt to submittedAt will break actual createdAt!
};

// ... I cannot safely revert using regex!
