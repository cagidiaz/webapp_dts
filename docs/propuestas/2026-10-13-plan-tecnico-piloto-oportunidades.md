# Plan técnico del piloto de CRM - Oportunidades

Fecha: 13 de octubre de 2026.

Estado: requisitos funcionales acordados y diseño técnico propuesto. Este documento prepara la implementación; no acredita que las funciones estén desarrolladas ni que se haya aplicado una migración.

### Avance de implementación de la primera entrega

Se ha preparado en la rama el módulo `prospects`, el modelo local y una propuesta SQL sin ejecutar. La primera interfaz real reutiliza los estilos y el `Drawer` actuales y permite creación, edición, cambio Fase 0/Fase 1, tabla/Kanban, búsqueda, archivo/restauración y auditoría. Admin puede editar sin cambiar propietario; Dirección consulta. El piloto permanece desactivado por defecto.

Para conservar los consumidores actuales de eventos con cliente obligatorio, `crm_prospect_events` se utiliza exclusivamente como auditoría y `crm_prospect_activities` como seguimiento comercial local. No se modifica ni vacía la relación de cliente de `crm_activities`. La ficha de cliente consulta el seguimiento por la vinculación actual del prospecto; no copia ni reasigna actividades.

La asociación reversible con BC, las actividades locales, las fases de Ofertas, los motivos de cierre, los cortes e informes están preparados en la rama. Outlook está preparado y desactivado. Quedan pendientes las pruebas de integración con PostgreSQL/Supabase aislado, validación del ciclo BC, coincidencias aproximadas y decisiones de métricas indicadas al final. Antes de trasladar el trabajo a la carpeta local se revisarán los cambios del usuario desde la última sincronización. No se han aplicado cambios a Supabase.

Validación: esquema Prisma generado sin conexión real, compilaciones y pruebas de permisos, datos y versiones mediante dobles, además de recorridos de navegador con datos de ejemplo. Estas verificaciones no sustituyen las pruebas de integración con Supabase. El build conserva una advertencia de tamaño de paquete.

## 1. Base de trabajo y alcance

La rama `codex/inicio-trabajo` coincide con la carpeta local `C:/proyectos/webapp_dts` en el commit `3933bda`, sin cambios pendientes al iniciar esta revisión. Antes de programar se volverá a comprobar la carpeta local e integrar sus novedades. Al terminar el trabajo se integrará en la carpeta local para las pruebas del usuario, conservando cualquier trabajo concurrente. El despliegue y la subida a GitHub requieren la instrucción posterior del usuario.

Antoni Ciurans, identificado inicialmente por `aciurans@dtsinstruments.com`, es el comercial que trabaja en la primera entrega del piloto. La configuración deberá resolver el perfil autenticado y su código comercial, sin confiar en un email enviado por el navegador. Admin y Dirección tienen consulta global y generación de cortes manuales. Admin también puede editar datos y fase de los prospectos del piloto, conservando su propietario. Los otros comerciales conservan el funcionamiento actual y los campos de BC durante el piloto.

### Base compartida confirmada

El usuario confirma que la aplicación local utiliza la misma base de Supabase que producción. Ejecutar la app en local no aísla sus escrituras: un prospecto, evento o modificación que se guarde desde el piloto será un dato real compartido.

- Preparar los cambios de esquema como archivos revisables, sin ejecutar automáticamente migraciones, `db push`, reinicios, limpieza ni cargas de prueba sobre la conexión existente.
- Realizar las pruebas automáticas con datos simulados o una base aislada. Una compilación no debe lanzar escrituras de inicialización.
- Planificar una migración compatible con los consumidores actuales. En particular, al permitir eventos sin cliente, adaptar primero todas las lecturas que suponen un cliente presente o mantener esos eventos fuera del flujo anterior mediante un destino explícito.
- Mantener el piloto desactivado por defecto. La habilitación de Antoni, las migraciones y las primeras escrituras se revisarán sobre el resultado concreto antes de ejecutarlas en la base compartida.
- Conservar las tablas importadas desde BC y la fuente anterior para el resto de comerciales. Las nuevas escrituras se limitan a entidades y metadatos CRM del piloto.
- Preparar comprobaciones de copia de seguridad, reversión y conciliación antes de aplicar el cambio. Desactivar el piloto debe conservar sus datos y su histórico, sin borrados automáticos.
- No insertar empresas, ofertas o contactos ficticios de BC para satisfacer relaciones del esquema.

