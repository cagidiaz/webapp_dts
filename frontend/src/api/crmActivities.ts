import apiClient from './apiClient';

export type CrmActivityType = 'NOTE' | 'TASK' | 'EMAIL' | 'EVENT' | 'CALL' | 'REUNION' | 'VIDEOLLAMADA' | 'VISITA';

export interface CrmActivity {
  id: string;
  client_id: string;
  contact_id?: string | null;
  created_by: string;
  type: CrmActivityType;
  title: string;
  description: string | null;
  due_date: string | null;
  time_scheduled: string | null;
  is_completed: boolean;
  email?: string;
  conclusions?: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    client_id: string;
    company_name: string;
    erp_code?: string;
    [key: string]: any;
  };
}

/**
 * Obtiene todas las actividades de un cliente
 */
export const getCrmActivities = async (clientId: string): Promise<CrmActivity[]> => {
  const { data } = await apiClient.get(`/crm-activities/${clientId}`);
  return data;
};

/**
 * Obtiene todas las actividades de un contacto
 */
export const getCrmActivitiesByContact = async (contactId: string): Promise<CrmActivity[]> => {
  const { data } = await apiClient.get(`/crm-activities/contact/${contactId}`);
  return data;
};

/**
 * Obtiene la agenda semanal de actividades comerciales filtradas por rango de fechas
 */
export const getWeeklyAgenda = async (startDate?: string, endDate?: string): Promise<CrmActivity[]> => {
  const { data } = await apiClient.get('/crm-activities', {
    params: { startDate, endDate },
  });
  return data;
};

/**
 * Crea una nueva actividad comercial en la base de datos
 */
export const createCrmActivity = async (payload: {
  clientId?: string;
  contactId?: string; // ← NUEVO
  type: CrmActivityType;
  title: string;
  description?: string;
  dueDate?: string;
  timeScheduled?: string;
  email?: string;
  conclusions?: string;
}): Promise<CrmActivity> => {
  const { data } = await apiClient.post('/crm-activities', payload);
  return data;
};

/**
 * Actualiza el estado o datos de una actividad comercial
 */
export const updateCrmActivity = async (
  id: string,
  payload: {
    isCompleted?: boolean;
    title?: string;
    description?: string;
    dueDate?: string;
    timeScheduled?: string;
    conclusions?: string | null;
  }
): Promise<CrmActivity> => {
  const { data } = await apiClient.patch(`/crm-activities/${id}`, payload);
  return data;
};

/**
 * Elimina una actividad comercial
 */
export const deleteCrmActivity = async (id: string): Promise<{ success: boolean }> => {
  const { data } = await apiClient.delete(`/crm-activities/${id}`);
  return data;
};
