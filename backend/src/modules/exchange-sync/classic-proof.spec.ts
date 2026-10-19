import { generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { classicPublicKey, classicProofText, equalClassicSecret, hashClassicSecret, verifyClassicSignature, type ClassicProof } from './classic-proof';
import { ConfigService } from '@nestjs/config';
import { OutlookClassicService } from './outlook-classic.service';

describe('Classic device proof contract', () => {
  const key = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicJwk = key.publicKey.export({ format: 'jwk' });
  const proof = (): ClassicProof => ({ deviceId: '00000000-0000-4000-8000-000000000001', token: randomBytes(32).toString('base64url'), timestamp: String(Date.now()), nonce: randomBytes(32).toString('base64url'), version: '1.0.0', signature: '' });
  it('accepts a device RSA key and verifies a signature bound to the exact operation', () => {
    const parsed = classicPublicKey(publicJwk.n!, publicJwk.e!);
    const text = classicProofText('claim', 'request', proof());
    const signature = sign('RSA-SHA256', Buffer.from(text), key.privateKey).toString('base64url');
    expect(() => verifyClassicSignature(parsed.pem, text, signature)).not.toThrow();
    expect(() => verifyClassicSignature(parsed.pem, text.replace('|claim|', '|result|'), signature)).toThrow();
    expect(parsed.fingerprint).toHaveLength(64);
  });
  it.each(['timestamp', 'token', 'nonce', 'version'])('rejects an invalid %s', field => {
    expect(() => classicProofText('claim', 'request', { ...proof(), [field]: 'invalid' })).toThrow();
  });
  it('rejects expired proof timestamps', () => { expect(() => classicProofText('claim', 'request', { ...proof(), timestamp: String(Date.now() - 61000) })).toThrow(); });
  it('does not accept another device private key', () => {
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
    expect(() => verifyClassicSignature(classicPublicKey(publicJwk.n!, publicJwk.e!).pem, 'text', sign('RSA-SHA256', Buffer.from('text'), other.privateKey).toString('base64url'))).toThrow();
  });
  it('compares stored capability hashes without storing the capability', () => {
    const token = randomBytes(32).toString('base64url'); const hash = hashClassicSecret(token);
    expect(hash).not.toContain(token); expect(equalClassicSecret(token, hash)).toBe(true); expect(equalClassicSecret('wrong', hash)).toBe(false);
  });
  it('rejects weak RSA keys', () => {
    const small = generateKeyPairSync('rsa', { modulusLength: 1024 }).publicKey.export({ format: 'jwk' });
    expect(() => classicPublicKey(small.n!, small.e!)).toThrow();
  });
  it('does not access Classic storage for an inactive profile', async () => {
    const query = jest.fn();
    const service = new OutlookClassicService({ $queryRaw: query } as any, new ConfigService({}), { enabledFor: jest.fn().mockResolvedValue(false) } as any,
      { actor: jest.fn().mockResolvedValue({}) } as any, {} as any, {} as any);
    expect(await service.devices('user')).toEqual({ enabled: false, devices: [] });
    await expect(service.create('user', 'activity', 'device')).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });
});