## 2. Diseño y componentes existentes

- Conservar la ruta y el contenedor actuales de Oportunidades. Incorporar las pestañas Prospección y Ofertas dentro de esa vista.
- Ambas pestañas admiten Kanban y tabla. Los filtros y resultados se mantienen coherentes al alternar la vista.
- En Ofertas conservar la barra actual de búsqueda, año, comercial según rol y tipo de oferta, con el selector Tablero/Tabla y sus estilos originales. Las seis fases del Kanban permanecen en una sola fila; cuando falte espacio se usa desplazamiento horizontal, nunca una distribución de tres columnas arriba y tres abajo.
- La maqueta de navegador de Ofertas se ha reconstruido desde una copia del componente actual y el CSS compilado del proyecto, con un adaptador de datos simulados sin peticiones externas. No usar esa copia privada como sustituto de la implementación con permisos y datos reales.
- Reutilizar el componente compartido `Drawer`, las tarjetas, las tablas, los filtros, la tipografía y los tokens de `frontend/src/index.css`.
- Usar el selector global de tema de `useUIStore`. La vista real no añadirá un selector de tema independiente como el utilizado para explorar el prototipo.
- Comprobar modo claro y oscuro, etiquetas, desplegables, fichas, mensajes de error y estados vacíos.
- Mantener búsqueda con `keepPreviousData` y foco durante recargas.
- El prototipo interactivo valida recorridos. Sus menús y distribución no sustituyen a los componentes reales de la aplicación.

## 3. Hallazgos de la revisión

| Elemento actual | Hallazgo | Consecuencia para el diseño |
| --- | --- | --- |
| `contacts` | `contact_no`, `client_id` y `name` son obligatorios en Prisma. | Un prospecto sin BC necesita identidad local, sin introducir un cliente ficticio ni modificar la tabla importada. |
| `crm_activities` | `client_id` y la relación con `customers` son obligatorios. | Los eventos deben poder pertenecer a un prospecto sin cliente, conservando el flujo existente de actividades de clientes. |
| `sales_quotes_crm` | Ya conserva el seguimiento modificado desde la app. | Aprovechar esta tabla y preservar las columnas importadas de `sales_quotes` durante la convivencia. |
| Cambio de fase | La interfaz actual dispone de actividad, nota y una alternativa de cambio sin motivo. | El piloto exigirá actividad y nota en el servidor y no admitirá omitirlas. |
| Outlook | El Add-in puede marcar Ganada automáticamente a partir de la tipología del correo. | Para ofertas del piloto, registrar el correo y exigir el cierre explícito del comercial con motivo. Conservar el flujo anterior para el resto. |
| Permisos | Algunas consultas por contacto/cliente y mutaciones de oferta no transmiten o aplican todavía la propiedad del usuario de forma uniforme. | Añadir comprobación de ámbito en cada operación nueva y en los endpoints reutilizados para el piloto. |

Estos hallazgos proceden del código de la rama. La estructura efectiva de Supabase, las políticas y los flujos n8n se comprobarán antes de preparar el despliegue de datos.

## 4. Modelo local de prospección propuesto

Crear una entidad CRM local, con nombre técnico por confirmar `crm_prospects`, independiente de `contacts` importada de BC.

| Dato | Regla |
| --- | --- |
| Identificador estable | No cambia al editar, convertir o archivar. |
| Propietario | Perfil del comercial autenticado. El propietario y Admin pueden editar los datos y la fase del prospecto. Dirección tiene consulta global. La edición de Admin conserva el propietario original y registra al administrador como autor del cambio. |
| Empresa | Obligatoria. Conservar nombre visible y nombre normalizado para duplicados. |
| Persona, email, teléfono | Opcionales. Validar el formato si se informa un email. |
| Fase | Fase 0 o Fase 1. Movimiento en ambos sentidos. |
| Archivo | Fecha y autor del archivo. Restauración sin perder la fase anterior. |
| Conversión | Cliente BC confirmado, fecha de conversión y referencia opcional al contacto BC. |
| Fechas e historial | Creación, modificación, transiciones y correcciones para métricas y auditoría. |

