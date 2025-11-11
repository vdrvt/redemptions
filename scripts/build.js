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

['index.html', 'landing.html', 'landing-gtm.html', 'landing-bur.html', 'checkout-gtm.html', 'checkout-bur.html', 'checkout', 'assets'].forEach((item) => {
  copyRecursive(path.join(ROOT, item), path.join(DIST, item));
});

const PUBLIC_DIR = path.join(ROOT, 'public');
if (fs.existsSync(PUBLIC_DIR)) {
  fs.readdirSync(PUBLIC_DIR).forEach((entry) => {
    const sourcePath = path.join(PUBLIC_DIR, entry);
    const stats = fs.statSync(sourcePath);
    if (stats.isDirectory()) {
      copyRecursive(sourcePath, path.join(DIST, entry));
    } else {
      fs.copyFileSync(sourcePath, path.join(DIST, entry));
    }
  });
}

console.log('Build complete. Files written to dist/. Secrets remain server-side.');

