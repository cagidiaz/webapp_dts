# Plan para mostrar nombres de adjuntos en las tarjetas de correo

**Fecha:** 16 de octubre de 2026  
**Estado:** Implementación preparada y validada automáticamente. Pendiente de despliegue y aceptación real de adjuntos en Classic/Web. Sin cambios de esquema ni escrituras en la base compartida.  
**Ámbito:** Correos nuevos registrados en el CRM y sus tarjetas de Emails y Timeline.

Mostrar los nombres de los archivos adjuntos permitirá identificar ofertas, fichas técnicas y documentación comercial sin abrir cada correo. La primera entrega guardará únicamente metadatos; los archivos seguirán en Microsoft 365.

## 1 Alcance de la primera entrega

- Mostrar una zona compacta con icono de clip y nombres debajo del contenido del correo, idéntica en Emails y Timeline.
- Conservar tipografía, tamaños, colores y modos claro y oscuro de las tarjetas actuales.
- Capturar los nombres al registrar el correo mediante el complemento, tanto en Classic como en Web.
- Excluir los elementos que Outlook marque como incrustados en el cuerpo, como las imágenes habituales de firmas. No excluir un archivo por ser PNG, JPG o por llamarse «logo»: podría ser un adjunto legítimo.
- Mantener registros, permisos y asociaciones existentes. No recuperar automáticamente el histórico, borrar registros ni volver a importar correos anteriores.

La visualización inicial será informativa: los nombres no serán enlaces de descarga. No se almacenarán archivos, cuerpos binarios, URLs privadas de descarga ni tokens. Descargar, previsualizar o enviar adjuntos desde el CRM queda fuera de esta entrega.

## 2 Situación actual y puntos de integración

El registro del complemento ya guarda datos auxiliares en el JSON `attendees` de `crm_activities`, pero el contrato de importación no incluye adjuntos. Las tarjetas utilizan la actividad y sus metadatos, por lo que no hace falta crear otra tabla ni cambiar el esquema de Supabase.

| Parte existente | Cambio previsto |
| --- | --- |
| `frontend/src/pages/outlook-addin/OutlookAddinPage.tsx` | Recoger la lista de metadatos del correo seleccionado y enviarla al registrar. |
| `frontend/public/outlook-addin/index.html` | Incorporar la misma captura en la página estática todavía utilizada por algunos manifiestos. |
| `frontend/src/api/outlookAddin.ts` | Ampliar el contrato de registro con metadatos opcionales y estados de captura. |
| `backend/src/modules/exchange-sync/outlook-addin.service.ts` | Validar la entrada y persistir el bloque de adjuntos conservando los demás metadatos. |
| `backend/src/modules/exchange-sync/exchange-sync.service.ts` | Revisar los correos nuevos preparados desde el CRM y su conciliación de borradores, para no perder adjuntos añadidos en Outlook antes de enviarlos. |
| `frontend/src/pages/crm/components/CrmContactDetail.tsx` | Propagar el bloque de adjuntos al modelo de ambas tarjetas. |
| Nuevo componente compartido en `frontend/src/pages/crm/components/` | Renderizar los nombres con el mismo aspecto y comportamiento en Emails y Timeline. |

Se revisarán también las escrituras que cambian tipología, oferta o detalles de una actividad: no deben sustituir el JSON completo y perder los nombres nuevos.

## 3 Contrato de metadatos propuesto

Guardar un bloque versionado `attendees.emailAttachments`, separado de `categoryTag`, `sentDate` y `quoteDocumentNo`. Los nombres definitivos y límites se cerrarán en la primera fase, sin modificar columnas ni tablas importadas de Business Central.

