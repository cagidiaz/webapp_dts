import { createHash, createPublicKey, timingSafeEqual, verify } from 'node:crypto';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

export const CLASSIC_VERSION = '1.1.0';
export const hashClassicSecret = (value: string) => createHash('sha256').update(value).digest('hex');
export function equalClassicSecret(value: string, hash: string): boolean {
  return /^[0-9a-f]{64}$/.test(hash) && timingSafeEqual(Buffer.from(hashClassicSecret(value), 'hex'), Buffer.from(hash, 'hex'));
}
export function classicPublicKey(n: string, e: string) {
  if (!/^[A-Za-z0-9_-]{342,683}$/.test(n) || e !== 'AQAB') throw new BadRequestException('Clave de equipo no válida.');
  const key = createPublicKey({ key: { kty: 'RSA', n, e }, format: 'jwk' });
  if ((key.asymmetricKeyDetails?.modulusLength || 0) < 2048 || (key.asymmetricKeyDetails?.modulusLength || 0) > 4096) throw new BadRequestException('Clave de equipo no válida.');
  const pem = key.export({ type: 'spki', format: 'pem' }).toString();
  return { pem, fingerprint: createHash('sha256').update(key.export({ type: 'spki', format: 'der' })).digest('hex') };
}
export function verifyClassicSignature(pem: string, canonical: string, signature: string) {
  if (!/^[A-Za-z0-9_-]{300,800}$/.test(signature) || !verify('RSA-SHA256', Buffer.from(canonical), pem, Buffer.from(signature, 'base64url'))) throw new UnauthorizedException('Firma del equipo no válida.');
}
export interface ClassicProof { deviceId: string; token: string; timestamp: string; nonce: string; version: string; signature: string }
export function classicProofText(action: 'claim' | 'result', requestId: string, proof: ClassicProof, outcome = '', claimNonce = '') {
  if (!/^\d{13}$/.test(proof.timestamp) || Math.abs(Date.now() - Number(proof.timestamp)) > 60000 || !/^[A-Za-z0-9_-]{43}$/.test(proof.nonce)
    || !/^[A-Za-z0-9_-]{43}$/.test(proof.token) || !['1.0.0', CLASSIC_VERSION].includes(proof.version)) throw new UnauthorizedException('Solicitud caducada o versión de componente no compatible.');
  return ['dts-classic-v1', action, requestId, proof.deviceId, proof.token, proof.timestamp, proof.nonce, proof.version, outcome, claimNonce].join('|');
}