La propiedad y el nombre normalizado constituyen la clave de unicidad. Normalizar mayúsculas y espacios, incluyendo espacios repetidos. No eliminar signos o sufijos legales sin una decisión adicional. La restricción comprende activos, archivados y convertidos. Registrar conflictos de concurrencia y devolver un mensaje comprensible. Coincidencias aproximadas o de email/teléfono generan avisos.

En Contactos, componer el listado de contactos BC y prospectos autorizados distinguiendo el tipo de origen y su identificador. Abrir una ficha local para los prospectos reutilizando las secciones y componentes del detalle actual. No fabricar números de contacto BC.

## 5. Eventos y vinculación sin duplicación

Propuesta técnica: extender `crm_activities` con una relación opcional al prospecto y permitir que un evento local no tenga `client_id`. Mantener la relación con el cliente para las actividades existentes. Incorporar una validación que exija un destino válido y evite referencias contradictorias. Revisar todos los consumidores que actualmente suponen la presencia de `customer`.

Los eventos originados en el prospecto permanecen vinculados a su identidad local. Cuando se confirma el cliente BC, su ficha consulta también los eventos de prospectos vinculados y autorizados. No se copian filas ni se cambia su autor, fecha u origen.

Al deshacer una vinculación incorrecta, los eventos desaparecen de la consulta del cliente anterior y continúan en el prospecto. Una nueva vinculación los hace visibles en el cliente correcto. Conservar auditoría de la operación y ajustar el cálculo de conversiones.

Reutilizar las tipologías actuales, su fecha, hora, conclusiones, estados y funcionamiento de Outlook donde proceda. La documentación actual distingue Nota interna, Tarea, Llamada, Visita a cliente, Videollamada y Visita no programada, además de los correos. No sustituirlas por la lista simplificada del prototipo. Reunión interna conserva su comportamiento actual de funcionalidad pendiente. Las invitaciones que requieran destinatario necesitan un email válido; la ausencia de email no impide registrar notas ni guardar el prospecto.

La formalización no exige una oferta: el comercial confirma un cliente ya sincronizado a Supabase. Las coincidencias ayudan a seleccionar, sin asociar automáticamente por nombre o email. El vínculo no escribe en BC.

## 6. Seguimiento de ofertas y convivencia

La separación está preparada en la rama mediante tablas locales independientes, fuente persistida, versión, inicialización idempotente y resolución común de lecturas/filtros/métricas. Detalle, pruebas y limitaciones: [entrega de separación BC/app](2026-10-13-separacion-bc-app-ofertas.md). SQL sin aplicar; el código real del perfil de Antoni y los flujos n8n se validarán antes de activar. Las seis fases y la transacción única de nota/transición todavía corresponden a la siguiente entrega.

Definir explícitamente qué ofertas están bajo gestión del piloto. La fuente corresponde a la oferta y su asignación, independientemente del rol del usuario que la consulta. Inicializar el seguimiento del piloto una sola vez, conservando valores CRM existentes. Para el resto se sigue leyendo BC.

En las ofertas del piloto, un valor vacío de la app no recupera el valor anterior de BC. La misma resolución de fuente se aplica a ficha, Kanban, tablas, filtros, exportación, métricas y cortes. Revisar también Ventas - Ofertas y el Kanban del contacto.

| Fase | Probabilidad |
| --- | --- |
| Preliminar | 5% |
| Presentada | 20% |
| Evaluación | 35% |
| Negociación | 55% |
| Aprobación | 75% |
| Aceptada | 90% |
| Ganada | 100% |
| Perdida | 0% |

El Kanban muestra las seis fases abiertas, de Preliminar a Aceptada. Ganada y Perdida tienen tablas y métricas. Preliminar participa en el total abierto y ponderado. Los importes proceden de BC y las métricas usan la base sin IVA.

Al arrastrar una oferta, conservar el modal compacto de confirmación de cambio de fase, con actividad y nota. No abrir la ficha lateral como consecuencia del arrastre. La ficha lateral se abre mediante clic en la oferta. Cancelar el modal conserva fase y probabilidad anteriores. La maqueta se ha corregido para representar esta distinción.