| Dato | Uso |
| --- | --- |
| Versión del contrato | Identificar correos que incorporan esta funcionalidad y evitar tratar el histórico como una lista vacía. |
| Estado de captura | Distinguir lista completa, captura pendiente, información no disponible y lista parcial. |
| Origen y fecha de captura | Indicar si se obtuvo de Office.js o de Graph y cuándo se registró. Es una fotografía del momento, no una consulta permanente al buzón. |
| Lista de nombres | Nombre de cada adjunto visible. El tamaño puede conservarse como dato opcional si está disponible, sin convertirlo en requisito. |
| Indicador de lista parcial y total conocido | Evitar presentar un listado truncado como completo o inventar un número de adjuntos. |

Una lista completa y vacía significa «no se detectaron adjuntos visibles». La ausencia del bloque significa «no se registraron estos datos», como ocurrirá en los correos antiguos. Un fallo de captura no debe guardarse como una lista vacía confirmada.

**Límites propuestos:** hasta 100 nombres por correo y 512 caracteres por nombre. Son límites de metadatos, no del tamaño de los archivos. Si se alcanzan, se debe indicar que la lista es parcial; nunca recortar sin avisar ni bloquear por ello el registro comercial.

El backend validará estructura, tipos, longitudes y número de elementos. Los nombres se tratarán como texto: no se interpretarán como HTML, rutas o enlaces. No se eliminarán nombres repetidos solo por coincidir: un correo puede contener dos adjuntos distintos con el mismo nombre.

## 4 Captura y rendimiento

### Correos registrados desde el complemento

En lectura, usar los metadatos de adjuntos del elemento seleccionado en Office.js. En redacción, comprobar si el cliente admite la API asíncrona correspondiente; cuando no esté disponible, informar del estado sin impedir registrar el correo. La captura debe corresponder al elemento actual, sin reutilizar datos del correo anterior si cambia la selección.

Como alternativa controlada cuando sea necesaria, consultar desde backend los metadatos del mensaje ya identificado y del buzón autorizado mediante Graph. Solicitar únicamente propiedades de metadatos, sin `contentBytes`, sin `/value` y con paginación acotada. No consultar por asunto ni abrir acceso a otro buzón para obtener nombres.

### Borradores nuevos preparados desde el CRM

Si un correo se prepara desde el CRM y después se le añaden adjuntos en Outlook, su lista inicial puede cambiar antes del envío. Para esos registros nuevos se marcará la captura como pendiente y se completará una vez durante la conciliación existente del mensaje enviado, conservando su identidad exacta. No se añadirán barridos históricos ni un planificador nuevo.

Si la conciliación no puede obtener los metadatos, se conservará el estado «no disponible» o «pendiente» según el caso. No se retrasará ni se repetirá el envío para obtener los nombres.

### Consulta de tarjetas

Las tarjetas leerán los nombres guardados en la actividad. Abrir una ficha o cambiar de pestaña no generará llamadas Graph por cada correo. Si ya hay un snapshot completo, no se volverá a pedir para renderizarlo.

No se espera necesitar permisos Microsoft adicionales: el proyecto ya solicita `Mail.ReadWrite`, y Graph permite consultar adjuntos con lectura de correo. Se comprobarán las capacidades reales de Classic y Web durante la implementación. No se prevé modificar el manifiesto de Office ni el componente Windows de apertura, porque no se descargarán ni abrirán archivos desde él.

## 5 Presentación propuesta

Debajo del texto del correo, una fila que permita salto de línea:

**Adjuntos:** `Oferta.pdf` · `Ficha técnica.xlsx` · `Condiciones.pdf` · **+2 más**

- Mostrar inicialmente hasta tres nombres. «+N más» desplegará los restantes nombres guardados, sin consultar Microsoft.
- Mantener los nombres largos recortados visualmente, con el nombre completo accesible mediante título y al expandir, sin ensanchar la tarjeta.
- Utilizar clip e iconos por extensión solo como ayuda visual; no implican descarga, vista previa ni validación del formato real.
- No mostrar la zona de adjuntos en correos antiguos sin metadatos o en una lista completa vacía. La ausencia visual no se etiquetará como «sin adjuntos» si no se conocen los datos.
- Cuando haya un problema de captura en un correo nuevo, mostrar una indicación discreta de información no disponible; cuando se alcance el límite, indicar lista parcial.

