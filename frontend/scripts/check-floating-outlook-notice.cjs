const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const source = fs.readFileSync(path.join(__dirname, '../src/pages/crm/components/FloatingOutlookNotice.tsx'), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
let dependencies, cleanup, currentTime = 0, nextTimer = 0;
const timers = new Map();
global.document = { body: { marker: 'document-body' } };
global.window = { setTimeout: (callback, ms) => { const id = ++nextTimer; timers.set(id, { callback, at: currentTime + ms }); return id; }, clearTimeout: id => timers.delete(id) };
const mockRequire = name => {
  if (name === 'react') return { useEffect: (effect, deps) => {
    if (!dependencies || deps.some((item, i) => item !== dependencies[i])) { cleanup?.(); cleanup = effect(); dependencies = deps; }
  } };
  if (name === 'react-dom') return { createPortal: (children, target) => ({ children, target }) };
  return require(name);
};
const loaded = {}; new Function('require', 'exports', output)(mockRequire, loaded);
let closed = 0, actionCount = 0;
const close = () => { closed++; };
const notice = { message: 'Preparando correo' };
const action = React.createElement('button', { onClick: () => { actionCount++; } }, 'Abrir Outlook Classic');
const render = (key = notice) => loaded.FloatingOutlookNotice({ resetKey: key, onClose: close, children: action });
const tick = ms => { currentTime += ms; for (const [id, timer] of [...timers]) if (timer.at <= currentTime) { timers.delete(id); timer.callback(); } };
let result = render();
assert.equal(result.target, document.body);
const html = renderToStaticMarkup(result.children);
for (const value of ['fixed', 'bottom-4', 'max-h-[50dvh]', 'overflow-y-auto', 'dark:bg-surface-card-dark', 'aria-live="polite"']) assert.ok(html.includes(value), value);
assert.ok(!html.includes('inset-0'));
assert.equal(result.children.props.children, action);
action.props.onClick(); assert.equal(actionCount, 1);
tick(9999); assert.equal(closed, 0);
render(); // An unrelated rerender must not extend the deadline.
tick(1); assert.equal(closed, 1);
const nextNotice = { message: 'Abierto correctamente' };
render(nextNotice); tick(7000); assert.equal(closed, 1);
render({ message: 'Elige un equipo' });
assert.equal(timers.size, 1); // Old timers are cancelled when the message changes.
tick(3000); assert.equal(closed, 1);
tick(7000); assert.equal(closed, 2);
render({ message: 'Otro aviso' }); cleanup();
tick(10000); assert.equal(closed, 2); assert.equal(timers.size, 0);
console.log('PASS: notice renders outside layout, preserves actions, closes at 10s, resets per notice and clears timers on unmount.');
