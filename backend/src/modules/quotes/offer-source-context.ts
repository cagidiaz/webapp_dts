import { BadRequestException } from '@nestjs/common';
import { pilotPhase, OFFER_PROBABILITIES } from './offer-pilot-rules';

export const BC_FIELDS = ['estado_oferta', 'probabilidad_exito', 'oferta_type', 'cierreprev_date', 'confirmacion_date', 'motivo_ganada', 'motivo_perdida', 'observaciones'] as const;
export const LOCAL_FIELDS = [...BC_FIELDS, 'contacto_id', 'proxima_accion', 'fecha_proxima_accion'] as const;
const CONTACT_DISPLAY_FIELDS = ['contacto_nombre', 'contacto_email', 'contacto_telefono'] as const;
const READ_FIELDS = [...LOCAL_FIELDS, ...CONTACT_DISPLAY_FIELDS];
const dates = new Set(['cierreprev_date', 'confirmacion_date', 'fecha_proxima_accion']);
const comparable = (value: any) => value instanceof Date ? value.getTime() : typeof value === 'object' && value !== null && typeof value.toNumber === 'function' ? value.toNumber() : value;

function matches(value: any, condition: any): boolean {
  value = comparable(value);
  if (condition === null || typeof condition !== 'object' || condition instanceof Date) return value === comparable(condition);
  const insensitive = condition.mode === 'insensitive';
  const equal = (a: any, b: any) => insensitive && typeof a === 'string' && typeof b === 'string' ? a.toLowerCase() === b.toLowerCase() : comparable(a) === comparable(b);
  return Object.entries(condition).every(([operator, target]: [string, any]) => {
    if (operator === 'mode') return true;
    if (operator === 'equals') return equal(value, target);
    if (operator === 'not') return !matches(value, target);
    if (operator === 'in') return target.some((item: any) => equal(value, item));
    if (operator === 'notIn') return !target.some((item: any) => equal(value, item));
    if (value === null || value === undefined) return false;
    if (operator === 'gte') return value >= comparable(target);
    if (operator === 'gt') return value > comparable(target);
    if (operator === 'lte') return value <= comparable(target);
    if (operator === 'lt') return value < comparable(target);
    if (operator === 'contains') return String(value).toLowerCase().includes(String(target).toLowerCase());
    throw new BadRequestException(`Filtro de seguimiento no soportado: ${operator}`);
  });
}

/** Una misma resolución de fuente para las consultas paginadas, KPIs y CRM. */
export class OfferSourceContext {
  readonly records: Map<string, any>;
  constructor(rows: any[]) { this.records = new Map(rows.filter(row => row.source !== 'BC').map(row => {
    const phase = pilotPhase(row.estado_oferta);
    return [row.document_no, { ...row, estado_oferta: phase, probabilidad_exito: phase && OFFER_PROBABILITIES[phase] !== undefined ? OFFER_PROBABILITIES[phase] : row.probabilidad_exito }];
  })); }
  where(node: any, crmScope = false): any {
    if (!node || typeof node !== 'object') return node;
    const clauses: any[] = [];
    for (const [key, value] of Object.entries(node)) {
      if (['AND', 'OR', 'NOT'].includes(key)) { clauses.push({ [key]: Array.isArray(value) ? value.map(item => this.where(item, crmScope)) : this.where(value, crmScope) }); continue; }
      if (key === 'sales_quotes_crm') { clauses.push(value === null ? { document_no: { in: [] } } : this.where(value, true)); continue; }
      if (BC_FIELDS.includes(key as any) || crmScope && READ_FIELDS.includes(key as any)) {
        const condition: any = ['estado_oferta', 'oferta_type'].includes(key) && typeof value === 'string' ? { equals: value, mode: 'insensitive' } : value;
        const managed = [...this.records.keys()];
        const contactReference = typeof condition === 'string' ? condition : condition?.equals;
        const uuidContactFilter = key === 'contacto_id' && typeof contactReference === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactReference);
        const matching = [...this.records.values()].filter(row => matches(uuidContactFilter ? row.contacto_uuid : row[key], condition)).map(row => row.document_no);
        // Los campos generales siguen en BC; los auxiliares siguen en el CRM anterior para no participantes.
        const bcCondition = BC_FIELDS.includes(key as any) ? { [key]: condition } : { sales_quotes_crm: { [key]: condition } };
        clauses.push({ OR: [{ document_no: { in: matching } }, { AND: [{ document_no: { notIn: managed } }, bcCondition] }] });
      } else { clauses.push(crmScope ? { sales_quotes_crm: { [key]: value } } : { [key]: value }); }
    }
    return { AND: clauses };
  }
  overlay(quote: any) {
    const local = this.records.get(quote.document_no);
    const fields = local ? Object.fromEntries(READ_FIELDS.map(field => [field, local[field] ?? null])) : Object.fromEntries(BC_FIELDS.map(field => [field, quote[field] ?? null]));
    // Duplicar el valor efectivo en ambas entradas evita que los OR antiguos recuperen valores BC vacíos.
    return { ...quote, ...fields, followup_source: local ? 'APP' : 'BC', followup_version: local?.version || null,
      followup_owner_id: null,
      sales_quotes_crm: { ...(quote.sales_quotes_crm || {}), ...fields, ...(local ? { id: local.id, activities: local.activities || [] } : {}) },
    };
  }
}

