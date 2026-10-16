// Receives only ephemeral self-test data; never prints capabilities or private keys.
const { createPublicKey } = require('node:crypto');
const { classicPublicKey, classicProofText, verifyClassicSignature } = require('../backend/dist/modules/exchange-sync/classic-proof');
let input = '';
process.stdin.on('data', value => input += value);
process.stdin.on('end', () => {
  try {
    const value = JSON.parse(input);
    if (value.status !== 'PASS' || value.registryModified !== false || value.mailOpened !== false) throw new Error();
    const key = classicPublicKey(value.n, value.e);
    createPublicKey(key.pem);
    verifyClassicSignature(key.pem, value.canonical, value.signature);
    const request = '00000000-0000-4000-8000-000000000001';
    verifyClassicSignature(key.pem, classicProofText('claim', request, value.claimProof), value.claimProof.signature);
    verifyClassicSignature(key.pem, classicProofText('result', request, value.resultProof, 'opened', value.clientNonce), value.resultProof.signature);
    console.log('PASS: protocolo, DPAPI y firmas nativas de vinculación, consumo y resultado verificadas por el contrato del backend.');
  } catch { console.error('FAIL: contrato criptográfico nativo/backend'); process.exitCode = 1; }
});
