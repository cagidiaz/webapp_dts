import * as XLSX from 'xlsx';
import type { CrmActivity } from '../api/crmActivities';

export interface ReportFilterOptions {
  periodLabel: string;
  startDate?: string;
  endDate?: string;
  salespersonName: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: string; bg: string; color: string; border: string }> = {
  REUNION: {
    label: 'Reunión Presencial',
    icon: '🏢',
    bg: '#EBF4F6',
    color: '#003E51',
    border: '#B3D4DC',
  },
  VIDEOLLAMADA: {
    label: 'Videollamada Teams',
    icon: '💻',
    bg: '#E0F7F9',
    color: '#00838F',
    border: '#80DEEA',
  },
  VISITA: {
    label: 'Visita a Cliente',
    icon: '🚗',
    bg: '#E8F5E9',
    color: '#2E7D32',
    border: '#A5D6A7',
  },
  CALL: {
    label: 'Llamada Telefónica',
    icon: '📞',
    bg: '#FFF8E1',
    color: '#F57F17',
    border: '#FFE082',
  },
  TASK: {
    label: 'Tarea Comercial',
    icon: '📋',
    bg: '#F3E5F5',
    color: '#6A1B9A',
    border: '#CE93D8',
  },
  NOTE: {
    label: 'Nota Interna',
    icon: '📝',
    bg: '#ECEFF1',
    color: '#37474F',
    border: '#CFD8DC',
  },
  EVENT: {
    label: 'Evento / Otro',
    icon: '📅',
    bg: '#EDE7F6',
    color: '#4527A0',
    border: '#D1C4E9',
  },
};

/**
 * Genera el documento HTML maquetado con diseño editorial corporativo dTS para impresión / PDF
 */