## 6 Fases de implementación

| Fase | Trabajo | Condición para avanzar |
| --- | --- | --- |
| 1 Contrato y compatibilidad | Confirmar campos, límites, estados, rutas de registro, edición y conciliación; comprobar las APIs en los clientes reales. | Contrato que distinga vacío, desconocido y parcial, sin SQL ni cambios de permisos inesperados. |
| 2 Captura y persistencia | Ampliar DTO y clientes del complemento, guardar metadatos opcionales y completar los borradores nuevos en la conciliación existente. | Registrar sin duplicar actividades, sin contenido binario y sin perder tipología, oferta, fecha u otros metadatos. |
| 3 Tarjetas compartidas | Añadir un único componente y utilizarlo en Emails y Timeline. | Mismo diseño, tres nombres iniciales, expansión local y adaptación clara/oscura y a pantallas estrechas. |
| 4 Pruebas y correcciones | Verificar entradas, filtros de incrustados, cambios de elemento, conservación de datos, duplicados y rendimiento. Compilar backend y frontend. | Pruebas relevantes superadas y cero errores de compilación. |
| 5 Despliegue y aceptación | Desplegar backend compatible primero y frontend después, actualizar documentación y comprobar registros reales con el responsable. | El mismo correo muestra la misma lista en ambas pestañas y en registros desde Classic y Web. |

Antes de editar código se actualizará la rama con los cambios de la carpeta local. Al terminar se sincronizarán los archivos verificados con la carpeta local para pruebas. No se hará push ni despliegue automático.

## 7 Pruebas de aceptación

| Caso | Resultado esperado |
| --- | --- |
| Recibido con PDF y Excel, registrado en Classic y en Web | Nombres correctos e iguales en Emails y Timeline. |
| Enviado con varios adjuntos | Se registran los adjuntos del mensaje seleccionado, sin confundirlos con otro correo del hilo. |
| Firma con imágenes incrustadas y un archivo legítimo | Se excluyen únicamente los elementos marcados como incrustados; se conserva el archivo. |
| Dos archivos con el mismo nombre | Se conservan ambos elementos si Outlook los distingue. |
| Más de tres adjuntos, nombres largos y caracteres especiales | Expansión local, texto legible y sin desbordamiento ni ejecución de HTML. |
| Límite de metadatos o respuesta paginada | Lista parcial explícita, sin número total inventado ni descarga del contenido. |
| Cambiar de correo mientras el complemento sigue abierto | No se guardan los nombres del elemento anterior. |
| Sin adjuntos, captura fallida y registro antiguo | Se distinguen esos estados y no se falsea una lista vacía. |
| Editar categoría, oferta o detalles | Los metadatos de adjuntos se conservan. |
| Registrar dos veces el mismo mensaje | No se duplica la actividad y no se destruye el snapshot ya guardado. El histórico no se enriquece automáticamente. |
| Añadir un adjunto a un borrador nuevo en Outlook y enviarlo | La conciliación existente recoge los nombres finales del mensaje enviado. |
| Consultar una ficha con muchos correos | Renderizado desde los datos guardados, sin peticiones Graph por tarjeta. |
| Permisos y cartera | Solo se consulta el buzón autorizado; los nombres guardados se muestran con los permisos existentes de la actividad del CRM. |

## 8 Riesgos y tratamiento

