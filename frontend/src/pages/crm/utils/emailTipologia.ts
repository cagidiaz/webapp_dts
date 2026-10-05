import React from 'react';
import {
  FileQuestion,
  Truck,
  FileEdit,
  Briefcase,
  CheckCircle2,
  Send,
  Inbox,
} from 'lucide-react';

export type EmailCategoryKey =
  | 'PETICION_OFERTA'
  | 'OFERTA_PROVEEDOR'
  | 'REVISION_OFERTA'
  | 'NEGOCIACION'
  | 'CIERRE_ACEPTACION';

export interface EmailCategoryConfig {
  key: EmailCategoryKey;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  badgeClass: string;
  pillBorder: string;
  pillActiveBg: string;
}

export const EMAIL_CATEGORIES: Record<EmailCategoryKey, EmailCategoryConfig> = {
  PETICION_OFERTA: {
    key: 'PETICION_OFERTA',
    label: 'Petición oferta',
    shortLabel: 'Petición',
    icon: FileQuestion,
    color: 'text-blue-600 dark:text-blue-400',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    pillBorder: 'border-blue-300 dark:border-blue-700',
    pillActiveBg: 'bg-blue-600 text-white',
  },
  OFERTA_PROVEEDOR: {
    key: 'OFERTA_PROVEEDOR',
    label: 'Oferta proveedor',
    shortLabel: 'Proveedor',
    icon: Truck,
    color: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    pillBorder: 'border-amber-300 dark:border-amber-700',
    pillActiveBg: 'bg-amber-600 text-white',
  },
  REVISION_OFERTA: {
    key: 'REVISION_OFERTA',
    label: 'Revisión oferta',
    shortLabel: 'Revisión',
    icon: FileEdit,
    color: 'text-purple-600 dark:text-purple-400',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    pillBorder: 'border-purple-300 dark:border-purple-700',
    pillActiveBg: 'bg-purple-600 text-white',
  },
  NEGOCIACION: {
    key: 'NEGOCIACION',
    label: 'Negociación',
    shortLabel: 'Negociación',
    icon: Briefcase,
    color: 'text-teal-600 dark:text-teal-400',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
    pillBorder: 'border-teal-300 dark:border-teal-700',
    pillActiveBg: 'bg-teal-600 text-white',
  },
  CIERRE_ACEPTACION: {
    key: 'CIERRE_ACEPTACION',
    label: 'Cierre/Aceptación',
    shortLabel: 'Cierre',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    pillBorder: 'border-emerald-300 dark:border-emerald-700',
    pillActiveBg: 'bg-emerald-600 text-white',
  },
};

export const EMAIL_CATEGORY_LIST: EmailCategoryConfig[] = [
  EMAIL_CATEGORIES.PETICION_OFERTA,
  EMAIL_CATEGORIES.OFERTA_PROVEEDOR,
  EMAIL_CATEGORIES.REVISION_OFERTA,
  EMAIL_CATEGORIES.NEGOCIACION,
  EMAIL_CATEGORIES.CIERRE_ACEPTACION,
];

export interface ParsedEmailActivity {
  rawTitle: string;
  cleanSubject: string;
  direction: 'INCOMING' | 'OUTGOING' | null;
  directionLabel: string | null;
  directionIcon: React.ComponentType<{ size?: number; className?: string }> | null;
  categoryKey: EmailCategoryKey;
  categoryConfig: EmailCategoryConfig;
}

/**
 * Parsea el título y metadatos de una actividad EMAIL para extraer la tipología y dirección de forma retrocompatible.
 */
export function parseEmailActivity(act: {
  title?: string | null;
  attendees?: any;
}): ParsedEmailActivity {
  const rawTitle = act.title || '(Sin Asunto)';
  let cleanSubject = rawTitle;

  // 1. Detectar dirección (Entrante / Saliente)
  let direction: 'INCOMING' | 'OUTGOING' | null = null;
  if (/Recibido|📥|INCOMING/i.test(rawTitle)) {
    direction = 'INCOMING';
  } else if (/Enviado|📤|OUTGOING/i.test(rawTitle)) {
    direction = 'OUTGOING';
  }

  // 2. Detectar tipología: primero revisar si viene explícita en attendees.categoryTag
  let detectedKey: EmailCategoryKey | null = null;
  const tagFromAttendees = act.attendees?.categoryTag || act.attendees?.category;

  if (tagFromAttendees) {
    if (tagFromAttendees === 'PETICION_OFERTA') detectedKey = 'PETICION_OFERTA';
    else if (tagFromAttendees === 'OFERTA_PROVEEDOR') detectedKey = 'OFERTA_PROVEEDOR';
    else if (tagFromAttendees === 'REVISION_OFERTA') detectedKey = 'REVISION_OFERTA';
    else if (tagFromAttendees === 'NEGOCIACION') detectedKey = 'NEGOCIACION';
    else if (tagFromAttendees === 'CIERRE_ACEPTACION' || tagFromAttendees === 'ACEPTACION') detectedKey = 'CIERRE_ACEPTACION';
  }

  // Si no estaba en attendees, deducirlo del título formateado
  if (!detectedKey) {
    if (/Petición oferta|PETICION/i.test(rawTitle)) {
      detectedKey = 'PETICION_OFERTA';
    } else if (/Oferta proveedor|PROVEEDOR/i.test(rawTitle)) {
      detectedKey = 'OFERTA_PROVEEDOR';
    } else if (/Revisión oferta|Revision|REVISION/i.test(rawTitle)) {
      detectedKey = 'REVISION_OFERTA';
    } else if (/Negociación|Negociacion|NEGOCIACION/i.test(rawTitle)) {
      detectedKey = 'NEGOCIACION';
    } else if (/Cierre|Aceptación|Aceptacion|ACEPTACION/i.test(rawTitle)) {
      detectedKey = 'CIERRE_ACEPTACION';
    } else {
      // Default si no se detecta ninguna específica
      detectedKey = 'PETICION_OFERTA';
    }
  }

  // 3. Extraer el asunto limpio eliminando los corchetes iniciales [📥 Recibido · ...]
  const bracketMatch = rawTitle.match(/^\[.*?\]\s*(.*)$/);
  if (bracketMatch && bracketMatch[1]) {
    cleanSubject = bracketMatch[1].trim() || '(Sin Asunto)';
  }

  const categoryConfig = EMAIL_CATEGORIES[detectedKey] || EMAIL_CATEGORIES.PETICION_OFERTA;

  return {
    rawTitle,
    cleanSubject,
    direction,
    directionLabel: direction === 'INCOMING' ? 'Recibido' : direction === 'OUTGOING' ? 'Enviado' : null,
    directionIcon: direction === 'INCOMING' ? Inbox : direction === 'OUTGOING' ? Send : null,
    categoryKey: detectedKey,
    categoryConfig,
  };
}
