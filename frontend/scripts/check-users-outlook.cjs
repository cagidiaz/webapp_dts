const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { renderToStaticMarkup } = require('react-dom/server');
const file = path.join(__dirname, '../src/pages/users/OutlookLinksTab.tsx');
const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const users = [{ id: 'user', email: 'antoni@test.invalid', firstName: 'Antoni', lastName: 'Ciurans', role: 'TESTER', isActive: true,
  microsoft365: { status: 'REGISTERED', email: 'antoni@test.invalid', lastSyncedAt: null }, devices: [
    { id: 'one', label: '<Equipo comercial>', status: 'PAIRED', pairedAt: '2026-10-19T12:00:00Z', revokedAt: null, version: '1.1.0', lastSeenAt: null },
    { id: 'old', label: 'Equipo anterior', status: 'REVOKED', pairedAt: '2026-10-16T12:00:00Z', revokedAt: '2026-10-19T12:00:00Z', version: '1.0.0', lastSeenAt: null }] },
  { id: 'none', email: 'sin-buzon@test.invalid', firstName: null, lastName: null, role: null, isActive: false,
    microsoft365: { status: 'NOT_CONNECTED', email: null, lastSyncedAt: null }, devices: [] }];
let state = [], cursor = 0, mutationOptions, queryOptions, pending = false, queryError = null;
const calls = [], invalidations = [];
const query = { data: users, isFetching: false, isLoading: false, error: null, refetch: () => calls.push('refresh') };
const hooks = { useState: initial => { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = value; }]; }, useMemo: fn => fn() };
const requireMock = name => {
  if (name === 'react') return hooks;
  if (name === '@tanstack/react-query') return { keepPreviousData: value => value,
    useQueryClient: () => ({ invalidateQueries: async ({ queryKey }) => invalidations.push(queryKey) }),
    useQuery: options => { queryOptions = options; return { ...query, error: queryError }; },
    useMutation: options => { mutationOptions = options; return { isPending: pending, variables: 'one', mutate: id => calls.push(id) }; } };
  if (name.includes('authStore')) return { useAuthStore: select => select({ profile: { id: 'admin' } }) };
  if (name.includes('usersOutlook')) return {};
  return require(name);
};
const loaded = {}; new Function('require', 'exports', output)(requireMock, loaded);
const render = () => { cursor = 0; return loaded.OutlookLinksTab(); };
function nodes(node) { return !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]; }
function text(node) { return typeof node === 'string' ? node : !node || typeof node !== 'object' ? '' : [node.props?.children].flat(Infinity).map(text).join(''); }
async function main() {
  let tree = render(); let html = renderToStaticMarkup(tree);
  assert.ok(html.includes('Antoni Ciurans')); assert.ok(html.includes('Sin equipos vinculados'));
  assert.ok(html.includes('Vigente')); assert.ok(html.includes('Revocada'));
  assert.ok(html.includes('Sin uso registrado')); assert.ok(html.includes('no indica que el ordenador esté encendido'));
  assert.ok(html.includes('&lt;Equipo comercial&gt;')); assert.ok(!html.includes('<Equipo comercial>'));
  assert.ok(html.includes('dark:bg-surface-card-dark')); assert.ok(html.includes('overflow-x-auto'));
  assert.deepEqual(queryOptions.queryKey, ['usersOutlookLinks', 'admin']);
  assert.equal(queryOptions.placeholderData(users, { queryKey: ['usersOutlookLinks', 'another-admin'] }), undefined);
  assert.equal(queryOptions.placeholderData(users, { queryKey: ['usersOutlookLinks', 'admin'] }), users);
  const revoke = nodes(tree).find(node => node.type === 'button' && text(node) === 'Revocar');
  let confirmation;
  global.window = { confirm: message => { confirmation = message; return false; } };
  revoke.props.onClick(); assert.equal(calls.length, 0);
  window.confirm = message => { confirmation = message; return true; };
  revoke.props.onClick(); assert.deepEqual(calls, ['one']);
  assert.ok(confirmation.includes('antoni@test.invalid')); assert.ok(confirmation.includes('No elimina correos'));
  pending = true; tree = render();
  assert.ok(nodes(tree).find(node => node.type === 'button' && text(node) === 'Revocando…').props.disabled);
  pending = false;
  await mutationOptions.onSuccess();
  assert.deepEqual(invalidations[0], ['usersOutlookLinks']);
  assert.ok(renderToStaticMarkup(render()).includes('Vinculación revocada'));
  tree = render(); nodes(tree).find(node => node.type === 'input').props.onChange({ target: { value: 'sin-buzon' } });
  html = renderToStaticMarkup(render()); assert.ok(!html.includes('Antoni Ciurans')); assert.ok(html.includes('sin-buzon@test.invalid'));
  state[0] = ''; state[2] = 'REVOKED';
  html = renderToStaticMarkup(render()); assert.ok(html.includes('Equipo anterior')); assert.ok(!html.includes('&lt;Equipo comercial&gt;'));
  state[2] = 'NONE'; html = renderToStaticMarkup(render()); assert.ok(html.includes('Sin equipos vinculados')); assert.ok(!html.includes('Antoni Ciurans'));
  state[2] = 'ALL'; state[1] = 'REGISTERED'; html = renderToStaticMarkup(render()); assert.ok(html.includes('Antoni Ciurans')); assert.ok(!html.includes('sin-buzon@test.invalid'));
  queryError = new Error('Forbidden'); html = renderToStaticMarkup(render()); assert.ok(html.includes('No se pudieron consultar')); assert.ok(!html.includes('Antoni Ciurans'));
  console.log('PASS: admin Outlook tab filters, connection/device states, safe rendering, confirmation, revocation, errors and actor-scoped cache.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
