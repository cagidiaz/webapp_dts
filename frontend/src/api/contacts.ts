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
  address?: string | null;
  address2?: string | null;
  city?: string | null;
  post_code?: string | null;
  county?: string | null;
  territory_code?: string | null;
  created_at: string | null;
  updated_at: string;
  customer?: {
    name: string;
    client_id: string;
    total_sales?: number;
    balance_due_lcy?: number;
    salesperson_code?: string;
    phone_no?: string;
    email?: string;
    address?: string | null;
    address_2?: string | null;
    post_code?: string | null;
    city?: string | null;
    county?: string | null;
    country_reg_code?: string | null;
  };
}

/**
 * Obtiene todos los contactos, permitiendo filtrar por cliente (clientId), tipo de relación (relation) o búsqueda de texto (search).
 */
export const getContacts = async (params: { 
  clientId?: string; 
  relation?: string; 
  search?: string; // ← NUEVO
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

/**
 * Actualiza la información de localización física de un contacto.
 */
export const updateContactLocation = async (
  id: string,
  payload: {
    address?: string | null;
    address2?: string | null;
    city?: string | null;
    post_code?: string | null;
    county?: string | null;
    territory_code?: string | null;
  }
): Promise<ContactDataRow> => {
  const { data } = await apiClient.patch(`/contacts/${id}/location`, payload);
  return data;
};
