const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(name, dependency = {}) {
  const source = fs.readFileSync(path.join(root, name), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', js)(() => dependency, module, module.exports);
  return module.exports;
}
const geo = load('src/utils/geoCoordinates.ts');
const features = JSON.parse(fs.readFileSync(path.join(root, 'src/assets/geo/iberia-provinces.json'), 'utf8')).features;
for (const feature of features) {
  const zone = geo.getTerritoryZone(feature.properties.id) || geo.getTerritoryZone(feature.properties.name);
  assert.ok(zone, `Sin identidad: ${feature.properties.name}`);
  assert.equal(geo.getTerritoryZone(zone.id).id, zone.id);
  if (zone.country === 'ES') assert.equal(zone.name, geo.SPANISH_PROVINCES[zone.id.slice(3)].name);
}
assert.deepEqual(geo.normalizeTerritoryOptions(['Vizcaya', 'Bizkaia', 'VIZCAYA'], 'ES-48'), [{ value: 'ES-48', label: 'Vizcaya' }]);
assert.equal(geo.getTerritoryZone('Girona').name, 'Gerona');
assert.equal(geo.getTerritoryZone('Lleida').name, 'Lérida');
const rows = Array.from({ length: 2005 }, (_, i) => ({ client_id: String(i).padStart(5, '0') }));
const calls = [];
const api = { get: async (url, { params }) => {
  assert.equal(url, '/customers');
  calls.push(params);
  for (const [key, value] of Object.entries({ salesperson: 'S1', clientType: 'A', paymentTerms: '30', shipmentMethod: 'P' })) assert.equal(params[key], value);
  return { data: { data: rows.slice(params.skip, params.skip + params.take), total: rows.length, summary: {} } };
} };
const customers = load('src/api/customers.ts', api);
async function main() {
  const result = await customers.getAllCustomersForMap({ salesperson: 'S1', clientType: 'A', paymentTerms: '30', shipmentMethod: 'P' });
  assert.equal(result.data.length, 2005);
  assert.deepEqual(calls.map(call => call.skip), [0, 1000, 2000]);
  assert.equal(new Set(result.data.map(row => row.client_id)).size, 2005);
  assert.ok(calls.every(call => call.sortBy === 'client_id' && call.sortDir === 'asc'));
  console.log('Correctos: 70 zonas cartográficas, alias en español, selector único y carga de 2005 clientes conservando filtros y sin duplicados.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