Fase, tipo y fecha de cierre prevista son obligatorios. La probabilidad se deriva de la fase en el servidor. El comercial cambia fase desde la ficha o por arrastre, con actividad y nota obligatorias. Guardar cambio, nota y auditoría en una transacción. Ganada y Perdida requieren además selección del motivo. El catálogo definitivo está pendiente de entrega y no se reemplazará por motivos inventados en la implementación.

## 7. Cortes y permisos históricos

- Corte programado cada viernes a las 18:00, zona `Europe/Madrid`, con ajuste de verano e invierno.
- Corte inicial, cortes semanales y corte final del piloto. Histórico a partir del primer corte, sin reconstrucción retrospectiva.
- Incluir ofertas y prospectos con su identidad, propietario y estado en el instante de captura. Preservar registros archivados o convertidos necesarios para explicar las métricas.
- Guardar fuente de seguimiento, versión de reglas, sincronización, importes netos y valores congelados.
- Solo Admin y Dirección generan manualmente. Todos consultan y exportan dentro de su ámbito.
- Los cortes manuales usan el mismo proceso: motivo, captura consistente, conciliación, publicación y resultado.
- Reintentos idempotentes y registro de fallos. Publicar solo cortes completos. Una corrección produce revisión enlazada y conserva el original.
- Definir retención, copias, recuperación y tratamiento de cambios de propietario antes de producción. Preservar histórico evitando cascadas desde los registros actuales.

Las tres tablas de cortes y auditoría ya propuestas son la referencia. La relación con el tipo prospecto/oferta y los índices se cerrarán en el diseño de migración. La escritura operativa en tablas BC queda excluida.

## 8. Informes y fórmulas

Primer alcance aprobado: matriz mensual, comparación entre cortes, calidad de datos, cierres vencidos, próximas acciones, movimiento entre cortes, ganadas/perdidas y prospección.

La prospección mide empresas activas en Fase 0 y Fase 1, altas por periodo, conversiones, tasa y duración hasta conversión. Propuesta de fórmula: cohortes de creación con una fecha de observación explícita. Las correcciones no cuentan como conversiones nuevas. Deduplicar clientes BC en el agregado global cuando varios comerciales hayan vinculado prospectos al mismo cliente. Validar estas fórmulas con ejemplos antes de presentar un KPI como definitivo.

La matriz agrupa por mes de cierre aunque las fotografías sean semanales. El movimiento explica altas, bajas comerciales, fases, importes y aplazamientos. En el piloto, comprobar si hay datos incompletos iniciales sin excluirlos silenciosamente de los totales.

## 9. Entregas verificables

| Etapa | Resultado | Comprobación para avanzar |
| --- | --- | --- |
| A. Diseño técnico y migración preparada | Modelo de prospectos, eventos sin BC, configuración piloto y permisos. | Revisar esquema real, rutas y consumidores. Preparar migración reversible sin ejecutarla en producción. |
| B. Prospección | Pestañas, Kanban/tabla, creación, edición, duplicados, archivo y restauración. | Propiedad validada en API. Tema claro/oscuro. Eventos y Contactos coherentes. |
| C. Conversión | Sugerencias, selección BC, conversión y corrección. | Eventos sin duplicados, métricas corregidas y cliente aún sin oferta permitido. |
| D. Ofertas | Fases, campos obligatorios, probabilidad y cierre con motivo. | Convivencia BC/app y control de Outlook. Transiciones con nota atómicas. |
| E. Informes y cortes | Ocho informes, captura semanal/manual y exportación. | Recuentos e importes conciliados, filtros de rol, reintentos y captura parcial rechazada. |
| F. Validación local y piloto | Integración en carpeta local, formación y cuatro semanas de uso de Antoni. | El usuario revisa semanalmente y decide la extensión. |

El cronograma anterior requiere reestimación por la ampliación. No se comprometen fechas calendario ni coste sin estimación técnica.

## 10. Pruebas necesarias

