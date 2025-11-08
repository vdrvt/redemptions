const fs = require('fs');
const path = require('path');

const BONDAI_API_URL = process.env.BONDAI_API_URL;
const BONDAI_API_KEY = process.env.BONDAI_API_KEY;

if (!BONDAI_API_URL || !BONDAI_API_KEY) {
  console.error('Missing BONDAI_API_URL or BONDAI_API_KEY environment variables.');
  process.exit(1);
}

const target = path.join(__dirname, '..', 'checkout', 'index.html');

let fileContents = fs.readFileSync(target, 'utf8');

fileContents = fileContents
  .replace(/__BONDAI_API_URL__/g, BONDAI_API_URL)
  .replace(/__BONDAI_API_KEY__/g, BONDAI_API_KEY);

fs.writeFileSync(target, fileContents, 'utf8');

console.log('Injected BONDAI environment values into checkout/index.html');

