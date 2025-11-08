const fs = require('fs');
const path = require('path');

const BONDAI_API_URL = process.env.BONDAI_API_URL;
const BONDAI_API_KEY = process.env.BONDAI_API_KEY;

if (!BONDAI_API_URL || !BONDAI_API_KEY) {
  console.error('Missing BONDAI_API_URL or BONDAI_API_KEY environment variables.');
  process.exit(1);
}

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((entry) => {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

['landing.html', 'checkout', 'assets'].forEach((item) => {
  copyRecursive(path.join(ROOT, item), path.join(DIST, item));
});

const checkoutPath = path.join(DIST, 'checkout', 'index.html');
let html = fs.readFileSync(checkoutPath, 'utf8');

html = html
  .replace(/__BONDAI_API_URL__/g, BONDAI_API_URL)
  .replace(/__BONDAI_API_KEY__/g, BONDAI_API_KEY);

fs.writeFileSync(checkoutPath, html, 'utf8');

console.log('Build complete. Files written to dist/.');