- Un usuario no puede consultar, editar ni exportar registros fuera de su cartera mediante un ID o filtro manipulado.
- Admin y Dirección consultan todas las carteras y generan cortes. Admin también edita datos y fase de prospectos ajenos, sin modificar su propiedad. Dirección no recibe permiso de edición por su acceso global.
- Archivo, restauración y confirmación o corrección de la vinculación siguen reservados al propietario. La autorización adicional de Admin se refiere a la edición de los datos y la fase del prospecto.
- Dos creaciones simultáneas de la misma empresa y propietario no generan duplicados.
- Archivar/restaurar conserva fase y eventos. Convertir/desvincular conserva identidad y corrige resultados.
- BC actualiza importes y datos generales sin sobrescribir el seguimiento del piloto. Los no participantes conservan su fuente anterior.
- No cambiar de fase sin nota, aunque se invoque directamente la API. No aceptar probabilidades manuales.
- Los correos de aceptación no cierran automáticamente una oferta del piloto.
- Mismo resultado en Kanban, tabla, ficha, matriz y corte usando los mismos filtros.
- Tema claro/oscuro y ficha lateral con estados vacíos, nombres largos y campos opcionales ausentes.
- Frontend y backend compilan con cero errores antes de entregar código.

## 11. Pendientes antes de activar el piloto

### Avance: asociación con cliente BC (preparado en la rama)

- La ficha propone coincidencias por empresa, email o teléfono y permite buscar por nombre, código o email en la cartera del propietario. Se muestran hasta 50 resultados; una búsqueda más precisa permite encontrar otros clientes.
- Solo el propietario confirma o deshace la vinculación. La API comprueba que el cliente pertenece a su cartera; Admin y Dirección consultan el resultado. No se necesita una oferta ni se escribe en las tablas de BC.
- La asociación guarda el identificador del cliente y la fecha de conversión. El prospecto sale de la cartera activa y aparece en la tabla «Convertidos» y en su recuento histórico, sin eliminarse ni duplicarse.
- Al deshacerla vuelve a su fase anterior, corrige el recuento y conserva el historial de ambas operaciones. La fase queda bloqueada mientras está convertido; sus datos siguen siendo editables. No se permite archivar un convertido sin desvincularlo previamente.
- Las operaciones verifican la versión de la ficha y registran autor, cliente y fecha dentro de una transacción para evitar cambios simultáneos incoherentes.
- La creación y edición de actividades locales y su consulta en el cliente están preparadas. Los correos, informes por período y tasas de conversión siguen pendientes.
- La vista previa usa datos de ejemplo. La propuesta SQL incluye los campos y la relación con clientes, pero sigue sin ejecutarse; el piloto permanece desactivado por defecto.

### Avance: actividades del prospecto y consulta en cliente

**Conexión Outlook preparada, sin activar:** requiere `CRM_PROSPECTS_PILOT_ENABLED=true` y `CRM_PROSPECTS_OUTLOOK_ENABLED=true`, además de una cuenta del propietario conectada con sincronización de calendario activa. Los dos interruptores permanecen apagados en desarrollo. Reutiliza Microsoft Graph y las categorías actuales. Las notas no se sincronizan; llamadas, tareas y visitas no envían correos; una videollamada crea Teams y necesita email válido para invitar. Sin conexión/email, la actividad se conserva y muestra la condición pendiente.

La nueva tabla conserva ID remoto, estado, versión sincronizada, fecha, bloqueo de ejecución y payload inicial. Se usa el calendario del propietario aunque Admin cree o edite. Los cambios de fase, asociación/desasociación no crean otro evento. Un bloqueo persistido coordina ejecuciones; el alta usa el UUID de actividad como `transactionId`. Ante un resultado desconocido no se repite automáticamente el POST: queda «Creación por revisar», y el delta puede recuperar el ID por el identificador de transacción. Los errores de actualización permiten reintento sobre el ID existente. Se necesita revisar los casos sin confirmación antes de recrear manualmente un evento.

El delta actual reconoce primero los eventos de prospectos, valida propietario y recibe cambios de fecha/hora/ubicación en Madrid con auditoría. Los cambios locales pendientes tienen prioridad y no se sobrescriben. Las retiradas en Outlook conservan registro e ID y no se recrean automáticamente. La ventana de lectura heredada de Graph es de 30 días anteriores a 90 días posteriores; la comprobación fuera de esa ventana sigue pendiente. Los correos recibidos/enviados de prospectos y las recurrencias no se incorporan en esta entrega.

