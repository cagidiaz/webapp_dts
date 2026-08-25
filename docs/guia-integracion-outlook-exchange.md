# 📘 Guía de Usuario: Integración y Sincronización con Microsoft Exchange y Outlook

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

---

### C. Complemento de Outlook (Add-in dTS CRM)

Además de la sincronización de fondo, dispones del **Complemento oficial de Outlook**:
* **Panel Lateral en Outlook**: Permite abrir la ficha rápida del cliente sin salir de tu correo.
* **Clasificación a Ofertas Específicas**: Si deseas vincular un correo a una oportunidad concreta del embudo (`sales_quotes_crm`) o añadir notas adicionales de negociación, puedes hacerlo directamente desde el panel lateral del complemento.

---

## 5. 🛠️ Herramientas de Control y Preguntas Frecuentes

### Botón "Sincronizar ahora"
En la parte superior derecha del banner de Exchange dispones del botón **`Sincronizar ahora`**.
* **Uso recomendado:** Si acabas de agendar una reunión en Outlook y deseas verla reflejada de inmediato en el CRM sin esperar el ciclo periódico, pulsa este botón.

### Desconexión de Cuenta
Si cambias de equipo o deseas revocar el acceso a tu cuenta:
* Pulsa el icono de desconexión (**Unlink / Romper enlace**) situado junto al botón de sincronización y confirma la acción.

---

## 6. ❓ Preguntas Frecuentes (FAQ)

| Pregunta | Respuesta |
| :--- | :--- |
| **¿Mis eventos personales se guardan en el CRM?** | **No.** El CRM solo indexa reuniones cuyos asistentes coincidan con correos de contactos o clientes dados de alta en dTS. Tus eventos personales permanecen privados. |
| **¿Tengo que volver a conectar mi cuenta cada día?** | **No.** La conexión utiliza un sistema de renovación automática de credenciales (*refresh token*). Solo tendrás que volver a conectar si cambias tu contraseña de Microsoft 365. |
| **¿Qué ocurre si borro una reunión en Outlook?** | El sistema detectará la cancelación y actualizará o eliminará el evento del CRM para mantener la agenda al día. |
| **¿Los clientes reciben invitaciones al crear un evento en CRM?** | **Sí.** Si el contacto tiene su dirección de correo configurada, Outlook enviará la invitación estándar de calendario con opción de aceptar/rechazar. |

---

*Documentación elaborada para el equipo comercial de dTS Instruments.*
