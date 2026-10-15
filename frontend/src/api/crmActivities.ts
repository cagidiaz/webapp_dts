import apiClient from './apiClient';
import { saveProspectActivity } from './prospects';
import type { ProspectActivity, ProspectActivityType } from './prospects';

export type CrmActivityType = 'NOTE' | 'TASK' | 'EMAIL' | 'EVENT' | 'CALL' | 'REUNION' | 'VIDEOLLAMADA' | 'VISITA';

export interface CrmActivity {
  source?: 'PROSPECT';
  prospect_id?: string;
  version?: number;
  owner_id?: string;
  can_edit?: boolean;
  prospect?: { id: string; company_name: string; contact_name?: string | null };
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
  location?: string | null;
  exchange_item_id?: string | null;
  exchange_web_link?: string | null;
  exchange_sync_status?: string | null;
  quote_document_no?: string | null;
  attendees?: any;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    client_id: string;
    company_name: string;
    erp_code?: string;
    city?: string;
    [key: string]: any;
  };
  contact?: {
    id: string;
    name: string;
    email?: string;
    phone_no?: string;
    mobile_no?: string;
    position?: string;
    [key: string]: any;
  };
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
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
 * Obtiene la agenda de actividades comerciales filtradas con soporte de tipos y comercial
 */
export const getCrmActivitiesAgenda = async (params: {
  startDate?: string;
  endDate?: string;
  salespersonId?: string;
  types?: string[];
}): Promise<CrmActivity[]> => {
  const { data } = await apiClient.get('/crm-activities', {
    params: {
      startDate: params.startDate,
      endDate: params.endDate,
      salespersonId: params.salespersonId,
      types: params.types?.join(','),
    },
  });
  return data;
};

export interface CrmCreator {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

/**
 * Obtiene la lista de usuarios/comerciales que han creado actividades
 */
export const getCrmActivityCreators = async (): Promise<CrmCreator[]> => {
  const { data } = await apiClient.get('/crm-activities/creators');
  return data;
};

export interface CrmDailyBriefing {
  todayStr: string;
  todayActivities: CrmActivity[];
  pendingActivities: CrmActivity[];
  stats: {
    todayTotal: number;
    todayPending: number;
    todayCompleted: number;
    pastPendingTotal: number;
    teamTodayTotal?: number;
    isAdminOrDireccion: boolean;
  };
}

/**
 * Obtiene el briefing diario y actividades pendientes del usuario logueado
 */
export const getCrmDailyBriefing = async (): Promise<CrmDailyBriefing> => {
  const { data } = await apiClient.get('/crm-activities/briefing');
  return data;
};

/**
 * Obtiene la agenda semanal de actividades comerciales (compatibilidad)
 */
export const getWeeklyAgenda = async (startDate?: string, endDate?: string): Promise<CrmActivity[]> => {
  return getCrmActivitiesAgenda({ startDate, endDate });
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
  location?: string;
  isCompleted?: boolean;
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
    location?: string | null;
    categoryTag?: string;
    quoteDocumentNo?: string;
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

/** Conserva el origen al editar desde agenda o briefing. */
export const updateAgendaActivity = async (activity: CrmActivity, payload: Parameters<typeof updateCrmActivity>[1]): Promise<CrmActivity> => {
  if (activity.source !== 'PROSPECT') return updateCrmActivity(activity.id, payload);
  if (!activity.prospect_id || !activity.version || activity.can_edit === false) throw new Error('No se puede editar esta actividad de prospección.');
  const saved = await saveProspectActivity(activity.prospect_id, {
    type: activity.type as ProspectActivityType,
    title: payload.title ?? activity.title,
    description: payload.description === undefined ? activity.description : payload.description,
    due_date: payload.dueDate === undefined ? activity.due_date?.slice(0, 10) || null : payload.dueDate?.slice(0, 10) || null,
    time_scheduled: payload.timeScheduled === undefined ? activity.time_scheduled : payload.timeScheduled || null,
    location: payload.location === undefined ? activity.location || null : payload.location,
    conclusions: payload.conclusions === undefined ? activity.conclusions || null : payload.conclusions,
    is_completed: payload.isCompleted ?? activity.is_completed,
  }, activity as ProspectActivity);
  return { ...activity, ...saved };
};