La vista previa simula resultados de Outlook sin conexiones ni envíos. Las pruebas de servidor usan dobles de Graph; falta la validación real con la cuenta de Antoni antes de activar. El SQL propuesto se amplía, pero sigue sin aplicarse a Supabase.

**Agenda y briefing preparados:** las citas locales se agregan a las actividades existentes con fecha, hora, tipo y propietario. Se conservan identidad, autor y origen, sin duplicarlas al convertir. Las notas sin fecha siguen en la ficha; los archivados salen de la agenda. Los filtros comerciales se aplican por propietario del prospecto, incluso cuando Admin registra una actividad. El dashboard y el briefing usan el endpoint correcto para editar/completar y respetan el permiso de consulta de Dirección. El briefing usa el día civil de Madrid y mantiene consulta personal e indicador global para Admin/Dirección. Los informes actuales muestran el origen Prospección y conservan su nombre de empresa en PDF/Excel. La conexión Outlook está preparada y desactivada; los correos siguen pendientes. No se ha aplicado el SQL.

- Tipos preparados: Nota Interna, Tarea, Llamada Telefónica, Visita a Cliente, Videollamada y Visita no programada. Reunión Interna continúa reservada como en la aplicación actual. No se crean correos ni convocatorias en esta entrega.
- Campos actuales reutilizados: título, descripción, fecha civil, hora, ubicación, conclusiones y realizado/pendiente. Una actividad programada necesita fecha; una nota puede guardarse sin fecha. Las conclusiones marcan la actividad como realizada.
- La ficha permite registrar, editar, completar y reabrir, con filtros de tipo/estado. El tipo permanece fijo tras el alta. Propietario y Admin editan; Dirección consulta. Un prospecto archivado conserva su seguimiento en consulta y debe restaurarse para editarlo.
- Tabla propuesta `crm_prospect_activities`, separada de la auditoría, con autor original, fecha original, versión y relación al prospecto. Cada edición registra autor administrativo, valores anteriores y posteriores, sin sustituir al creador. No existe borrado en esta entrega.
- La ficha de cliente compartida incorpora «Seguimiento de prospección». En CRM - Clientes, los usuarios habilitados del piloto pueden abrir la ficha pulsando el nombre. La API exige pertenencia del cliente y del prospecto al ámbito autorizado.
- La consulta deriva de la asociación actual: desvincular oculta el seguimiento en el cliente anterior y conserva las filas en el prospecto. No hay copia de datos ni actualización de las tablas BC. Al vincular de nuevo se ve el mismo historial en el cliente elegido.
- SQL de la tercera tabla y su índice preparados, con RLS y acceso por API; no aplicados a la base compartida. El formulario indica Modo local hasta habilitar deliberadamente la conexión Outlook y validar su funcionamiento real.

1. Motivos de Ganada y Perdida definidos por el usuario: catálogo fijo, excluyendo «Otros», conservando el histórico. Ganada: Precio, Servicio, Producto, Propuesta de valor, Afinidad. Perdida: Precio, Servicio, Financiación / Condiciones de pago, Relación cliente, Producto, Capacidad de producción, Compromiso con otros, Falta de financiación, Documentación / Certificados. Financiación / Condiciones de pago y Falta de financiación permanecen como opciones separadas. Esta decisión sustituye la obtención de opciones desde el histórico.
2. Contraste de esquema, perfiles, políticas y sincronización efectiva en Supabase compartido. Separar las pruebas automáticas de las pruebas funcionales reales del piloto.
3. Revisión de fórmulas con ejemplos, cambios de propietario, retención y recuperación.
4. Estimación de esfuerzo y validación del diseño definitivo sobre los componentes existentes.

Estos puntos no impiden preparar las primeras entregas de Prospección. La activación se realizará cuando el usuario pueda revisar y probar un resultado concreto en local.


## Aclaración de permisos del piloto: Antoni es TESTER (13/10/2026)

