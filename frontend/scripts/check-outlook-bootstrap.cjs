const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/outlook-bootstrap.js'), 'utf8');

function boot(route, hosted = true) {
  const scripts = [], timers = new Map();
  const replaceState = () => {}, pushState = () => {};
  const window = {
    location: { pathname: route, search: '' },
    history: { replaceState, pushState },
  };
  window.self = window; window.top = hosted ? {} : window;
  vm.runInNewContext(source, {
    window, Promise, Error, Boolean,
    document: { createElement: () => ({}), head: { appendChild: script => scripts.push(script) } },
    setTimeout: callback => { timers.set(1, callback); return 1; },
    clearTimeout: id => timers.delete(id),
  });
  return { window, scripts, timers, replaceState, pushState };
}

async function main() {
  for (const route of ['/dashboard', '/settings', '/outlook-classic']) {
    const test = boot(route);
    assert.equal(test.scripts.length, 0);
    assert.equal(test.window.__dtsOfficeReady, undefined);
  }
  const preview = boot('/outlook-crm', false);
  assert.equal(await preview.window.__dtsOfficeReady, null);
  assert.equal(preview.scripts.length, 0);
  for (const route of ['/outlook-crm', '/outlook-addin', '/outlook-addin/']) {
    const test = boot(route);
    assert.equal(test.scripts.length, 1);
    assert.equal(test.scripts[0].src, 'https://appsforoffice.microsoft.com/lib/1/hosted/office.js');
    // Office can clear History API methods; the SPA must retain them.
    test.window.history.replaceState = null; test.window.history.pushState = null;
    let finishReady, calls = 0;
    test.window.Office = { onReady: () => { calls++; return new Promise(resolve => { finishReady = resolve; }); } };
    test.scripts[0].onload();
    assert.equal(calls, 1, 'Handshake starts without any CRM session or login');
    assert.equal(test.window.history.replaceState, test.replaceState);
    assert.equal(test.window.history.pushState, test.pushState);
    finishReady({ host: 'Outlook', platform: 'OfficeOnline' });
    assert.equal((await test.window.__dtsOfficeReady).host, 'Outlook');
    assert.equal(test.timers.size, 0);
  }
  const blocked = boot('/outlook-crm');
  blocked.scripts[0].onerror();
  await assert.rejects(blocked.window.__dtsOfficeReady, /OFFICE_SCRIPT_UNAVAILABLE/);
  const timeout = boot('/outlook-crm');
  timeout.timers.get(1)();
  await assert.rejects(timeout.window.__dtsOfficeReady, /OFFICE_READY_TIMEOUT/);
  const rejected = boot('/outlook-crm');
  rejected.window.Office = { onReady: () => Promise.reject(new Error('host-unavailable')) };
  rejected.scripts[0].onload();
  await assert.rejects(rejected.window.__dtsOfficeReady, /host-unavailable/);
  console.log('PASS: early Office handshake without CRM session, History API preserved, preview isolated, blocked/timeout handled and normal routes unchanged.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
