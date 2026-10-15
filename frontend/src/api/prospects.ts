import apiClient from './apiClient';

export interface ProspectAccess {
  canSyncOutlook?: boolean;
  enabled: boolean;
  canCreate: boolean;
  canEditAll: boolean;
  canViewAll: boolean;
  userId: string;
}
export interface ProspectFields {
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  phase: number;
}
export interface Prospect extends ProspectFields {
  id: string;
  owner_id: string;
  version: number;
  archived_at: string | null;
  linked_client_id: string | null;
  converted_at: string | null;
  linked_client?: { id: string; client_id: string; name: string } | null;
  created_at: string;
  updated_at: string;
  owner?: { first_name: string | null; last_name: string | null; email: string };
  events?: { id: string; title: string; description: string | null; created_by: string; created_at: string; author?: { first_name: string | null; last_name: string | null; email: string } }[];
}
export interface ProspectList {
  items: Prospect[];
  total: number;
  limit: number;
  page: number;
  counts: { phase0: number; phase1: number; converted: number };
}
export const getProspectAccess = async () => (await apiClient.get<ProspectAccess>('/crm-prospects/access')).data;
export const getProspects = async (status: string, search: string, page = 1) => (await apiClient.get<ProspectList>('/crm-prospects', { params: { status, search, page } })).data;
export const getProspect = async (id: string) => (await apiClient.get<Prospect>(`/crm-prospects/${id}`)).data;
export const createProspect = async (data: ProspectFields) => (await apiClient.post<Prospect>('/crm-prospects', data)).data;
export const updateProspect = async (id: string, data: ProspectFields & { version: number }) => (await apiClient.patch<Prospect>(`/crm-prospects/${id}`, data)).data;
export const archiveProspect = async (id: string, version: number, restore: boolean) => (await apiClient.post<Prospect>(`/crm-prospects/${id}/${restore ? 'restore' : 'archive'}`, { version })).data;
export interface ProspectClient { id: string; client_id: string; name: string; email: string | null; phone_no: string | null }
export const getProspectClients = async (id: string, search: string) => (await apiClient.get<ProspectClient[]>(`/crm-prospects/${id}/clients`, { params: { search } })).data;
export const linkProspect = async (id: string, version: number, clientId: string | null) => (await apiClient.post<Prospect>(`/crm-prospects/${id}/${clientId ? 'link' : 'unlink'}`, { version, ...(clientId ? { client_id: clientId } : {}) })).data;

export type ProspectActivityType = 'NOTE' | 'TASK' | 'CALL' | 'VISITA' | 'EVENT' | 'VIDEOLLAMADA';
export interface ProspectActivityFields {
  type: ProspectActivityType;
  title: string;
  description: string | null;
  due_date: string | null;
  time_scheduled: string | null;
  location: string | null;
  conclusions: string | null;
  is_completed: boolean;
}
export interface ProspectActivity extends ProspectActivityFields {
  exchange_sync_status?: string;
  exchange_item_id?: string | null;
  exchange_synced_version?: number | null;
  id: string;
  prospect_id: string;
  created_by: string;
  version: number;
  created_at: string;
  updated_at: string;
  prospect?: { id: string; company_name: string };
  author?: { first_name: string | null; last_name: string | null; email: string };
}
export const getProspectActivities = async (id: string) => (await apiClient.get<ProspectActivity[]>(`/crm-prospects/${id}/activities`)).data;
export const syncProspectActivity = async (prospectId: string, id: string) => (await apiClient.post<ProspectActivity>(`/crm-prospects/${prospectId}/activities/${id}/sync`)).data;
export const getClientProspectActivities = async (id: string) => (await apiClient.get<ProspectActivity[]>(`/crm-prospects/client/${id}/activities`)).data;
export const saveProspectActivity = async (prospectId: string, fields: ProspectActivityFields, activity?: ProspectActivity | null) => {
  const data = activity
    ? await apiClient.patch<ProspectActivity>(`/crm-prospects/${prospectId}/activities/${activity.id}`, { ...fields, version: activity.version })
    : await apiClient.post<ProspectActivity>(`/crm-prospects/${prospectId}/activities`, fields);
  return data.data;
};