- Antoni Ciurans mantiene el rol TESTER. Admin gestiona el acceso desde Usuarios → Permisos de Rol → TESTER, activando CRM (`/crm`) y Oportunidades (`/crm/pipeline`). Se reutilizan `modules` y `role_modules`; no se crea otra matriz ni se conceden permisos automáticamente en Supabase.
- Los permisos actuales son por rol: conceder una vista a TESTER afecta a todos los miembros del rol. La participación en el piloto sigue limitada a Antoni por identidad; otros testers no obtienen funciones nuevas del piloto. No equivale a un permiso individual ni exige cambiarlo a VENTAS.
- Admin y Dirección también necesitan sus permisos de CRM/Oportunidades para consultar el piloto. Conservan las operaciones acordadas: Admin edita prospectos, Dirección consulta. El propietario sigue siendo el único que confirma/deshace asociaciones y archiva/restaura.
- La API verifica permisos vigentes en cada operación. Revocar CRM u Oportunidades bloquea el piloto aunque se invoque por ID. Outlook también respeta esa revocación y reconoce el origen sin reimportarlo como actividad BC.
- Las rutas CRM verifican la matriz también al acceder por URL directa. Guardar desde el panel invalida consultas de permisos y refresca el menú de la sesión actual. Las otras sesiones revalidan al recuperar foco o recargar; las rutas CRM abiertas revalidan cada 30 segundos. No es una revocación instantánea de datos ya descargados, pero las operaciones nuevas del piloto sí se comprueban en servidor.
- TESTER usa el código comercial propio al consultar ofertas desde la vista, desde la primera petición. Si no tiene código asignado, la consulta no se lanza. Confirmar el código de Antoni antes de activar el piloto. La validación de cartera en el endpoint general de ofertas se revisará al implementar la convivencia BC/app.
- Los interruptores de despliegue del piloto y Outlook permanecen como salvaguarda técnica, apagados por defecto. No sustituyen los permisos que Admin decide en su panel. No se ha alterado la carpeta local, ni aplicado SQL, ni concedido permisos reales.

### Avance de implementación: fases de ofertas
Preparadas las seis fases y porcentajes acordados, Aceptada abierta al 90%, listas de cierre, catálogo fijo y transición con nota y auditoría en una transacción. La vista de Contactos reutiliza este flujo para ofertas APP. La inicialización mantiene campos históricos y traduce los alias de fase al leer; no modifica BC. Validar cartera real, casos de ERP cerrado y sincronización n8n antes de activación. Los cortes semanales, sus permisos y exportación siguen pendientes de implementación; no se han aplicado migraciones ni activado el piloto.

### Avance de implementación: cortes preparados
Captura semanal viernes 18:00 Madrid, primer corte manual, consulta/exportación por ámbito, motivo manual, estados de ejecución, claves idempotentes, bloqueo persistente, transacción consistente y auditoría. Revisiones enlazadas conservan el original y capturan el presente. Se preservan ofertas APP temporalmente ausentes en BC sin asignar importes inventados. La pestaña está disponible en el prototipo con datos simulados.
No se ha creado ninguna tabla real ni activado el programador. Validaciones unitarias y de interfaz no sustituyen las pruebas de transacción/inmutabilidad con PostgreSQL aislado ni la conciliación con una importación BC terminada. Pendientes: comparación entre cortes, informes ampliados, paginación histórica, política de cambios de códigos comerciales, retención, copias y recuperación. La implementación propuesta documentada en docs/vistas/03_crm/crm_pipeline.md detalla estas condiciones.

### Avance de implementación: informes y comparación (14/10/2026)
Preparados resumen, matriz mensual, calidad, cierres vencidos, acciones, cierres por motivo, prospección y comparación. Datos congelados con permisos en cada corte, CSV individual e identidad estable. Las ausencias se describen como ausencia en corte/ámbito, sin concluir eliminación; no se infieren causas. Aceptada APP permanece abierta. La tasa/cohorte de conversión sigue pendiente de definición; se ofrecen recuentos y clientes vinculados distintos de la fotografía.
La carpeta local se comprobó limpia y en el mismo commit al iniciar este bloque. Cambios solo en la rama de trabajo y el prototipo; sin aplicar SQL ni desplegar. Siguiente paso: revisión integral de coherencia y preparación de pruebas en base aislada, antes de integrar en la carpeta local.
