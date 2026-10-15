# Plan de apertura híbrida de correos de Outlook desde el CRM

**Fecha:** 15 de octubre de 2026  
**Estado:** Propuesta para revisión, sin implementación funcional autorizada todavía  
**Destinatario:** Dirección y responsable de la aplicación  
**Ámbito:** Tarjetas de correos en Emails y Timeline, complemento de Outlook, integración Microsoft 365 y componente de escritorio.

El objetivo es abrir el mensaje original aunque se cambie de carpeta, respetando la preferencia entre Outlook Web y Outlook Classic. Las dos opciones compartirán una identificación fiable del correo. Si no se puede determinar qué mensaje es, la aplicación ofrecerá recuperación o búsqueda explícita y no abrirá otro por parecido del asunto.

Se propone sustituir progresivamente el manejador VBS por un componente local mantenible para Classic y utilizar Microsoft Graph para resolver la identidad del mensaje. Antes de construir ese componente se comprobará su viabilidad con las versiones y cuentas reales de la empresa.

## 1 Situación inicial y alcance

La rama `codex/inicio-trabajo` se ha actualizado mediante avance directo al commit local `ccb4372`, que corrige la generación del instalador BAT. También se han incorporado las modificaciones locales pendientes de `docs/manual-usuario.md`, `docs/vistas/03_crm/crm_pipeline.md` y `docs/vistas/README.md`, conservando los demás cambios del piloto. Las diferencias restantes detectadas entre los archivos comparados eran de terminaciones de línea.

Este plan no modifica la aplicación, la instalación de Outlook ni Supabase. La sincronización inicial solo incorpora trabajo ya existente en la carpeta local. La limpieza descrita se ejecutará dentro de las fases posteriores, tras revisar el plan.

El primer alcance propuesto cubre Microsoft 365 y movimientos entre carpetas del mismo buzón, con apertura web o en Outlook Classic de Windows. El nuevo Outlook utilizará la vía web mientras no se valide una apertura nativa específica. Los buzones compartidos, el archivo en línea y los PST se inventariarán antes de fijar su cobertura; no se prometen como equivalentes al buzón principal.

Las tablas actualizadas desde Business Central siguen siendo de solo lectura, incluidos estructura, permisos y triggers. Los cambios de identidad de correo se limitarán a datos propios del CRM y de su integración Microsoft 365.

## 2 Componentes existentes y decisión propuesta

| Componente | Qué existe | Decisión para el nuevo flujo |
| --- | --- | --- |
| `CrmContactDetail.tsx` | Emails y Timeline invocan la misma utilidad de apertura, pero repiten acciones y construcción de parámetros. | Mantener tarjetas, estilos y contenido. Compartir el componente de acciones y enviar el identificador de la actividad al backend. |
| `frontend/src/api/exchangeSync.ts` | Preferencia escritorio o web, apertura directa por enlaces e identificadores y alternativas por composición o búsqueda. | Mantener preferencia y composición de correos nuevos. Sustituir la apertura de mensajes existentes por una resolución autenticada. |
| `OutlookAddinPage.tsx` y `outlookAddin.ts` | Se registra `item.itemId` sin normalizar su formato y se envía `userEmail`. | Mantener registro, tipologías y vinculación comercial. Identificar el buzón mediante autenticación y normalizar el mensaje al registrarlo. |
| `outlook-addin.controller.ts` | Sus rutas no declaran guardas de autenticación y reciben la identidad por campos del cliente. | Incorporar autenticación válida para el complemento y comprobar permisos del usuario; el correo indicado en el cuerpo no acreditará identidad. |
| `OutlookAddinService` | Guarda el identificador y comprueba duplicados por `exchange_item_id`. | Compartir la resolución de identidad y comprobar duplicados dentro del buzón y del ámbito de la actividad. |
| `MicrosoftGraphService` | OAuth, renovación de tokens, creación de borradores y consulta de mensajes recientes. | Reutilizar conexión y renovación. Añadir identificación estable, traducción de formatos y consulta exacta del mensaje. |
| `ExchangeSyncService` | Algunos borradores enviados se asocian por destinatario y fecha entre los últimos mensajes enviados. | Sustituir esa asociación aproximada por seguimiento del mensaje exacto. Mantener la sincronización de agenda. |
| `outlookInstaller.ts` y carpeta pública `outlook-handler` | Script, instaladores y registro del protocolo; hay varias representaciones del mismo paquete. | Mantener temporalmente durante la transición. Sustituir por una única fuente del paquete, versión y comprobación real de instalación. |
| `crm_activities` | Guarda identificador, enlace web y estado de Exchange para emails y también eventos. | Ampliación aditiva y específica para emails. No reinterpretar identificadores de calendario. |

