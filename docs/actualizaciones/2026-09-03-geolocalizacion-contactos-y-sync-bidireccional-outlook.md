# Actualización: Localización de Contactos y Sincronización Bidireccional de Calendario con Outlook

**Fecha:** 3 de septiembre de 2026  
**Módulos afectados:** CRM (`/crm/contacts`, `/crm/contacts/:id`), Backend (`contacts`, `crm-activities`, `exchange-sync`), Ventas (`/sales/customers`).

---

## 1. Localización Física y Centro de Trabajo en Contactos

Se amplió el modelo de datos de `contacts` en Supabase y Prisma para almacenar la ubicación física específica de cada interlocutor:

* **Nuevos campos incorporados:**
  * `address`: Dirección / Calle y número.
  * `address2`: Dirección complementaria (planta, puerta, edificio, dpto.).
  * `city`: Ciudad o municipio.
  * `post_code`: Código postal.
  * `county`: Provincia o estado.
  * `territory_code`: Código de territorio o zona comercial.
* **Índices de base de datos:** Creados índices en base de datos para optimizar las consultas por localidad y provincia (`idx_contacts_city`, `idx_contacts_county`, `idx_contacts_territory_code`).
* **Búsqueda global y en tabla:**
  * El buscador predictivo de contactos permite filtrar en tiempo real por ciudad, provincia, código postal o territorio.
  * La tabla de contactos muestra un badge de ubicación geográfico con icono de mapa bajo la denominación del cliente.
* **Ficha de detalle del contacto:**
  * Nueva tarjeta de **"Ubicación del Contacto / Centro de Trabajo"** en la pestaña *Información* con dirección completa y enlace directo a Google Maps.
  * Modal de edición rápida (*"Editar ubicación"* / *"Asignar ubicación"*) para actualizar los datos geográficos del contacto sin salir del CRM.
* **Autocompletado jerárquico en reuniones presenciales:**
  * Al agendar una reunión presencial (`REUNION`), el sistema comprueba en primer término si el contacto dispone de centro de trabajo propio registrado; de ser así, se autocompleta con su dirección específica. Si no, toma la sede de la empresa como alternativa predeterminada.

---

## 2. Sincronización Bidireccional de Calendario con Microsoft Outlook

Se perfeccionó la integración con Microsoft Exchange y Outlook Calendar para resolver la sincronización de eliminaciones y categorización visual:

* **Detección y purga activa de eventos eliminados en Outlook:**
  * Implementado `checkCalendarEventExists` y `purgeDeletedCalendarActivities` en el backend.
  * Cada vez que se consulta la agenda comercial (`getAgenda`), las actividades de un contacto (`getByContact`) o de un cliente (`getByClient`), el sistema valida al vuelo las citas vinculadas con Outlook y **elimina al instante de la base de datos de Supabase cualquier cita borrada directamente en Outlook**.
* **Categoría corporativa dTS CRM:**
  * Registro y sincronización de la categoría maestra **`dTS CRM`** con color corporativo (`preset7` - Azul dTS) en Microsoft Graph con permisos `MailboxSettings.ReadWrite`.
  * Envío limpio de la categoría `dTS CRM` sin subetiquetas secundarias que pudieran provocar visualizaciones grises en clientes de correo.
* **Botón de sincronización en pestaña de Eventos:**
  * Incorporado el botón **"Sincronizar"** (con animación de refresco) en la cabecera de la pestaña *Eventos*, junto a *"Nueva Actividad"*.
  * Sincronización automática en segundo plano al cambiar entre las pestañas *Eventos* y *Timeline*.
* **Corrección de consulta delta en Microsoft Graph:**
  * Corregido el error de llamada delta en `calendarView/delta`, sustituyendo el parámetro `$top` no permitido por el encabezado estándar `Prefer: odata.maxpagesize=50`.

---

## 3. Estandarización y Calidad de Código (Tailwind CSS)

* Estandarizadas las clases de estilos en `CrmContactDetail`, `CustomersPage`, `IberianGeoSalesMap` y `CrmContacts`, reemplazando colores hexadecimales directos por los tokens oficiales `dts-secondary` y adaptando dimensiones fijas a clases Tailwind estándar.
