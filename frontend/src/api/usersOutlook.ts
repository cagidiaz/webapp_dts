import apiClient from './apiClient';

export interface ManagedOutlookDevice {
  id: string; label: string; status: 'PAIRED' | 'REVOKED'; pairedAt: string;
  revokedAt: string | null; lastSeenAt: string | null; version: string | null;
}
export interface ManagedOutlookUser {
  id: string; email: string; firstName: string | null; lastName: string | null; isActive: boolean; role: string | null;
  microsoft365: { status: 'REGISTERED' | 'NOT_CONNECTED' | 'CONSENT_REQUIRED' | 'RECONNECT_REQUIRED';
    email: string | null; mailSyncEnabled: boolean; calendarSyncEnabled: boolean; lastSyncedAt: string | null };
  devices: ManagedOutlookDevice[];
}
export async function getUsersOutlook(): Promise<ManagedOutlookUser[]> {
  const { data } = await apiClient.get('/users/outlook'); return data;
}
export async function revokeUserOutlookDevice(id: string) {
  const { data } = await apiClient.post(`/users/outlook/devices/${encodeURIComponent(id)}/revoke`); return data;
}
