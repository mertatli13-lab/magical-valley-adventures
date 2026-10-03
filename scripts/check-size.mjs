// Adds up what the first load downloads from dist/ and fails if it is over the budget.
// Not counted: files loaded later on purpose (the shop code, accessory models, music).
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const BUDGET_MB = 15;
const LATER = [/^assets\/Shop-/, /^models\/accessories\//, /^audio\/music-/, /README\.md$/];

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

let first = 0;
let later = 0;
for (const path of files('dist')) {
  const name = relative('dist', path).replaceAll('\\', '/');
  const size = statSync(path).size;
  if (LATER.some((pattern) => pattern.test(name))) later += size;
  else first += size;
}
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2);
console.log(`First load: ${mb(first)} MB of ${BUDGET_MB} MB (loaded later: ${mb(later)} MB)`);
if (first > BUDGET_MB * 1024 * 1024) {
  console.error('Over the first-load budget. Run `npm run optimize:models` and check textures and audio sizes.');
  process.exit(1);
}