El manejador actual puede abrir la primera coincidencia de asunto sin comprobar destinatario o remitente. La búsqueda automática se limita a Entrada y Enviados, con un recorrido adicional de hasta 300 elementos por carpeta. Además, la descarga del BAT marca la instalación como realizada y el protocolo se intenta lanzar por dos vías. Estos comportamientos se sustituirán, sin trasladarlos al componente nuevo.

## 3 Flujo propuesto para el usuario

1. El usuario pulsa el icono de Outlook en una tarjeta de Emails o Timeline.
2. El backend comprueba que puede consultar esa actividad y el buzón correspondiente.
3. Resuelve el mensaje mediante su referencia estable y recupera los datos actuales de apertura.
4. Si la preferencia es web, abre el `webLink` actual devuelto por Graph. El navegador preabrirá una pestaña durante el clic para evitar bloqueos de ventanas emergentes.
5. Si la preferencia es Classic, emite una solicitud temporal al componente local. Este selecciona la cuenta y el almacén adecuados, obtiene el mensaje y verifica su identidad antes de mostrarlo.
6. El componente informa del resultado real al CRM. Que Windows acepte el protocolo no contará como mensaje abierto.
7. Si falla, el usuario recibe una causa concreta y puede elegir abrir en web, reconectar Microsoft 365, buscar o revincular el correo.

La búsqueda y la composición serán acciones independientes. Pulsar «Abrir correo» no creará un correo nuevo. Una búsqueda con varios resultados requerirá selección del usuario.

## 4 Identidad y datos mínimos

La referencia principal será la combinación de buzón y `ImmutableId` de Microsoft Graph. Se conservarán el identificador original y su formato para migración, y `internetMessageId` como ayuda de recuperación. Este último no será una clave universal única: pueden existir copias del mismo mensaje.

