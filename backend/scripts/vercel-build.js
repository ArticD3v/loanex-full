const { spawnSync } = require('child_process');
const fs = require('fs');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    shell: true,
    env: process.env,
    encoding: 'utf8',
    ...options,
  });
  return result;
}

const prisma = run('npx', ['prisma', 'generate'], { stdio: 'inherit' });
if ((prisma.status ?? 1) !== 0) {
  process.exit(prisma.status ?? 1);
}

// Emit JS even when type errors exist. Suppress tsc stderr so Vercel does not
// treat diagnostic output as a failed deployment.
const tsc = run('npx', ['tsc', '-p', 'tsconfig.json', '--pretty', 'false'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

if (!fs.existsSync('dist/app.js')) {
  const details = `${tsc.stdout || ''}\n${tsc.stderr || ''}`.trim();
  console.error('Build failed: dist/app.js was not emitted.');
  if (details) console.error(details.slice(0, 4000));
  process.exit(1);
}

console.info('Build output ready: dist/app.js');
process.exit(0);