| Riesgo | Tratamiento |
| --- | --- |
| Confundir firmas con documentos | Usar `isInline`; no heurísticas por nombre o extensión. |
| Clientes con APIs distintas | Detectar capacidades y conservar estado desconocido si falta información; no bloquear el registro del correo. |
| Datos de un borrador que cambian después | Completar la captura de registros nuevos cuando se resuelva el enviado, sin recuperar el histórico. |
| Fallo temporal o límite de Microsoft | No bloquear el registro, no descargar bytes y no iniciar reintentos ilimitados. |
| La lista guardada difiere de cambios posteriores en el buzón | Tratarla como metadatos del momento de registro, sin prometer sincronización permanente. |
| Backend y frontend desplegados en momentos distintos | Contrato opcional y retrocompatible; desplegar backend primero. |
| Pérdida de otros campos del JSON | Fusionar y probar las escrituras de metadatos, manteniendo las asociaciones y fechas. |

La vuelta atrás consistirá en ocultar el bloque de nombres y detener su captura para registros nuevos. No se borrarán los metadatos ya guardados, las actividades ni las asociaciones. La apertura y respuesta actuales seguirán independientes.

## 9 Documentación de cierre

Al implementar, actualizar las guías de [Contactos y correos](../vistas/03_crm/crm_contactos_mails.md), [complemento Outlook](../vistas/03_crm/complemento_outlook_crm.md), el [índice de vistas](../vistas/README.md), el [manual de usuario](../manual-usuario.md) y el [manual del complemento](../manual-instalacion-addin-outlook.md), distinguiendo implementación y aceptación real.

Referencias oficiales: [metadatos de adjuntos con Office.js](https://learn.microsoft.com/mt-mt/javascript/api/outlook/office.attachmentdetails?view=outlook-js-1.16) y [listado de adjuntos con Graph](https://learn.microsoft.com/en-us/graph/api/message-list-attachments?view=graph-rest-1.0).


## 10 Registro de ejecución (16/10/2026)

Fases 1–4 implementadas. Se verificó que la rama y la carpeta local partían del mismo HEAD y que los archivos principales coincidían antes de editar. La entrega incluye helper Office común, contrato opcional validado en servidor, componente compartido de tarjetas, marcador para borradores nuevos y conciliación mediante identidad exacta.

El panel estático utiliza ahora la ruta de registro con control de duplicados cuando el correo está guardado e identificado. Los elementos de redacción sin ID conservan la ruta genérica; en ese caso no se promete deduplicación por identidad ni conciliación de ese borrador. No se convierten registros históricos a la ruta nueva.

Las ediciones de categoría/oferta y la conciliación actualizan las claves JSON en transacciones, conservando metadatos ajenos y evitando pérdidas por concurrencia. La paginación Graph se limita a cuatro páginas; se valida el host, mensaje y selección de propiedades en cada enlace. Los fallos de metadatos no impiden confirmar el envío y nunca provocan un reenvío.

Validación: suite backend, pruebas del helper Office y del componente (captura, errores, espera agotada, cambio de mensaje, límites, escape HTML, expansión y estilo oscuro), pruebas PostgreSQL aisladas de las escrituras JSON y compilaciones frontend/backend. Los comandos reproducibles son `npm test -- --runInBand` en backend, `node scripts/check-email-attachments.cjs` y `node scripts/check-email-actions.cjs` en frontend, y `backend/test/pilot-db/run-portable.ps1` desde la raíz. El script de PostgreSQL crea un entorno local desechable, exige puerto/base de pruebas y lo detiene al terminar; no usa Supabase compartido.

**Fase 5 pendiente del responsable:** desplegar backend y frontend, volver a abrir el complemento y realizar la matriz de aceptación con correos nuevos reales. Sin SQL, reinstalación de Classic, cambios de manifiesto ni permisos adicionales. No se realiza push ni despliegue automático.

### Estado de la documentación

Manuales, guías de vistas, índice y guía general de integración actualizados. La revisión visual de adjuntos sigue pendiente porque el visor de la sesión bloqueó los archivos locales. La aceptación previa de apertura y respuestas en producción no se aplica a esta nueva entrega. Procedimiento de comprobación: [manual de instalación, sección 10](../manual-instalacion-addin-outlook.md#10-nombres-de-adjuntos-actualización-del-registro).
