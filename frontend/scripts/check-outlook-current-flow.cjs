const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const apiSource = fs.readFileSync(path.join(root, 'src/api/exchangeSync.ts'), 'utf8');
const output = ts.transpileModule(apiSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loaded = {};
new Function('require', 'exports', output)(() => ({}), loaded);
const calls = [];
global.window = { open: (...args) => { calls.push(args); } };
loaded.searchConversationInOutlook({ email: 'sender@test.invalid', subject: '[Recibido] Re: Oferta especial' });
assert.equal(calls.length, 1);
const url = new URL(calls[0][0]);
assert.equal(url.origin, 'https://outlook.office.com');
assert.equal(url.pathname, '/mail/search');
assert.equal(url.searchParams.get('q'), 'from:sender@test.invalid subject:"Oferta especial"');
assert.equal(loaded.openExistingEmailInOutlook, undefined);
assert.equal(loaded.replyInOutlook, undefined);
assert.equal(loaded.markOutlookProtocolInstalled, undefined);
function walk(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(tsx?|js|vbs|bat|reg)$/.test(entry.name)) assert.ok(!fs.readFileSync(file, 'utf8').includes('dts-mail'), `Legacy protocol remains: ${file}`);
  }
}
walk(path.join(root, 'src'));
walk(path.join(root, 'public'));
const settings = fs.readFileSync(path.join(root, 'src/pages/settings/SettingsPage.tsx'), 'utf8');
assert.ok(settings.includes('href="/downloads/outlook-classic/OutlookClassic.zip"'));
assert.ok(settings.includes('to="/outlook-classic"'));
assert.ok(!settings.includes('downloadOutlookClassicInstaller'));
const packageInfo = JSON.parse(fs.readFileSync(path.join(root, 'public/downloads/outlook-classic/package.json'), 'utf8'));
assert.equal(packageInfo.version, '1.1.1');
assert.equal(packageInfo.file, 'dTS.OutlookClassic.exe');
console.log('PASS: conversation search remains in Web; legacy API and protocol absent; Settings links to current installer and pairing.');

// Exercise the Settings click handler: Classic must never invoke the composition API.
const handler = settings.match(/const handleTestOutlookOpening = \(\) => \{([\s\S]*?)\n  \};/)[1];
let launchClicks = 0, removed = 0, composed = 0;
const webLaunches = [];
global.window = { open: (...args) => webLaunches.push(args) };
global.document = { body: { appendChild() {} }, createElement: () => ({ style: {}, href: '', click() { assert.equal(this.href, 'dts-outlook://v1/launch'); launchClicks++; }, remove() { removed++; } }) };
function testClick(preferredOutlook) {
  new Function('preferredOutlook', 'document', 'openInOutlook', 'profile', handler)(preferredOutlook, document, () => { composed++; }, { email: 'test@test.invalid' });
}
testClick('desktop');
assert.equal(launchClicks, 1); assert.equal(removed, 1); assert.equal(composed, 0);
testClick('web');
assert.equal(launchClicks, 1); assert.equal(composed, 0);
assert.deepEqual(webLaunches, [['https://outlook.office.com/mail/inbox', '_blank', 'noopener,noreferrer']]);
console.log('PASS: Settings Classic launch does not compose; Web opens inbox directly without composing.');
