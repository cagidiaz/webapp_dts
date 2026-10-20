# 📘 Guía de Usuario: Integración y Sincronización con Microsoft Exchange y Outlook

> **Entrega del 19/10/2026, pendiente de despliegue:** Outlook verificado para todos los perfiles activos con permiso CRM por rol. Sin listas por correo ni flags de piloto. Ajustes utiliza el ZIP Classic 1.1.0 y la vinculación de equipos. Véase «Uso general de Outlook verificado» al final; las secciones anteriores fechadas describen entregas históricas.

> **dTS Instruments WebApp** — Módulo CRM Comercial  
> *Versión del Documento:* v1.0  
> *Dirigido a:* Equipo Comercial, Operaciones y Administradores

---

## 1. 🌟 Introducción y Objetivos

La plataforma **dTS Instruments** cuenta con un motor de sincronización bidireccional nativo con **Microsoft Exchange / Microsoft 365 (Outlook y Teams)**.

### ¿Qué beneficios aporta al comercial?
* **Cero duplicidad de trabajo:** Crea una reunión o visita en el CRM y aparecerá al instante en tu calendario de Outlook (móvil y PC).
* **Detección inteligente:** Si agendes una reunión en Outlook invitando a un cliente, el CRM la registra automáticamente en la ficha del contacto.
* **Envío real de correos:** Redacta y envía correos desde el CRM con plantillas corporativas; saldrán desde tu propia cuenta Exchange y quedarán archivados en tus **"Elementos enviados"** de Outlook.
* **Trazabilidad 360°:** Todo el histórico de correos, notas, citas y ofertas queda unificado en la ficha del cliente y su contacto.

---

## 2. 🔑 Paso a Paso: Conexión de tu Cuenta Microsoft 365

Cada empleado con acceso al CRM conecta su propia cuenta de correo corporativo con un solo clic.

```
┌────────────────────────────────────────────────────────────────────────┐
│  CRM Comercial — dTS Instruments                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ ✉️ Integración Microsoft Exchange / Outlook 365   [Sin conectar]  │  │
│  │ Conecta tu cuenta de correo Exchange para sincronizar agenda... │  │
│  │                                 [ Conectar con Microsoft 365 🔗 ]│  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Proceso de Vinculación (Se realiza una sola vez):
1. Entra en la sección **CRM** desde el menú lateral de la aplicación.
2. En la parte superior verás el banner informativo de **Integración Microsoft Exchange / Outlook 365**.
3. Pulsa el botón azul **`Conectar con Microsoft 365`**.
4. Se abrirá la página oficial de inicio de sesión de **Microsoft**.
5. Selecciona tu cuenta de correo corporativa (`tu-nombre@dtsinstruments.com`) e introduce tu contraseña / factor de doble autenticación si es requerido.
6. Acepta los permisos de acceso para lectura y escritura de tu calendario y correo.
7. Al finalizar, serás redirigido automáticamente al CRM y el banner cambiará a:
   > **`🟢 Microsoft 365 Conectado (tu-nombre@dtsinstruments.com)`**

---

## 3. 📅 Sincronización de Calendario y Eventos

El sistema sincroniza automáticamente todas las actividades con fecha y hora entre el CRM y tu calendario personal de Outlook.

```
                     ┌────────────────────────┐
                     │     CRM Comercial      │
                     └───────┬────────▲───────┘
  Crea/Edita Visita          │        │  Detecta reunión con contacto
  o Reunión con cliente      │        │  por coincidencia de email
                             ▼        │
                     ┌────────────────┴───────┐
                     │   Microsoft Outlook    │
                     │  (Calendario & Teams)  │
                     └────────────────────────┘
