import apiClient from './apiClient';
import type { EmailResolveResult } from '../utils/resolvedEmailWindow';

export interface ClassicDevice { id: string; label: string; paired_at: string; last_seen_at: string | null; helper_version: string | null }
export const classicDeviceKey = 'dts-classic-device-v1';
export async function getClassicDevices(): Promise<{ enabled: boolean; devices: ClassicDevice[] }> {
  const { data } = await apiClient.get('/exchange-sync/classic/devices'); return data;
}
export async function approveClassicPair(pairingId: string, code: string): Promise<{ deviceId: string; label: string; fingerprint: string }> {
  const { data } = await apiClient.post('/exchange-sync/classic/pair/approve', { pairingId, code }); return data;
}
export async function revokeClassicDevice(id: string) { await apiClient.post(`/exchange-sync/classic/devices/${encodeURIComponent(id)}/revoke`); }
export interface ClassicRequest { status: 'ready'; requestId: string; protocolUri: string; expiresInSeconds: number }
export type ClassicAction = 'open' | 'reply' | 'reply_all';
export async function prepareClassicRequest(activityId: string, deviceId: string, candidateId?: string, action: ClassicAction = 'open'): Promise<ClassicRequest | EmailResolveResult | { status: 'device_required'; message: string }> {
  const { data } = await apiClient.post('/exchange-sync/classic/requests', { activityId, deviceId, candidateId, action }); return data;
}
export async function launchClassicAndWait(request: ClassicRequest): Promise<{ state: string; outcome?: string }> {
  // Exactly one protocol invocation; never infer installation or success from browser blur.
  const match = /^dts-outlook:\/\/v1\/open\?request=([a-f0-9-]{36})&token=[A-Za-z0-9_-]{43}$/.exec(request.protocolUri);
  if (!match || match[1] !== request.requestId) throw new Error('INVALID_CLASSIC_REQUEST');
  const anchor = document.createElement('a'); anchor.href = request.protocolUri;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  const until = Date.now() + 45000;
  while (Date.now() < until) {
    const { data } = await apiClient.get(`/exchange-sync/classic/requests/${encodeURIComponent(request.requestId)}`);
    if (['opened','failed','expired'].includes(data.state)) return data;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return { state: 'unconfirmed' };
}
