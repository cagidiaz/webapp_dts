import apiClient from './apiClient';

export interface ContactDataRow {
  id: string;
  contact_no: string;
  client_id: string;
  name: string;
  job_title: string | null;
  org_level_code: string | null;
  email: string | null;
  phone_no: string | null;
  mobile_no: string | null;
  business_relation: string;
  linkedin: string | null;
  created_at: string | null;
  updated_at: string;
}

/**
 * Obtiene todos los contactos, permitiendo filtrar por cliente (clientId) o tipo de relación (relation).
 */
export const getContacts = async (params: { 
  clientId?: string; 
  relation?: string; 
} = {}): Promise<ContactDataRow[]> => {
  const { data } = await apiClient.get('/contacts', { params });
  return data;
};

/**
 * Obtiene un contacto por su ID único.
 */
export const getContactById = async (id: string): Promise<ContactDataRow> => {
  const { data } = await apiClient.get(`/contacts/${id}`);
  return data;
};

/**
 * Actualiza únicamente el campo LinkedIn de un contacto.
 */
export const updateContactLinkedin = async (id: string, linkedin: string): Promise<ContactDataRow> => {
  const { data } = await apiClient.patch(`/contacts/${id}/linkedin`, { linkedin });
  return data;
};
