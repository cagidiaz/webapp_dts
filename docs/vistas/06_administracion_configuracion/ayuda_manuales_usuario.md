# Vista: Ayuda - Manuales de usuario

> Ruta: `/help/manuals` · Entrega local del 22/10/2026.
> Frontend: `ManualsPage.tsx`, `userManuals.ts`, `Sidebar.tsx`.
> Backend: `DocumentationModule`, `DocumentationController` y `DocumentationService`.

## 1. Propósito

Centralizar las guías de uso y permitir consultar el manual CRM o descargarlo para formación. La ficha muestra título, descripción, versión, fecha y tamaño. Se mantienen los modos claro y oscuro y el diseño adaptable.

## 2. Accesos y uso

1. Menú lateral **Ayuda → Manuales de usuario**.
2. **Ver PDF** abre una pestaña durante el clic y recupera el documento con JWT antes de mostrarlo. Si el navegador bloquea la ventana, se informa al usuario.
3. **Descargar PDF** recupera el mismo documento y guarda un archivo cuyo nombre incluye su versión.

La consulta del catálogo tiene estados de carga, lista vacía, error y reintento. Los botones se deshabilitan mientras se solicita el archivo. Los errores de permiso o red se muestran dentro de la vista. No se envían tokens en la URL del PDF.

## 3. Permisos y datos

La vista requiere sesión. El catálogo y cada solicitud de PDF vuelven a comprobar un perfil activo con rol asignado y permisos activos de módulos: `/crm` y al menos uno entre `/crm/customers` o `/crm/contacts`, todos con `can_view=true`. Los perfiles sin acceso obtienen un catálogo vacío; la solicitud directa del archivo devuelve 403. No existe excepción implícita de Admin que ignore los permisos configurados.

Los permisos son los actuales de Gestión de Usuarios; no se añade un módulo de base de datos ni se necesita SQL. La sección Ayuda puede ser visible para un usuario conectado sin manuales autorizados. Los permisos se comprueban al descargar; las copias ya guardadas por un usuario siguen siendo archivos de su ordenador.

El PDF incluye capturas internas: se sirve desde el backend autenticado, fuera de los recursos públicos del frontend, con `Cache-Control: private, no-store`, tipo `application/pdf`, `nosniff` y disposición inline o attachment. Solo se admite el identificador conocido del catálogo; el solicitante no elige rutas de archivos.

## 4. Endpoints

| Método y ruta | Uso |
| --- | --- |
| `GET /api/documentation/manuals` | Lista los manuales autorizados con versión, fecha y tamaño. |
| `GET /api/documentation/manuals/crm-clientes-contactos/pdf` | Entrega privada del PDF para visualización. |
| La misma ruta con `?download=1` | Entrega como archivo adjunto para descarga. |

## 5. Publicación y mantenimiento

El origen es `docs/manuales/crm-clientes-contactos/manual-crm-clientes-contactos.md` y su PDF aprobado en `output/pdf/manual-crm-clientes-contactos.pdf`.

1. Actualizar el Markdown y regenerar/revisar el PDF.
2. Ejecutar `npm run package:manuals` desde backend; también se ejecuta durante `npm run build` antes de compilar. Copia el PDF a `backend/assets/user-manuals` y genera `catalog.json` con versión/fecha del manual y hash SHA256.
3. Incluir los dos recursos empaquetados en el repositorio y despliegue. Los Dockerfiles unificado y de backend los copian a la imagen final. En el contexto de backend aislado se valida el PDF y catálogo empaquetados cuando no está disponible el origen del repositorio.
4. Tras desplegar, comprobar la versión visible, Ver PDF y Descargar PDF con un usuario autorizado. Comprobar rechazo al retirar permisos o cerrar sesión.

No se modifica la base de datos ni se actualizan tablas de Business Central. No hay enlaces a la carpeta local del desarrollador ni dependencia de un directorio temporal en producción.

## 6. Validación y límites

Las pruebas automatizadas de API cubren sesión, perfil activo, permisos incompletos, acceso por Clientes o Contactos, revocación, identificador desconocido y entrega del PDF con sus cabeceras y bytes. La compilación valida la incorporación de las rutas y componentes.

Resultado de la entrega: 12 pruebas HTTP con JWT y datos de permisos aislados, seis comprobaciones del cliente de visualización/descarga, compilaciones frontend/backend y validación del paquete en un contexto de backend sin el origen del repositorio. El PDF empaquetado coincide por hash con el manual aprobado y sus páginas modificadas se revisaron visualmente.

La aceptación visual y las acciones en el navegador de producción quedan pendientes del despliegue. La apertura utiliza el visor PDF del navegador: según sus ajustes, puede mostrarse una descarga en lugar de una vista integrada.

### Manual descargable actualizado - 26/10/2026

El PDF de **Ayuda → Manuales de usuario** se actualiza a **edición 1.2, 26/10/2026**, con 35 capítulos y 43 páginas. Incluye contactos compactos con navegación directa, segmentos y potencialidad anual, referencia por `client_id` estable de BC y una sección diferenciada de Ventas-Clientes (mapa, filtros y pie de totales). Se conserva el estado pendiente de instalación/pruebas reales de segmentos. Markdown, PDF fuente y PDF/catálogo de `backend/assets/user-manuals` se mantienen coordinados y revisados visualmente. La copia local está preparada; la de producción requiere publicar estos archivos junto con la app.
