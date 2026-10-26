const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const file = path.resolve(__dirname, '../src/utils/euroAmountInput.ts');
const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
new Function('exports', js)(mod.exports);
const parse = mod.exports.parseEuroAmountInput;
for (const [input, expected] of [
  ['', null], [' ', null], ['0', '0.00'], ['12500', '12500.00'], ['12.500,25', '12500.25'],
  ['12.500', '12500.00'], ['12500.25', '12500.25'], ['1 250,5 €', '1250.50'], ['0002,10', '2.10'],
  ['999999999999,99', '999999999999.99'],
]) assert.equal(parse(input), expected, input);
for (const input of ['-5', 'NaN', '1,234', '12.34,50', '1.25.0', '1e6', '1000000000000', 'abc', '€']) {
  assert.throws(() => parse(input), undefined, input);
}
console.log('Correctos: euros españoles y decimales, vacío distinto de cero, límites y rechazo de importes mal formados.');