```

---

### A. Proceso Manual (Desde el CRM hacia Outlook)

1. Entra a la ficha de cualquier empresa o persona de contacto en el CRM.
2. En la pestaña **Eventos** o **Timeline**, pulsa **`+ Nueva Actividad`**.
3. Selecciona el tipo de actividad:
   * **Reunión Presencial**: Citas presenciales con el cliente.
   * **Videollamada**: Genera automáticamente enlace de **Microsoft Teams**.
   * **Visita a Cliente**: Si no especificas ubicación, toma la dirección física del cliente registrada en el CRM.
   * **Llamada Telefónica / Tarea / Evento**: Para llamadas o tareas programadas en agenda.
4. Indica la **Fecha**, **Hora**, **Ubicación** y notas descriptivas.
5. Pulsa **`Guardar y Sincronizar`**.

#### 🎯 ¿Qué ocurre automáticamente tras guardar?
* El evento se crea de inmediato en tu calendario de Outlook.
* Se añade al contacto como **asistente invitado** si dispone de correo electrónico.
* En el CRM, la actividad mostrará la etiqueta verde **`✓ Outlook`** y un botón con enlace directo para abrir el evento en Outlook Web o unirte a la reunión de Teams con un clic.
* Si editas la hora o eliminas el evento en el CRM, el cambio se actualiza o cancela automáticamente en Outlook.

---

### B. Proceso Automático (Desde Outlook hacia el CRM)

1. Abre tu **Microsoft Outlook** habitual (escritorio, navegador web o app móvil).
2. Crea una reunión en tu calendario e invita a la dirección de correo electrónico del cliente/contacto.
3. Guarda la reunión en Outlook.

#### 🤖 ¿Qué hace el CRM en segundo plano?
* El motor de sincronización de dTS analiza los asistentes de tus reuniones recientes.
* Si detecta que el correo de un asistente coincide con un contacto o cliente registrado en el CRM:
  * **Crea automáticamente** la actividad de tipo `REUNION` en la ficha de dicho contacto.
  * Asocia el cliente, la fecha, hora, asunto y enlace web de Outlook.
  * Si modificas la hora en Outlook, el CRM actualiza la fecha en su timeline automáticamente.

---

## 4. ✉️ Sincronización y Envío de Correos Electrónicos

```
┌────────────────────────────────────────────────────────────────────────┐
│  REDACTAR Y ENVIAR CORREO DESDE CRM                                    │
│                                                                        │
│  Plantilla: [ Seguimiento de propuesta comercial — dTS Instruments ▾ ] │
│  Para:      [ contacto@cliente.com                                   ] │
│  Asunto:    [ Seguimiento de propuesta comercial — dTS Instruments    ] │
│  Cuerpo:    [ Estimado/a Juan, le escribo para hacer seguimiento...  ] │
│                                                                        │
│                                 [ Cancelar ] [ Enviar por Exchange ✉️ ] │
└────────────────────────────────────────────────────────────────────────┘
```

---

### A. Envío de Correos desde el CRM (Vía Exchange)

1. Entra a la ficha de un contacto y ve a la pestaña **Emails** o pulsa en **`Redactar Email`**.
2. **Plantillas Corporativas dTS**: Puedes elegir entre varias plantillas predefinidas:
   * *Presentación comercial dTS*: Presentación general de soluciones analíticas.
   * *Seguimiento de oferta pendiente*: Mensaje de cortesía para cotizaciones enviadas.
   * *Agradecimiento por su tiempo*: Seguimiento post-reunión.
   * *Texto libre*: Para escribir un correo personalizado desde cero.
3. Las plantillas sustituyen automáticamente las variables `[Contacto]`, `[Nombre Empresa]` y `[Vendedor]`.
4. Pulsa **`Enviar por Exchange`**.

#### 🎯 ¿Qué ocurre tras el envío?
* El correo sale **autenticado de forma real y directa** desde tu buzón de Exchange (`tu-nombre@dtsinstruments.com`).
* Queda archivado en tu carpeta de **"Elementos enviados"** de Outlook como si lo hubieses redactado desde tu cliente de correo habitual.
* Se registra de inmediato en el historial de actividades del contacto en el CRM con fecha, hora y texto enviado.

---

### B. Recepción y Sincronización Automática desde Outlook

* Cuando intercambias correos con un cliente desde Outlook (tanto recibidos en tu Bandeja de Entrada como enviados desde tu Outlook):
  * El CRM detecta que la conversación pertenece a un contacto registrado.
  * Indexa el mensaje en la pestaña **Emails** y en el **Timeline** del contacto, limpiando pies legales repetitivos para mantener notas legibles.
  * **Ordenación Cronológica por Fecha y Hora**: Todos los mensajes se ordenan de forma descendente estricta según su momento exacto de llegada o envío. En correos electrónicos, la hora se extrae prioritariamente de `attendees.sentDate` o `attendees.receivedDateTime`, permitiendo que múltiples correos cruzados en un mismo día se lean en perfecto orden temporal.
  * **Resolución Dinámica Segura para Apertura Web**: La acción "Abrir en Outlook Web" invoca el resolvedor backend (`POST /api/exchange-sync/emails/:activityId/resolve`) que localiza el mensaje exacto mediante su `ImmutableId` incluso si se ha movido entre carpetas, utilizando una ventana preabierta y aislando su contexto con `window.opener = null`; si falla, se informa al usuario.
  * **Diseño Homogéneo de Tarjetas**: Las tarjetas de correo en la pestaña Emails y en el Timeline comparten la misma presentación estética (fondos blanco/zinc translúcido, tonos verdes esmeralda para tramitados, ámbar para pendientes de conclusiones y botones interactivos oficiales de Outlook).

---

### C. Complemento de Outlook (Add-in dTS CRM)

Además de la sincronización de fondo, dispones del **Complemento oficial de Outlook** (Add-in dTS CRM):
* **Panel Lateral en Outlook con Sesión Integrada (`OutlookAddinSession`)**: Permite abrir la ficha rápida del cliente sin salir de tu correo. Si tu sesión expira, presenta un formulario de inicio de sesión embebido sin redirigir fuera del panel de Outlook.
* **Aislamiento y Confidencialidad por Cartera Comercial (RBAC)**: Búsqueda y vinculación restringida a los clientes y contactos asignados a tu código de comercial (`salesperson_code`).
* **Persistencia con Identidad Inmutable Estable (`ImmutableId`)**: Traduce de forma determinista el identificador volátil de Office.js (`ewsId`) a un `ImmutableId` inalterable en Microsoft Graph, garantizando que el correo pueda volver a abrirse fielmente aunque se traslade de carpeta en el buzón.
* **Presentación Limpia y Clasificación en 5 Tipologías**: Selección de categorías oficiales (`Petición oferta`, `Oferta proveedor`, `Revisión oferta`, `Negociación`, `Cierre/Aceptación`) con limpieza automática de avisos de confidencialidad y firmas extensas.
* **Clasificación a Ofertas Específicas**: Vinculación ágil con cotizaciones abiertas del cliente conservando las reglas comerciales correspondientes.

---

### D. Apertura exacta en Classic y equipos vinculados

La nueva apertura de Classic se activa por cuenta y requiere instalar el componente Windows y vincularlo al usuario del CRM. No cambia la instalación del Add-in para registrar correos. El usuario ha aprobado distribuirlo internamente sin certificado de editor; cada solicitud del equipo sigue protegida mediante su propia clave.

Abre `/outlook-classic`, descarga el ZIP, extráelo completo y ejecuta `Instalar_Outlook_dTS.bat`. Confirma en el CRM el código mostrado y vuelve al componente para terminar. En Emails y Timeline se conserva la preferencia de cliente; si falla Classic, puedes elegir Web. Las respuestas y búsquedas mantienen por ahora el flujo existente.

El movimiento de carpeta dentro del mismo buzón está validado en Web. Para Classic se ha verificado la localización real del correo sin mostrarlo; falta aceptar la instalación, vinculación y apertura completa. Las tablas ya están creadas. No se da por validado el acceso a PST, archivo en línea, buzones compartidos ni buzones de otros comerciales.

Guía paso a paso: [instalación, revocación e incidencias](manual-instalacion-addin-outlook.md#7-instalador-interno-para-abrir-correos-en-outlook-classic).

---

## 5. 🛠️ Herramientas de Control, Ajustes y Preguntas Frecuentes

### Pantalla de Configuración y Preferencias (`/settings`)
En la nueva sección de **Ajustes** de la WebApp puedes:
* **Elegir tu Cliente de Outlook Predeterminado**: Selecciona entre **Outlook de Escritorio (Windows/Mac)** o **Outlook Web (Microsoft 365)**. El sistema recordará tu preferencia de forma permanente en tu navegador para abrir los correos y borradores siempre en tu cliente favorito.
* **Instalador de apertura exacta de Classic**: Para las cuentas habilitadas, utiliza el ZIP y la vinculación de `/outlook-classic`. El configurador de Ajustes pertenece al flujo heredado y no reemplaza el nuevo componente. Sigue el [manual de instalación](manual-instalacion-addin-outlook.md#7-instalador-interno-para-abrir-correos-en-outlook-classic).
  * El instalador nuevo registra `dts-outlook` por usuario Windows y exige completar la vinculación con el CRM.
  * El antiguo configurador de Ajustes registra `dts-mail` y conserva la búsqueda por asunto para los flujos heredados. No acredita apertura exacta ni instalación del componente nuevo.
  * El navegador puede recordar preferencias, pero descargar un BAT no demuestra que se haya ejecutado. Windows puede mostrar avisos o bloquear ejecutables conforme a sus políticas.
* **Probar la Apertura**: Dispone de un botón interactivo de validación para asegurar que tu cliente de Outlook abre correctamente.

### Detección Proactiva de Sesión Expirada y Reconexión
Si por políticas de seguridad corporativas de Microsoft o actualización de permisos en Azure AD tu sesión requiere re-autenticación (`AADSTS65001 / consent_required`):
* El banner del CRM y la pantalla de Ajustes mostrarán el distintivo **"Sesión expirada"**.
* Un botón directo **"Reconectar con Microsoft 365"** te permitirá reanudar la sincronización interactiva en 5 segundos sin errores ni bloqueos.

### Botón "Sincronizar ahora"
En la parte superior derecha del banner de Exchange dispones del botón **`Sincronizar ahora`**.
* **Uso recomendado:** Si acabas de agendar una reunión en Outlook y deseas verla reflejada de inmediato en el CRM sin esperar el ciclo periódico, pulsa este botón.

### Desconexión de Cuenta
Si cambias de equipo o deseas revocar el acceso a tu cuenta:
* Pulsa el icono de desconexión (**Desconectar cuenta**) en el banner o en Ajustes y confirma la acción.

---

## 6. ❓ Preguntas Frecuentes (FAQ)

| Pregunta | Respuesta |
| :--- | :--- |
| **¿Mis eventos personales se guardan en el CRM?** | **No.** El CRM solo indexa reuniones cuyos asistentes coincidan con correos de contactos o clientes dados de alta en dTS. Tus eventos personales permanecen privados. |
| **¿Tengo que volver a conectar mi cuenta cada día?** | **No.** La conexión utiliza un sistema de renovación automática de credenciales (*refresh token*). Solo tendrás que volver a conectar si cambias tu contraseña de Microsoft 365 o si expira el plazo de seguridad. |
| **¿Qué significa el aviso "Sesión expirada" o "consent_required"?** | Significa que Microsoft 365 requiere que confirmes nuevamente los permisos interactivos de acceso al buzón. Pulsa en **"Reconectar con Microsoft 365"** para solucionarlo en un clic. |
| **¿Qué ocurre si borro una reunión en Outlook?** | El sistema detectará la cancelación y actualizará o eliminará el evento del CRM para mantener la agenda al día. |
| **¿Los clientes reciben invitaciones al crear un evento en CRM?** | **Sí.** Si el contacto tiene su dirección de correo configurada, Outlook enviará la invitación estándar de calendario con opción de aceptar/rechazar. |
| **¿Puedo cambiar entre abrir los correos en Outlook Web o Outlook Escritorio?** | **Sí.** Puedes cambiarlo en cualquier momento desde **Ajustes** (`/settings`) y tu elección se guardará automáticamente. |
| **¿Cómo funciona la apertura en Outlook Classic?** | En el piloto habilitado, el componente vinculado recibe una solicitud temporal y verifica el mensaje en el buzón correcto antes de mostrarlo. Usa `dts-outlook`; fuera del piloto permanece el flujo heredado `dts-mail`. |
| **¿Requiere permisos de administrador el instalador de Outlook Classic?** | No. Extrae todo el ZIP y ejecuta el BAT con tu usuario habitual. Después confirma el código en el CRM y completa la vinculación en el componente. |

---

*Documentación elaborada para el equipo comercial de dTS Instruments.*

## 7. Nombres de adjuntos en el CRM

**Estado a 16/10/2026:** implementación comprobada automáticamente y en PostgreSQL aislado. Captura y visualización de nombres verificadas por el usuario con un correo real; cliente Outlook y casos adicionales no detallados. La apertura y las respuestas de la entrega anterior ya fueron confirmadas por el usuario en producción.

### Flujo y almacenamiento

1. Al registrar un correo, el helper compartido `frontend/public/email-attachment-metadata.js` consulta los metadatos del elemento seleccionado con Office.js. En redacción detecta la disponibilidad de la API asíncrona; espera como máximo tres segundos.
2. El panel React y el panel estático, cuando el mensaje está guardado e identificado, envían `emailAttachments` a `POST /outlook-addin/log-email`, que conserva autorización y control de duplicados. Los elementos estáticos sin ID mantienen `POST /crm-activities`: no ofrecen deduplicación por identidad ni conciliación de ese borrador.
3. El servidor valida y guarda únicamente una fotografía de metadatos en `crm_activities.attendees.emailAttachments`. No cambia el esquema ni las tablas sincronizadas desde Business Central.
4. `EmailAttachments.tsx` muestra la misma fotografía en Emails y Timeline, debajo del cuerpo. Visualizar tarjetas no consulta Microsoft Graph.
5. Los borradores nuevos preparados desde el CRM llevan estado pending. La conciliación existente del enviado obtiene una vez sus nombres finales mediante la identidad exacta y Graph. No crea un planificador ni recupera el histórico.

| Campo | Uso |
| --- | --- |
| `version` | Versión 1 del contrato. Su ausencia distingue registros anteriores. |
| `status` | complete: lista confirmada; partial: incompleta; pending: esperando confirmación del envío; unavailable: captura no disponible. |
| `source` | office, graph o crm; el servidor fija el origen según la ruta. |
| `capturedAt` | Fecha de captura registrada por el servidor. |
| `files` | Hasta 100 elementos con `name` de hasta 512 caracteres y `size` opcional en bytes. |
| `totalKnown` | Número conocido de adjuntos visibles; null cuando se desconoce. |

Se excluyen solo los elementos marcados `isInline === true`, no extensiones o nombres de archivo. Se conservan nombres repetidos. Un límite o dato incompleto produce estado partial. Una lista completa vacía oculta el bloque; un registro antiguo sin datos también lo oculta, sin afirmar que no tenía adjuntos. Los nombres son texto informativo y no enlaces de descarga.

### Datos protegidos y rendimiento

No se almacenan archivos, bytes, URLs privadas, tokens ni IDs de adjuntos. La consulta Graph selecciona únicamente `name,size,isInline`, limita la paginación a cuatro páginas y valida host, mensaje y parámetros de cada página. Las ediciones de categoría/oferta y la conciliación combinan claves JSON dentro de transacciones para conservar los demás metadatos, incluso con lecturas anteriores de la actividad.

Un fallo de metadatos no bloquea el registro ni provoca repetir un envío. La lista guardada es una fotografía del momento; no promete reflejar cambios posteriores en el buzón. La vuelta atrás consiste en detener la captura y ocultar el bloque, conservando los datos guardados.

### Despliegue y soporte

Desplegar backend compatible antes que frontend y volver a abrir el complemento. No requiere SQL, cambios de manifiesto, permisos Microsoft adicionales ni reinstalación del componente Classic. La vinculación del equipo permanece independiente.

| Síntoma | Interpretación y actuación |
| --- | --- |
| Un correo antiguo no muestra adjuntos | No se capturaron estos metadatos. Conservar el registro y consultar el mensaje en Outlook. |
| Información no disponible | La captura falló o la API no estaba disponible. No equivale a una lista vacía confirmada. |
| Lista parcial | Se alcanzó un límite o faltan datos; abrir Outlook para consultar la lista completa. |
| Pendientes de confirmar tras el envío | El borrador nuevo del CRM espera su conciliación; comprobar envío, cuenta conectada y sincronización de correo. No reenviarlo para obtener los nombres. |
| Ha cambiado el correo seleccionado | Volver a abrir el complemento sobre el mensaje correcto. El registro se cancela para no mezclar datos. |
| No aparecen los cambios tras desplegar | Cerrar y abrir el panel, comprobar la publicación de backend y frontend y registrar un correo nuevo. |

Pruebas y límites detallados en el [plan ejecutado](propuestas/2026-10-16-plan-nombres-adjuntos-correos-crm.md). [Aceptación paso a paso](manual-instalacion-addin-outlook.md#10-nombres-de-adjuntos-actualización-del-registro) y [manual de usuario](manual-usuario.md#nombres-de-adjuntos-en-las-tarjetas-de-correo).

### Verificación real comunicada el 16/10/2026

El usuario indicó: «he probado sincronizar un correo con adjuntos y los muestra perfectamente, esa funcionalidad ya esta verificada». Queda registrada la captura y visualización correcta de los nombres para el correo probado. No se especificó si se utilizó Classic o Web, si era enviado o recibido, ni se confirmó individualmente la matriz completa (ambas pestañas, expansión, modos claro/oscuro, incrustados o conciliación de borradores).

La corrección del borrado exclusivo del CRM y los contadores de tipología por oferta son cambios posteriores independientes: su verificación real sigue pendiente de confirmación. No se inicia ninguna recuperación histórica ni se modifica ningún registro por esta actualización documental.

## Uso general de Outlook verificado (19/10/2026)

**Entrega preparada para desplegar y validar.** Se retira el fallback antiguo de apertura y el configurador `dts-mail` de Ajustes y de las descargas públicas. Abrir un mensaje concreto, Responder y Responder a todos utilizan siempre la identidad verificada: Microsoft Graph en Web y componente `dts-outlook` en Classic. Si falta una identidad o un equipo vinculado, se explica el problema y se ofrece la configuración o Web; no se busca otro mensaje por asunto.

La búsqueda de conversaciones se conserva como **«Buscar conversación en Outlook Web»**, independiente de la preferencia Classic/Web. Copiar datos de búsqueda continúa disponible. La redacción de correos nuevos y los eventos de calendario conservan sus flujos existentes; no son el fallback antiguo de apertura de mensajes.

Ajustes descarga **`/downloads/outlook-classic/OutlookClassic.zip`**, versión **1.1.0**, cuando su metadata está publicada, y enlaza a **`/outlook-classic`** para vincular, revisar o revocar equipos propios. Extraer el ZIP completo y ejecutar `Instalar_Outlook_dTS.bat` con el usuario Windows habitual, sin administrador. Si el componente ya estaba instalado y la base restaurada perdió el vínculo, usar `Vincular_Outlook_dTS.bat`. El ejecutable no cambia en esta entrega; no es necesario reinstalar un componente 1.1.0 que funciona y conserva su vínculo.

El acceso se administra mediante los permisos de rol ya existentes para CRM/Contactos y los perfiles activos. No hay excepciones por correo electrónico. Las antiguas variables `CRM_EMAIL_IDENTITY_ENABLED`, `CRM_EMAIL_IDENTITY_EMAILS`, `CRM_OUTLOOK_CLASSIC_ENABLED` y `CRM_EMAIL_REPLY_ENABLED` dejan de controlar el flujo; pueden retirarse de Dokploy al desplegar. No alteran ya la disponibilidad aunque conserven valores antiguos. Se mantienen OAuth por usuario, pertenencia al buzón y cartera, firma de solicitudes, versión compatible del componente y vinculación/revocación de cada equipo. Los permisos se revisan en backend en cada operación.

**Despliegue:** publicar backend y frontend de esta entrega, recargar la app y comprobar perfil activo/rol, apertura Web/Classic, respuestas, descarga del ZIP y búsqueda Web. No requiere SQL adicional si ya están recuperados el esquema de identidad, las tablas Classic y `action`. No se modifica ninguna tabla sincronizada desde BC ni se inicia recuperación histórica. Tras desplegar, comprobar también que denegar el permiso de CRM por rol impide las operaciones aunque el equipo permanezca vinculado.

## Administración global de vinculaciones (19/10/2026)

Gestión de usuarios incorpora la pestaña «Vinculaciones Outlook», exclusiva de ADMIN activo. `GET /users/outlook` combina metadatos de perfiles, cuentas Microsoft 365 y equipos; `POST /users/outlook/devices/:id/revoke` revoca una vinculación con autorización comprobada en cada operación. Son rutas nuevas de API dentro de Usuarios; no hay nueva ruta frontend ni tablas adicionales.

Las consultas usan la conexión Prisma de backend. El estado de conexión se calcula en SQL sin devolver tokens; los dispositivos se proyectan solo a campos de presentación, sin claves ni hashes. La revocación actualiza exclusivamente `revoked_at`, es idempotente y el manejador Classic la comprueba antes de consumir solicitudes firmadas. Se conserva la gestión personal de equipos en `/outlook-classic`.

Una vinculación vigente y una conexión registrada no acreditan presencia online ni una comprobación inmediata de Microsoft Graph. [Operación y diagnóstico](vistas/06_administracion_configuracion/administracion_usuarios_rbac.md#pestaña-3-vinculaciones-outlook-19102026). Sin migración SQL ni cambios de permisos sobre tablas BC. Entrega pendiente de prueba real tras publicar backend y frontend.


## Cierre de las pruebas principales de Outlook (20/10/2026)

El usuario confirma: «adjuntos tras editar aprobado», «correo preparado desde crm aprobado» y «segundo usuario pruebas ok». Estas tres aceptaciones completan la lista principal junto con las aprobaciones de prueba sin borradores, vinculaciones, permisos por rol, avisos flotantes y contadores por oferta. Se mantienen las validaciones anteriores de apertura y respuestas Classic/Web, enviados/recibidos, cambio de carpeta, adjuntos y borrado exclusivo del CRM.

La apertura con Classic abierto y cerrado también finalizó correctamente con 1.1.2 (2,51 s y 6,23 s desde solicitud emitida hasta confirmación, respectivamente). No se aplica optimización de rendimiento. Este cierre es aceptación funcional del recorrido principal; no certifica todos los escenarios posibles. Los nombres de adjuntos muy largos, la selección de varias copias y múltiples cuentas siguen sin confirmación específica. PST, archivo en línea y buzones compartidos no quedan acreditados por estas pruebas. Sin cambios de código, SQL ni datos.
