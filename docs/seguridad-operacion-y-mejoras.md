# Seguridad de WebAPP dTS: operación y mejoras

**Actualizado:** 2 de noviembre de 2026.  
**Ámbito:** aplicación, Supabase autohospedado, n8n, Business Central y Microsoft 365.

Este documento reúne los cambios y decisiones comunicados durante la revisión de seguridad. El estado de producción se basa en las comprobaciones descritas y en las pruebas confirmadas por el administrador; debe volver a verificarse antes de introducir cambios. No guardar contraseñas, claves, tokens ni copias de credenciales en este documento.

## 1. Principios de trabajo

- Las tablas alimentadas desde Business Central (BC) son de **solo lectura para la aplicación**. No modificar sus datos, estructura, permisos ni triggers sin una autorización concreta; n8n debe conservar las escrituras necesarias para sincronizarlas.
- Los datos propios del CRM se gestionan en sus tablas independientes. Los permisos por vista y rol se administran desde la aplicación; la restricción de cartera comercial debe comprobarse también en el servidor.
- La autenticación y los permisos de PostgreSQL, las políticas RLS de Supabase y los permisos de la aplicación son capas distintas. Estar autenticado no implica que deba poderse escribir en todas las tablas.
- Antes de cambiar permisos, integraciones o configuración de producción: identificar dependencias, preparar recuperación, ensayar cuando sea posible y validar con las cuentas y flujos afectados. No desplegar ni hacer push sin instrucción expresa.
- Trabajar con la carpeta local actualizada y preservar los cambios existentes; sincronizar la rama y la carpeta local según el procedimiento acordado antes y después de cambios de código.

## 2. Infraestructura y red

Supabase funciona en Docker mediante Dokploy en el VPS. Se creó la red overlay `dts-supabase-private`, a la que se añadieron Supavisor, n8n y el backend, conservando además sus redes anteriores. Las conexiones PostgreSQL del backend y de la credencial principal de n8n usan el nombre interno `supavisor`.

Los puertos del pooler 5432 y 6543 se publicaron únicamente en `127.0.0.1` del servidor. Una prueba desde el ordenador del administrador confirmó que ambos puertos dejaron de ser accesibles mediante la dirección pública; no es una prueba desde todos los orígenes posibles. La aplicación y los flujos se verificaron después del cambio. La API de Supabase continúa usando HTTPS.

Para desarrollo local se utiliza un **túnel SSH** hacia el puerto local de PostgreSQL del VPS. La conexión local de la aplicación usa el extremo del túnel; debe mantenerse abierta la sesión SSH mientras se utilice. No publicar de nuevo los puertos de base de datos en todas las interfaces para resolver un problema de conexión.

En Windows, `npm run dev:https` abre el túnel automáticamente antes de iniciar la aplicación y solicita la frase de paso de la clave SSH cuando es necesario. Al detener el comando con Ctrl+C se cierra el túnel creado por ese arranque. Si el puerto local 15432 ya está ocupado, el comando se detiene: cierra primero el túnel manual u otro proceso que lo utilice. Si se pierde la conexión SSH, se detiene el entorno; vuelve a ejecutar el comando para reconectar. `npm run dev:https:app` inicia solo la aplicación y requiere que el túnel ya esté abierto.

La red privada limita la exposición pública, pero no se ha acreditado que su tráfico interno esté cifrado. El túnel SSH protege el trayecto entre el equipo y el VPS. Revisar la configuración de TLS y autenticación de cada conexión antes de afirmar que está cifrada extremo a extremo.

La configuración de redes de Dokploy para el backend debe conservar tanto `dokploy-network` como `dts-supabase-private`. Una modificación de la lista puede sustituir redes existentes: comprobar la configuración efectiva tras cada despliegue. n8n quedó fijado a la imagen existente 2.29.10 por digest durante esta intervención; planificar y probar por separado sus futuras actualizaciones.

## 3. Certificados TLS de la aplicación

El 26/10/2026 se documentó la retirada de la asignación global `NODE_TLS_REJECT_UNAUTHORIZED=0` del backend. La validación normal de certificados debe permanecer activa; no ocultar avisos ni volver a desactivarla para resolver errores. Si se necesita una autoridad privada, configurar su certificado de confianza y verificar la cadena.

