// Runs during Netlify build to inject environment variables into Angular's
// environment.prod.ts before `ng build --configuration production` executes.
const fs   = require('fs');
const path = require('path');

const scriptUrl   = process.env['SHEETS_SCRIPT_URL']   || '';
const secretToken = process.env['SHEETS_SECRET_TOKEN'] || '';

const content = `export const environment = {
  production: true,
  sheetsScriptUrl: '${scriptUrl}',
  sheetsSecretToken: '${secretToken}',
};
`;

const outPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
fs.writeFileSync(outPath, content, 'utf8');

console.log('[set-env] environment.prod.ts written');
console.log('[set-env] sheetsScriptUrl set:',   scriptUrl   ? 'YES' : 'NO (empty)');
console.log('[set-env] sheetsSecretToken set:',  secretToken ? 'YES' : 'NO (empty)');