Los identificadores inmutables permanecen estables al mover mensajes dentro del mismo buzón, pero cambian al trasladarlos al buzón de archivo o exportarlos y reimportarlos. No se cambiarán mayúsculas ni minúsculas al compararlos. [Alcance oficial de los identificadores inmutables](https://learn.microsoft.com/en-us/graph/outlook-immutable-id).

Se propone ampliar `crm_activities`, sin crear una nueva tabla de correos de entrada, con estos datos conceptuales. Los nombres definitivos y el SQL se cerrarán en la fase 1:

| Dato | Uso |
| --- | --- |
| Buzón de origen | Identificador estable de Microsoft y tenant o contexto de cuenta, para no confundir cuentas ni reconexiones. |
| Identificador inmutable | Localización principal del email mediante Graph. |
| Tipo del identificador original | Diferenciar EWS, REST y otros formatos conocidos sin adivinarlos por su aspecto. |
| `internetMessageId` | Recuperación y verificación adicional cuando exista. |
| Estado y fecha de resolución | Distinguir referencias recuperadas, pendientes o no localizadas y evitar reintentos innecesarios. |

El identificador y enlace actuales se conservarán durante la transición. No se almacenarán copias adicionales del cuerpo, adjuntos ni todos los mensajes del buzón. Se reutilizará `user_exchange_accounts.microsoft_user_id` cuando identifique correctamente la cuenta; la identidad del buzón registrado no dependerá de que su conexión OAuth siga activa.

Los índices se diseñarán para la consulta por buzón e identificador. Si un correo ya se vincula a varias actividades comerciales, la migración conservará esas asociaciones; no impondrá una unicidad que las borre.

## 5 Fases de implementación

| Fase | Trabajo | Resultado para revisar | Estimación inicial |
| --- | --- | --- | --- |
| 0 | Prueba de viabilidad y alcance de clientes Outlook | Apertura exacta en web y Classic tras mover mensajes y con dos cuentas | 2 a 3 jornadas |
| 1 | Diseño de identidad, permisos y migración | Contrato de datos, SQL aditivo y diseño del componente local | 2 a 3 jornadas |
| 2 | Registro correcto de correos nuevos | Complemento y borradores con referencias estables | 3 a 4 jornadas |
| 3 | Resolución central y apertura web | Servicio autenticado, estados de error y vía web completa | 4 a 6 jornadas |
| 4 | Componente de Outlook Classic | Paquete versionado, apertura exacta y confirmación de resultado | 6 a 10 jornadas |
| 5 | Recuperación del histórico y unificación visual | Informe de referencias y acciones comunes en Emails y Timeline | 3 a 5 jornadas |
| 6 | Piloto de uso real | Registro de incidencias y validación del responsable | 5 días laborables |
| 7 | Retirada del flujo antiguo | Código obsoleto retirado y documentación vigente | 1 a 2 jornadas |

Son estimaciones de trabajo, no fechas comprometidas. En secuencia equivalen aproximadamente a 5 a 8 semanas de dedicación completa, incluyendo el piloto. La disponibilidad de equipos de prueba, firma del instalador y revisiones puede alargar el calendario.

### Fase 0 Comprobar la apertura exacta en Classic

Inventariar versiones de Outlook, Windows, Edge o Chrome, cuentas adicionales, buzones compartidos y uso de archivo en línea o PST. Seleccionar mensajes de prueba, incluidos dos con el mismo asunto.

Probar una cadena completa: identificador EWS o REST de origen, conversión a Graph inmutable, traducción al identificador actual de MAPI y apertura en el almacén correspondiente de Classic. La representación binaria devuelta por Graph necesita conversión al formato esperado por Outlook; no se pasará directamente a `GetItemFromID`. [Conversión oficial de identificadores](https://learn.microsoft.com/en-us/graph/api/user-translateexchangeids?view=graph-rest-1.0).

Mover un mensaje a una subcarpeta y repetir la prueba. Abrir también con varias cuentas configuradas y con Outlook inicialmente cerrado. La fase solo se acepta si se muestra el correo exacto o un fallo explícito. Si la conversión no funciona en alguna configuración, se delimitará su cobertura y alternativa web antes de construir el instalador.

### Fase 1 Definir los contratos y la migración

Confirmar el esquema real de las tablas propias del CRM en Supabase mediante lectura. Preparar SQL aditivo, índices y procedimiento de reversión sin borrar actividades ni tocar tablas de BC.

Definir el contrato de resolución por actividad, la identificación del buzón y la autenticación del complemento. El servidor comprobará identidad, acceso a la actividad y permiso efectivo en Microsoft 365. Ser Admin o Dirección en el CRM no concederá acceso automático al buzón de otro comercial.

Definir la autenticación y asociación del componente local con el usuario. Las solicitudes tendrán caducidad, uso único, acción limitada y resultado autenticado. No se incluirán tokens de Microsoft, cuerpos ni adjuntos en la URI del protocolo.

### Fase 2 Registrar bien los correos nuevos

Normalizar los identificadores recibidos desde el complemento y obtener buzón, identificador inmutable y referencia adicional cuando estén disponibles. Mantener las tipologías y vínculos con clientes, contactos, prospectos y ofertas.

Aplicar la solicitud de identificadores inmutables a las operaciones Graph de correo pertinentes, incluidas las páginas siguientes de una consulta. No modificar el formato de los eventos de calendario como efecto secundario.

Seguir el borrador exacto hasta su envío, con reintentos limitados por la demora de disponibilidad en Enviados. Cuando el envío no ofrezca inmediatamente una referencia verificable, dejarlo pendiente de resolución. Retirar la asociación automática basada solo en destinatario y fecha.

### Fase 3 Resolver el correo y abrir la vía web

Implementar un único servicio de resolución utilizado por ambos modos. Buscar primero por la referencia estable. Para registros antiguos, traducir el identificador conocido o recuperar candidatos por `internetMessageId` dentro del buzón autorizado. Si hay varias copias, solicitar selección; el asunto no decidirá la identidad.

Obtener el enlace web actual de Graph y validar su destino antes de abrirlo. Tratar por separado sesión expirada, permiso insuficiente, mensaje no localizado, respuesta temporal de Microsoft y límite de peticiones. Un error de autenticación no se presentará como correo eliminado.

Limitar las consultas a los correos solicitados, con caché breve, concurrencia acotada y respeto de `Retry-After`. No recorrer todo el buzón ni sincronizarlo de nuevo por cada clic.

### Fase 4 Sustituir el VBS por un componente local

Propuesta técnica: aplicación ligera de Windows en .NET, ejecutada en la sesión del usuario y distribuida mediante instalador firmado y versionado. La elección definitiva dependerá de la prueba inicial y del método de distribución disponible.

El componente recibirá una solicitud temporal, seleccionará el buzón y almacén correctos y verificará la identidad del mensaje antes de abrirlo. Si se mueve entre resolución y apertura, podrá resolver una vez más con límite de intentos. No elegirá por defecto la primera cuenta ni hará una búsqueda aproximada que abra un resultado automáticamente.

Mantener instalación, actualización y desinstalación por usuario cuando la política de Windows lo permita. Comprobar versión y funcionamiento mediante una comunicación real; descargar el instalador no equivaldrá a instalarlo. Un solo lanzamiento del protocolo por clic y confirmación del resultado evitarán aperturas duplicadas.

Validar la firma, distribución y actualización del paquete. No se considerará completada esta fase con un prototipo sin el mecanismo de actualización acordado.

### Fase 5 Migrar el histórico y compartir las acciones

Clasificar referencias existentes por buzón y formato. Migrar en lotes pequeños reanudables, conservando los originales. Los casos ambiguos o cuyo identificador ya no sea recuperable quedarán pendientes de revinculación; no se enlazarán por proximidad del asunto o la fecha.

Crear un único componente de acciones para las tarjetas de Emails y Timeline. Mantener el diseño, tamaños y modos claro y oscuro existentes. Conservar «Abrir», «Responder», «Responder a todos», «Buscar conversación» y «Copiar búsqueda» cuando proceda, distinguiendo claramente el mensaje exacto de una búsqueda.

Separar «Responder» de «Responder a todos»: el manejador actual llama a `ReplyAll` para la acción `reply`. En web se utilizará una respuesta vinculada al mensaje, no una composición independiente con el prefijo `Re:`. Ninguna de estas acciones enviará el correo sin intervención del usuario.

### Fase 6 Validar con usuarios y mensajes reales

Activar el nuevo flujo mediante una opción específica de esta funcionalidad para los usuarios de prueba que se designen. Esta activación no se vinculará al piloto de Oportunidades ni cambiará los roles o permisos de vista existentes.

Recoger estados y tiempos de resolución, aperturas confirmadas por el componente, fallos por causa y referencias pendientes. No registrar tokens ni cuerpos de mensajes. La apertura web permitirá comprobar navegación y enlace, pero no se afirmará que el usuario leyó el correo.

El responsable validará el resultado antes de extenderlo. Un fallo que abra otro correo bloqueará la ampliación del piloto.

### Fase 7 Retirar el flujo anterior

Retirar los componentes antiguos únicamente cuando la sustitución esté probada, los usuarios afectados dispongan del paquete nuevo y las referencias pendientes sean conocidas. La vuelta atrás mantendrá la vía web exacta y los datos existentes, sin reactivar la apertura aproximada por asunto.

Actualizar documentación de la vista, complemento, ajustes y manual de usuario. Mantener las propuestas anteriores como antecedentes y marcarlas como sustituidas, sin borrar el histórico documental.

## 6 Limpieza concreta del flujo

| Retirar o sustituir | Momento | Condición previa |
| --- | --- | --- |
| Búsqueda por asunto que abre el primer resultado | Fase 3 para la vía nueva y fase 7 para el código antiguo | Resolución exacta y búsqueda manual disponibles |
| Paso directo de EWS o REST a `GetItemFromID` | Fase 4 | Conversión y selección de almacén verificadas |
| Recorrido automático de Entrada y Enviados y límite de 300 elementos | Fase 4 | Resolución por identidad operativa |
| Fallback de abrir correo a `mailto:` o composición web | Fase 3 | Pantalla de recuperación y alternativas explícitas |
| Doble lanzamiento del protocolo y deducción de éxito por pérdida de foco | Fase 4 | Comunicación real con el componente local |
| Marca de instalación al descargar el BAT | Fase 4 | Diagnóstico de instalación y versión |
| Asociación de borrador enviado solo por destinatario y fecha | Fase 2 | Seguimiento exacto o estado pendiente sin asociación falsa |
| Duplicación de acciones en Emails y Timeline | Fase 5 | Componente común con el diseño actual |
| VBS, BAT y registro antiguo para esa versión del protocolo | Fase 7 | Paquete nuevo distribuido y recuperación web disponible |
| Copias independientes de scripts e instaladores | Fase 7 | Una fuente del paquete y generación verificable de los artefactos |

Se conservarán el OAuth existente, la renovación de tokens, preferencias de cliente, registro comercial de correos, creación de correos nuevos, historial del CRM, acciones de búsqueda explícita y sincronización de calendario. Antes de eliminar una utilidad compartida se comprobarán sus consumidores de correo, agenda y ajustes.

## 7 Pruebas y criterios de aceptación

| Caso | Resultado exigido |
| --- | --- |
| Mover un correo a una carpeta o subcarpeta del mismo buzón | Abrir el mismo mensaje en web y Classic |
| Dos mensajes con el mismo asunto | No confundirlos ni abrir la primera coincidencia |
| Mensaje de la misma conversación | Distinguir cada mensaje del hilo |
| Dos cuentas en Outlook y sesión web de otra cuenta | Elegir el buzón correcto o pedir autenticación |
| Borrador enviado y varios correos al mismo destinatario | Asociar únicamente el mensaje verificado |
| Mensaje eliminado definitivamente o referencia antigua perdida | Informar y mantener el histórico del CRM |
| Archivo en línea, otra cuenta o PST | Cumplir la cobertura validada o informar de la limitación sin abrir otro correo |
| Sin permiso en el buzón | Denegar apertura aunque se pueda consultar la actividad del CRM |
| Componente ausente, antiguo o navegador que bloquea el protocolo | Explicar la causa y ofrecer web sin aperturas duplicadas |
| Graph devuelve límite de peticiones o fallo temporal | Reintento limitado, sin marcar el mensaje como borrado |
| Solicitud local caducada o reutilizada | Rechazarla |
| Emails y Timeline en modo claro y oscuro | Mismas acciones y estilo existente |
| Eventos de calendario, envío nuevo y registros de prospectos | Mantener su funcionamiento |

Se combinarán pruebas de permisos y resolución en backend, contratos simulados de Graph y pruebas manuales con cuentas de Microsoft 365 y Outlook Classic. Las comprobaciones que escriban datos usarán una base aislada o datos propios de prueba expresamente delimitados; nunca alterarán tablas importadas de BC.

La aceptación exige cero aperturas de mensajes incorrectos en la matriz de prueba, resolución de todos los movimientos internos previstos y errores explícitos para los casos fuera de cobertura. Se medirá la latencia durante la prueba inicial antes de comprometer un objetivo de segundos.

## 8 Decisiones para cerrar antes del desarrollo

1. Confirmar qué versiones de Outlook Classic y Windows deben soportarse y si hay usuarios del nuevo Outlook.
2. Identificar si los buzones compartidos y el archivo en línea son obligatorios en el primer despliegue. Distinguirlos de una carpeta llamada «Archivo» dentro del buzón principal.
3. Confirmar la alternativa visible cuando falle Classic: propuesta de botón «Abrir en web», sin cambiar silenciosamente la preferencia.
4. Acordar distribución del componente local, certificado de firma y responsable de mantener sus actualizaciones.
5. Designar usuarios del piloto y quién valida la ampliación.
6. Confirmar que los correos antiguos no recuperables quedarán visibles en el CRM con opción de revinculación manual.

El siguiente trabajo tras revisar el plan será la prueba de viabilidad de la fase 0. La limpieza del código anterior se hará después de verificar su sustitución, y no durante la preparación de este documento.
