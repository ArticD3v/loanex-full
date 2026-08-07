const fs = require('fs');
const log = fs.readFileSync('tsc_errors_step4.log', 'utf8');
const lines = log.split('\n');

const files = {};
let totalErrors = 0;

for (const line of lines) {
  const match = line.match(/^([a-zA-Z0-9_\-\/\.]+)\(\d+,\d+\): error TS/);
  if (match) {
    const file = match[1];
    files[file] = (files[file] || 0) + 1;
    totalErrors++;
  }
}

console.log(`Total Errors: ${totalErrors}`);
console.log('Errors per file:');
const sorted = Object.entries(files).sort((a, b) => b[1] - a[1]);
for (const [file, count] of sorted) {
  console.log(`${count.toString().padStart(4, ' ')} ${file}`);
}
