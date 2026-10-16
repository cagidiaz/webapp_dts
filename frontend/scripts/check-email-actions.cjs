const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { renderToStaticMarkup } = require('react-dom/server');
const file = path.join(__dirname, '../src/pages/crm/components/EmailActions.tsx');
const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
const loaded = {};
new Function('require', 'exports', output)(require, loaded);
const actions = [];
const data = { activityId: 'activity', subject: 'Exact source' };
const props = { data, isOpen: true, copied: false, preferred: 'web', onToggle() {}, onAction: (action, source) => actions.push([action, source]) };
const tree = loaded.EmailActions(props);
function elements(node) {
  if (!node || typeof node !== 'object') return [];
  const children = [node.props?.children].flat(Infinity);
  return [node, ...children.flatMap(elements)];
}
function text(node) {
  if (typeof node === 'string') return node;
  if (!node || typeof node !== 'object') return '';
  return [node?.props?.children].flat(Infinity).map(text).join('');
}
for (const [label, expected] of [['Responder', 'reply'], ['Responder a todos', 'reply_all'], ['Abrir en Outlook Classic', 'desktop'], ['Abrir en Outlook Web (M365)', 'web']]) {
  const button = elements(tree).find(node => node.type === 'button' && text(node) === label);
  assert.ok(button, label); button.props.onClick();
  assert.deepEqual(actions.at(-1), [expected, data]);
}
const markup = renderToStaticMarkup(tree);
assert.ok(markup.includes('dark:bg-surface-card-dark'));
assert.ok(markup.includes('text-xs'));
assert.ok(markup.includes('Buscar conversación completa'));
assert.ok(markup.includes('Copiar datos de búsqueda'));
assert.equal(elements(loaded.EmailActions({ ...props, isOpen: false })).filter(node => node.type === 'button').length, 2);
console.log('PASS: shared menu keeps styles, separates reply/reply-all and dispatches the selected exact activity and destination.');