Las comprobaciones y su alcance están en [Validación de certificados HTTPS del backend](actualizaciones/2026-10-26-validacion-certificados-backend.md). Ese documento distingue lo verificado en local del despliegue en producción: **comprobar la versión desplegada y la configuración efectiva antes de dar por aplicado este cambio en producción**.

## 4. Acceso a datos y roles

Durante la revisión se restringió el acceso directo a `user_exchange_accounts` para proteger credenciales de Microsoft 365 y se habilitó RLS; se conservaron las vías necesarias del servidor. Se revocaron sesiones de Microsoft y se reconectaron y probaron las cuentas afectadas, según confirmó el administrador. La credencial de Outlook de n8n corresponde a otra cuenta, según su confirmación.

Se ajustaron los permisos de `profiles` para impedir escrituras directas por usuarios autenticados, manteniendo la lectura prevista y la gestión administrativa a través del backend. El administrador confirmó el inicio de sesión y la edición de cuentas. También se revisaron `crm_activities`, `modules`, `role_modules` y la tabla histórica `sales_quote_activities`, manteniendo las vías del backend. Se probaron las funcionalidades disponibles; el caso de actividad de oferta quedó pendiente por las condiciones de lectura del seguimiento.

Se retiró el acceso efectivo de `anon` al esquema `public` y se mantuvo el uso para los roles necesarios autenticados y del servidor. Una concesión sobre una tabla no basta si falta acceso al esquema; por eso el resultado de una consulta aislada de permisos de tabla no equivale por sí solo a acceso efectivo. Las políticas RLS y los permisos deben analizarse conjuntamente.

**Pendiente importante:** en la revisión se observaron permisos de escritura del rol `authenticated` en varias tablas de BC, entre ellas `sales_quotes` y `contacts`, con RLS desactivado en algunas. Esto puede permitir modificaciones por una vía directa autenticada; no se realizó una escritura de prueba ni se constató un uso indebido. Verificar la exposición por API, permisos heredados, dependencias y comportamiento real antes de preparar cambios.

`postgres` es una cuenta privilegiada y la clave `service_role` de Supabase evita RLS. Ambas pueden ser usadas por componentes e integraciones existentes: **no revocar sus permisos globalmente**. La credencial Postgres de n8n figura asociada a siete flujos y la de Supabase API a dos, según la inspección realizada; revisar su configuración y versión efectiva antes de migrar permisos. El usuario de solo lectura existente también evita RLS y no sustituye por sí solo al usuario completo de la aplicación ni garantiza el aislamiento por comercial.

## 5. Copias y recuperación

El 02/11/2026 se descargaron una copia lógica de PostgreSQL con roles y una copia del volumen de n8n que incluye la base SQLite y su configuración de cifrado. Se comprobaron las sumas SHA-256 de los archivos descargados y se retiraron las copias temporales del VPS. Las copias contienen información sensible y deben guardarse con acceso restringido y fuera del servidor.

**Las sumas verifican integridad de los archivos, no su capacidad de recuperación:** queda pendiente comprobar una recuperación integral del conjunto, incluida la copia de n8n. Las copias reflejan el momento en que se generaron; restaurarlas sobre producción puede revertir cambios posteriores. Incluir en el plan de recuperación los datos y la configuración de Supabase, n8n, claves, versiones y almacenamiento de archivos si se empieza a utilizar. Un snapshot del VPS es un complemento, no sustituye una copia verificable ni una prueba de restauración.

**Actualización del 05–06/11/2026:** se restauró un volcado de `postgres` en una base de prueba de una instancia Supabase nueva y se comprobaron tablas, recuentos, migraciones y parte de los permisos. El ensayo no cubre aún una recuperación integral ni la validación funcional de la app y n8n. El volcado diario observado excluye propietarios y concesiones y no incluye la base interna `_supabase`; consultar [el registro del ensayo](actualizaciones/2026-11-05-ensayo-migracion-supabase-vps.md) antes de utilizarlo como procedimiento de recuperación.

## 6. Procedimiento para cambios de seguridad

