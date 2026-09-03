# 🚀 Actualización: Mercado Internacional en Inteligencia Geográfica y Autocompletado de Sedes en CRM

**Fecha:** 3 de septiembre de 2026  
**Módulos Afectados:** Ventas (Cartera de Clientes & Mapa Geográfico), CRM Comercial (Actividades & Reuniones)  
**Versión:** v5.9  

---

## 1. 🌍 Inteligencia Geográfica: Mercado Internacional / Exportación (`/sales/customers`)
* **Detección y Clasificación de Clientes Internacionales**:
  * Los clientes con código de país extranjero (fuera de España y Portugal: ej. Francia, Alemania, Italia, Reino Unido, Suiza, EE. UU., etc.) ahora se identifican y segregan automáticamente de la proyección cartográfica ibérica.
  * Se asigna visualmente la bandera del país y su denominación en el ranking lateral y en la tabla.
* **Filtro Rápido y Banner Interactivo en el Mapa**:
  * Nuevo botón interactivo en la cabecera del mapa: **`🌍 Ver Internacionales (X)`**, que indica el número exacto de clientes de exportación.
  * Al activarlo, se despliega un banner informativo fijado al mapa y se sincroniza instantáneamente el ranking lateral y la tabla de clientes.
* **Soporte Bidireccional en Servidor (`backend`)**:
  * El endpoint `/customers` soporta ahora el parámetro `territory=INTL` (o `Internacional`), filtrando a nivel de base de datos todos los registros con código de país distinto de `ES` y `PT`.
* **Tag y Desactivación Rápida**:
  * Se añade una etiqueta identificativa `🌍 Internacional / Exportación` en la barra de filtros activos de la tabla con botón de borrado inmediato (`✕`).

---

## 2. 📍 CRM: Autocompletado Inteligente de Sede en Reuniones Presenciales (`/crm/contacts`)
* **Carga Automática de Dirección de la Empresa**:
  * En la pestaña **Eventos** del detalle del contacto, al crear una nueva actividad y seleccionar el tipo **Reunión Presencial** (`REUNION`), el campo `Ubicación / Lugar` se rellena de forma automática con la dirección oficial completa de la empresa asociada (calle, número, código postal, localidad y provincia).
* **Botón de Relleno y Restauración Rápida**:
  * Se incorpora un botón interactivo junto a la etiqueta del campo: **`📍 Usar dirección de la empresa`**.
  * Permite recuperar o rellenar la dirección de la sede con un solo clic en caso de haberla modificado o borrado accidentalmente.
  * Disponible tanto en el formulario de **Nueva Actividad** como en el de **Editar Actividad**.
* **Tipado Robusto en Frontend**:
  * Actualización de la interfaz `ContactDataRow.customer` para incluir explícitamente `address`, `address_2`, `post_code`, `city`, `county` y `country_reg_code`.

---

*dTS Instruments — Registro de Actualizaciones del Sistema.*