export const generateActivityReportHtml = (
  activities: CrmActivity[],
  options: ReportFilterOptions
): string => {
  const printDate = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalEvents = activities.length;
  const inPersonCount = activities.filter(a => a.type === 'REUNION' || a.type === 'VISITA').length;
  const onlineCount = activities.filter(a => a.type === 'VIDEOLLAMADA').length;
  
  const uniqueCompanies = new Set(
    activities.map(a => a.customer?.company_name || a.client_id).filter(Boolean)
  ).size;

  const uniqueContacts = new Set(
    activities.map(a => a.contact?.name || a.contact_id).filter(Boolean)
  ).size;

  const eventCardsHtml = activities
    .map((act, index) => {
      const typeConf = TYPE_CONFIG[act.type] || {
        label: act.type,
        icon: '📌',
        bg: '#F5F5F5',
        color: '#333333',
        border: '#E0E0E0',
      };

      const dateObj = act.due_date ? new Date(act.due_date) : new Date(act.created_at);
      const dateFormatted = dateObj.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      const capitalizedDate = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
      const timeFormatted = act.time_scheduled ? `${act.time_scheduled.substring(0, 5)} h` : '';

      const companyName = act.customer?.company_name || 'Empresa no especificada';
      const companyCode = act.client_id ? `(${act.client_id})` : '';
      const companyCity = act.customer?.city ? ` — ${act.customer.city}` : '';

      const contactName = act.contact?.name || 'Contacto no vinculado';
      const contactPosition = act.contact?.position ? ` | ${act.contact.position}` : '';
      const contactEmail = act.contact?.email ? ` (${act.contact.email})` : '';
      const contactPhone = act.contact?.phone_no || act.contact?.mobile_no ? ` · Tel: ${act.contact?.phone_no || act.contact?.mobile_no}` : '';

      const commercialName = act.creator
        ? `${act.creator.first_name} ${act.creator.last_name || ''}`.trim()
        : 'Comercial asignado';

      const locationText = act.location ? `<div class="meta-row"><strong>📍 Ubicación:</strong> ${act.location}</div>` : '';

      return `
        <div class="event-card">
          <div class="event-header">
            <div class="event-type-badge" style="background-color: ${typeConf.bg}; color: ${typeConf.color}; border: 1px solid ${typeConf.border};">
              <span>${typeConf.icon}</span>
              <span>${typeConf.label}</span>
            </div>
            <div class="event-date">
              📅 ${capitalizedDate} ${timeFormatted ? `· <strong>${timeFormatted}</strong>` : ''}
            </div>
            <div class="event-commercial">
              👤 ${commercialName}
            </div>
          </div>

          <div class="event-body">
            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">EMPRESA CLIENTE:</span>
                <span class="meta-value font-bold">${companyName} <span class="client-code">${companyCode}</span>${companyCity}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">CONTACTO / INTERLOCUTOR:</span>
                <span class="meta-value">${contactName} <span class="contact-sub">${contactPosition}${contactEmail}${contactPhone}</span></span>
              </div>
            </div>

            ${locationText}

            <div class="concept-section">
              <div class="concept-title">📌 Concepto / Asunto:</div>
              <div class="concept-text">${escapeHtml(act.title)}</div>
            </div>

            ${
              act.description
                ? `
              <div class="detail-section">
                <div class="section-subtitle">📝 Detalle de la reunión:</div>
                <div class="detail-content">${escapeHtml(act.description).replace(/\n/g, '<br/>')}</div>
              </div>`
                : ''
            }

            ${
              act.conclusions
                ? `
              <div class="conclusions-box">
                <div class="conclusions-title">🎯 Conclusiones y Acuerdos Alcanzados:</div>
                <div class="conclusions-content">${escapeHtml(act.conclusions).replace(/\n/g, '<br/>')}</div>
              </div>`
                : ''
            }
          </div>
          <div class="event-footer">
            <span>Evento #${index + 1} de ${totalEvents}</span>
            <span>dTS CRM</span>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Informe de Actividad Comercial — dTS Instruments</title>
      <style>
        @page {
          size: A4;
          margin: 12mm 14mm 14mm 14mm;
        }

        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1F2937;
          background-color: #FFFFFF;
          margin: 0;
          padding: 0;
          font-size: 11px;
          line-height: 1.45;
        }

        /* HEADER OFICIAL */
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2.5px solid #003E51;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }

        .header-logo-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-logo-group svg {
          height: 38px;
          width: auto;
        }

        .header-title-block {
          text-align: right;
        }

        .header-title {
          font-size: 16px;
          font-weight: 800;
          color: #003E51;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .header-subtitle {
          font-size: 10px;
          color: #00B0B9;
          font-weight: 700;
          margin-top: 2px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        /* BARRA DE METADATOS */
        .meta-bar {
          display: flex;
          justify-content: space-between;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 8px 14px;
          margin-bottom: 16px;
          font-size: 10.5px;
        }

        .meta-bar-item {
          display: flex;
          gap: 5px;
        }

        .meta-bar-label {
          color: #64748B;
          font-weight: 600;
        }

        .meta-bar-value {
          color: #0F172A;
          font-weight: 700;
        }

        /* PANEL DE RESUMEN EJECUTIVO (KPIs) */
        .kpi-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }

        .kpi-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-left: 4px solid #003E51;
          border-radius: 6px;
          padding: 8px 10px;
        }

        .kpi-card.accent {
          border-left-color: #00B0B9;
        }

        .kpi-card.green {
          border-left-color: #10B981;
        }

        .kpi-card.purple {
          border-left-color: #8B5CF6;
        }

        .kpi-title {
          font-size: 8.5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748B;
          font-weight: 700;
        }

        .kpi-value {
          font-size: 18px;
          font-weight: 800;
          color: #003E51;
          margin-top: 2px;
          font-family: monospace;
        }

        .kpi-subtitle {
          font-size: 9px;
          color: #94A3B8;
          margin-top: 1px;
        }

        /* TARJETAS DE EVENTO */
        .event-card {
          background: #FFFFFF;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          margin-bottom: 14px;
          page-break-inside: avoid;
          break-inside: avoid;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
          overflow: hidden;
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #F8FAFC;
          border-bottom: 1px solid #E2E8F0;
          padding: 7px 12px;
          font-size: 10px;
        }

        .event-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-weight: 700;
          font-size: 9.5px;
          text-transform: uppercase;
          padding: 2.5px 8px;
          border-radius: 12px;
          letter-spacing: 0.3px;
        }

        .event-date {
          font-weight: 700;
          color: #334155;
        }

        .event-commercial {
          font-weight: 600;
          color: #64748B;
        }

        .event-body {
          padding: 10px 14px;
        }

        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1px dashed #E2E8F0;
        }

        .meta-item {
          display: flex;
          flex-direction: column;
        }

        .meta-label {
          font-size: 8.5px;
          font-weight: 700;
          color: #94A3B8;
          letter-spacing: 0.5px;
        }

        .meta-value {
          font-size: 11px;
          color: #1E293B;
          margin-top: 1px;
        }

        .meta-value.font-bold {
          font-weight: 700;
          color: #003E51;
        }

        .client-code {
          font-family: monospace;
          color: #64748B;
          font-size: 9.5px;
        }

        .contact-sub {
          font-size: 9.5px;
          color: #64748B;
        }

        .meta-row {
          font-size: 9.5px;
          color: #475569;
          margin-bottom: 6px;
        }

        .concept-section {
          margin-top: 6px;
          margin-bottom: 6px;
        }

        .concept-title {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          color: #003E51;
          letter-spacing: 0.5px;
        }

        .concept-text {
          font-size: 11.5px;
          font-weight: 700;
          color: #0F172A;
          margin-top: 1px;
        }

        .detail-section {
          margin-top: 6px;
          background: #F8FAFC;
          border: 1px solid #F1F5F9;
          border-radius: 6px;
          padding: 8px 10px;
        }

        .section-subtitle {
          font-size: 8.5px;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          margin-bottom: 3px;
        }

        .detail-content {
          font-size: 10px;
          color: #334155;
          line-height: 1.4;
        }

        .conclusions-box {
          margin-top: 8px;
          background: #EBF7F8;
          border: 1px solid #B2E5E9;
          border-left: 3.5px solid #00B0B9;
          border-radius: 6px;
          padding: 7px 10px;
        }

        .conclusions-title {
          font-size: 9px;
          font-weight: 800;
          color: #006064;
          text-transform: uppercase;
          margin-bottom: 2px;
          letter-spacing: 0.3px;
        }

        .conclusions-content {
          font-size: 10px;
          color: #004D40;
          font-weight: 600;
          line-height: 1.4;
        }

        .event-footer {
          display: flex;
          justify-content: space-between;
          background: #FAFAFA;
          border-top: 1px solid #F1F5F9;
          padding: 3px 12px;
          font-size: 8px;
          color: #94A3B8;
        }

        /* PIE DE PÁGINA */
        .report-page-footer {
          border-top: 1px solid #E2E8F0;
          padding-top: 8px;
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 8.5px;
          color: #94A3B8;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #64748B;
          border: 1px dashed #CBD5E1;
          border-radius: 8px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>

      <!-- HEADER OFICIAL -->
      <div class="report-header">
        <div class="header-logo-group">
          <!-- Logo vectorial dTS Instruments -->
          <svg viewBox="0 0 1500 610" xmlns="http://www.w3.org/2000/svg">
            <g transform="matrix(4.16667,0,0,4.16667,866.417,39.7346)">
              <path d="M0,86.308C6.274,91.683 15.42,94.526 26.442,94.526C48.413,94.526 61.529,83.29 61.529,64.47C61.529,57.479 59.888,52.632 56.04,48.258C51.879,43.529 44.764,39.155 33.651,34.491C22.294,29.695 16.368,26.89 16.368,20.345C16.368,15.58 20.763,11.704 26.165,11.704C31.835,11.704 34.926,14.725 36.123,21.481L60.682,21.481C60.367,9.082 55.561,1.407 44.717,-4.091C39.177,-6.867 33.335,-8.218 26.859,-8.218C17.818,-8.218 8.876,-5.223 2.324,-0.001C-4.479,5.423 -8.227,12.744 -8.227,20.616C-8.227,33.188 -0.833,41.72 15.747,48.282C16.634,48.63 17.542,48.979 18.455,49.33C27.118,52.657 36.936,56.429 36.936,64.198C36.936,69.935 32.166,74.604 26.304,74.604C19.602,74.604 15.111,69.247 14.725,60.89L-9.894,60.89L-9.894,62.297C-9.894,72.607 -6.565,80.684 0,86.308" fill="#00B0B9"/>
            </g>
            <g transform="matrix(4.16667,0,0,4.16667,-471.067,-2028.48)">
              <rect x="160.019" y="606.379" width="6.65" height="25.44" fill="#003E51"/>
            </g>
            <g transform="matrix(4.16667,0,0,4.16667,322.209,498.1)">
              <path d="M0,25.44L-9.994,9.9L-9.817,25.44L-16.186,25.44L-16.186,0L-10.451,0L-0.316,16.089L-0.598,0L5.771,0L5.771,25.44L0,25.44Z" fill="#003E51"/>
            </g>
            <g transform="matrix(4.16667,0,0,4.16667,420.299,573.155)">
              <path d="M0,-10.588C-0.282,-12.409 -1.055,-13.063 -2.356,-13.063C-3.589,-13.063 -4.645,-12.204 -4.645,-11.069C-4.645,-9.556 -3.238,-8.87 -0.388,-7.666C5.349,-5.26 6.792,-3.232 6.792,0.104C6.792,5.02 3.342,7.908 -2.287,7.908C-7.953,7.908 -11.683,5.02 -11.683,-0.446L-11.683,-0.996L-5.067,-0.996C-5.031,1.1 -3.976,2.477 -2.322,2.477C-0.949,2.477 0.176,1.411 0.176,0.036C0.176,-1.992 -2.71,-2.887 -5.067,-3.815C-9.324,-5.5 -11.259,-7.7 -11.259,-11.001C-11.259,-15.333 -6.967,-18.496 -2.181,-18.496C-0.458,-18.496 1.056,-18.117 2.428,-17.429C5.207,-16.021 6.544,-13.991 6.58,-10.588L0,-10.588Z" fill="#003E51"/>
            </g>
          </svg>
        </div>
        <div class="header-title-block">
          <h1 class="header-title">Informe de Actividad Comercial</h1>
          <div class="header-subtitle">Reuniones Presenciales & Videollamadas</div>
        </div>
      </div>

      <!-- METADATOS DEL REPORTE -->
      <div class="meta-bar">
        <div class="meta-bar-item">
          <span class="meta-bar-label">Periodo:</span>
          <span class="meta-bar-value">${escapeHtml(options.periodLabel)}${options.startDate && options.endDate ? ` (${formatDateString(options.startDate)} al ${formatDateString(options.endDate)})` : ''}</span>
        </div>
        <div class="meta-bar-item">
          <span class="meta-bar-label">Comercial / Responsable:</span>
          <span class="meta-bar-value">${escapeHtml(options.salespersonName)}</span>
        </div>
        <div class="meta-bar-item">
          <span class="meta-bar-label">Emisión:</span>
          <span class="meta-bar-value">${printDate}</span>
        </div>
      </div>

      <!-- RESUMEN EJECUTIVO / KPIs -->
      <div class="kpi-container">
        <div class="kpi-card">
          <div class="kpi-title">Total Eventos</div>
          <div class="kpi-value">${totalEvents}</div>
          <div class="kpi-subtitle">Actividades realizadas</div>
        </div>
        <div class="kpi-card accent">
          <div class="kpi-title">Presenciales / Visitas</div>
          <div class="kpi-value">${inPersonCount}</div>
          <div class="kpi-subtitle">Reuniones & Visitas</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-title">Videollamadas</div>
          <div class="kpi-value">${onlineCount}</div>
          <div class="kpi-subtitle">Teams / Remotas</div>
        </div>
        <div class="kpi-card purple">
          <div class="kpi-title">Alcance Comercial</div>
          <div class="kpi-value">${uniqueCompanies} / ${uniqueContacts}</div>
          <div class="kpi-subtitle">Empresas / Contactos</div>
        </div>
      </div>

      <!-- LISTADO DE EVENTOS -->
      ${
        activities.length === 0
          ? `<div class="empty-state">No se registraron reuniones presenciales ni videollamadas en el periodo seleccionado.</div>`
          : eventCardsHtml
      }

      <!-- PIE DE PÁGINA -->
      <div class="report-page-footer">
        <span>dTS Instruments S.L. — Sistema de Información Comercial CRM</span>
        <span>Documento Confidencial de Uso Interno</span>
      </div>

    </body>
    </html>
  `;
};

/**
 * Abre el diálogo de impresión con el HTML maquetado listo para "Guardar como PDF"
 */
export const printActivityReport = (
  activities: CrmActivity[],
  options: ReportFilterOptions
): void => {
  const htmlContent = generateActivityReportHtml(activities, options);
  
  // Creamos un iframe oculto para una impresión limpia sin alterar la ventana principal
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 350);
};

/**
 * Exporta el conjunto de actividades a un archivo Excel (.xlsx) estructurado
 */
export const exportActivityReportToExcel = (
  activities: CrmActivity[],
  options: ReportFilterOptions
): void => {
  const data = activities.map((act) => {
    const typeConf = TYPE_CONFIG[act.type] || { label: act.type };
    const dateStr = act.due_date ? act.due_date.split('T')[0] : act.created_at.split('T')[0];

    return {
      'Fecha': dateStr,
      'Hora': act.time_scheduled || '',
      'Tipo Evento': typeConf.label,
      'Comercial': act.creator ? `${act.creator.first_name} ${act.creator.last_name || ''}`.trim() : '',
      'Empresa': act.customer?.company_name || '',
      'Cód. Cliente': act.client_id || '',
      'Ciudad': act.customer?.city || '',
      'Contacto': act.contact?.name || '',
      'Cargo Contacto': act.contact?.position || '',
      'Email Contacto': act.contact?.email || '',
      'Teléfono Contacto': act.contact?.phone_no || act.contact?.mobile_no || '',
      'Ubicación': act.location || '',
      'Concepto / Asunto': act.title || '',
      'Detalle de la Reunión': act.description || '',
      'Conclusiones y Acuerdos': act.conclusions || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-ajustar anchos de columna
  const colWidths = [
    { wch: 12 }, // Fecha
    { wch: 8 },  // Hora
    { wch: 22 }, // Tipo
    { wch: 20 }, // Comercial
    { wch: 30 }, // Empresa
    { wch: 12 }, // Cod Cliente
    { wch: 15 }, // Ciudad
    { wch: 22 }, // Contacto
    { wch: 20 }, // Cargo
    { wch: 25 }, // Email
    { wch: 16 }, // Telefono
    { wch: 25 }, // Ubicacion
    { wch: 35 }, // Concepto
    { wch: 45 }, // Detalle
    { wch: 45 }, // Conclusiones
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Actividad Comercial');

  const startSlug = options.startDate ? options.startDate.split('T')[0] : 'periodo';
  const endSlug = options.endDate ? options.endDate.split('T')[0] : '';
  const filename = `Informe_Actividad_CRM_${startSlug}${endSlug ? `_${endSlug}` : ''}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

function formatDateString(str?: string): string {
  if (!str) return '';
  const clean = str.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return str;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