1. Identificar el objetivo, entorno, tablas, usuarios, roles, servicios y automatizaciones afectados. No deducir permisos por el nombre del flujo: revisar los nodos y la versión publicada.
2. Preparar una copia reciente y un plan concreto de reversión. Comprobar el acceso administrativo de recuperación y no probar una restauración directamente sobre producción.
3. Preparar una propuesta específica de cambios mínimos, con operaciones y tablas exactas. Preservar el principio de solo lectura de BC y solicitar una excepción concreta si la propuesta necesita cambiar sus permisos.
4. Validar el cambio en un entorno aislado siempre que sea posible. En producción, coordinar la ventana de intervención y aplicar cambios graduales, conservando una vía de recuperación.
5. Probar inicio de sesión, permisos por rol, visibilidad por comercial, escritura del CRM, importaciones n8n, API y conectividad que correspondan. Documentar casos comprobados y pendientes.
6. Revisar registros y flujos después del cambio. Actualizar esta guía cuando cambie la configuración, evitando incluir secretos.

## 7. Mejoras pendientes priorizadas

1. **Separar permisos de aplicación e importación.** Inventariar las operaciones de cada flujo y cada tabla; diseñar un rol de backend con lectura de BC y escritura en tablas propias, y un acceso de n8n limitado a sus necesidades. Revisar las vías que usan `service_role`. Definir cómo se aplican RLS y el alcance por vendedor. No sustituir credenciales hasta ensayar y disponer de reversión.
2. **Corregir la posible escritura directa sobre tablas de BC.** Revisar grants, RLS y consumidores reales; preparar cambios de seguridad concretos sin afectar la sincronización. Cualquier modificación de permisos sobre tablas BC requiere la autorización acordada con el propietario.
3. **Proteger el seguimiento de ofertas.** En una versión editable de «API tablas BC», `Upsert Quotes CRM1` apunta a `crm_offer_followups` y recibe campos comerciales desde BC con asignación automática. Comprobar la versión publicada y la ejecución real; evitar que un registro gestionado por la app se sobrescriba desde BC, respetando el campo `source` y las reglas acordadas. No se ha confirmado una sobrescritura real.
4. **Revisar la sincronización de pedidos.** En la versión inspeccionada, `Delete Orders` ejecuta `TRUNCATE sales_orders` y `Delete Orders1` ejecuta `TRUNCATE purchase_order_lines, purchase_orders CASCADE`. Verificar versión activa, claves foráneas y tablas afectadas. Estudiar una sincronización diferencial con descarga completa y paginada, controles de error y de respuesta vacía, operaciones seguras y plan de recuperación. La revisión funcional se continúa en el chat N8N.
5. **Ensayar recuperación y automatizar copias.** Hacer una restauración aislada, comprobar base, roles, archivos y credenciales de n8n, definir frecuencia, retención y destino externo, y probar la recuperación periódicamente.
6. **Gestión de secretos y rotación.** Inventariar todas las dependencias antes de rotar la contraseña de PostgreSQL: el despliegue autohospedado la utiliza en varios servicios, además de backend, n8n y desarrollo. Coordinar una ventana y reversión; no ejecutar scripts genéricos sin adaptarlos a Dokploy. Revisar también almacenamiento y alcance de la clave `service_role` y las credenciales de n8n.
7. **Revisar autorizaciones de extremo a extremo.** Probar con usuarios de cada rol, no solo admin, tanto el acceso directo como las rutas del backend y la segregación por vendedor. Revisar funciones privilegiadas, vistas y otras posibles vías que eludan políticas.
8. **Mantener la infraestructura.** Controlar actualizaciones de n8n, Supabase, Dokploy, imágenes y dependencias; ensayar cambios de versión y revisar registros y alertas. Verificar periódicamente la exposición externa y la configuración TLS efectiva.

## 8. Referencias internas

- [Ensayo de recuperación y actualización de Supabase en el VPS](actualizaciones/2026-11-05-ensayo-migracion-supabase-vps.md).
- [Validación de certificados HTTPS del backend](actualizaciones/2026-10-26-validacion-certificados-backend.md).
- [Identidad de correos y seguridad del complemento Outlook](actualizaciones/2026-10-15-identidad-estable-correos-y-seguridad-addin-outlook.md). Confirmar que la descripción coincide con la versión desplegada antes de usarla como evidencia actual.
- Chat **Seguridad de la app**: seguimiento de seguridad y decisiones posteriores.
- Chat **N8N**: automatizaciones y revisión funcional de sincronizaciones.
