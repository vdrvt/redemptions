const fs = require('fs');
const path = require('path');

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

console.log('Build complete. Files written to dist/. Secrets remain server-side.');

