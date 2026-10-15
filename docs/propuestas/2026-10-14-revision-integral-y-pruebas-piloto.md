# Revisión integral y preparación de pruebas del piloto

Fecha: 14 de octubre de 2026. Rama: `codex/inicio-trabajo`.

Al iniciar esta revisión, la carpeta local estaba limpia y compartía el commit base de la rama. Las pruebas y el esquema temporal se ejecutaron solo en localhost; no se aplicó SQL en Supabase ni se activaron tareas automáticas.

## Correcciones de la revisión

- Dirección y ofertas BC dentro de la vista del piloto: controles de seguimiento deshabilitados; no basta con rechazar el arrastre. El cierre del panel sigue disponible.
- Actividades de ofertas APP: verificar propietario además de código comercial y permisos. Admin conserva su alcance global.
- Interacciones APP: ocultar borrado, porque el servidor conserva el histórico; completar/corregir una actividad no equivale a borrarla.
- Fase obligatoria: rechazar vaciado mediante `null`. Porcentajes exclusivos del piloto rechazados en el flujo anterior.
- Correo de aceptación: una oferta nueva de Antoni tampoco se gana automáticamente antes de inicializarse. Se conserva el correo y los valores originales de BC, sin sustituirlos por los valores por defecto de un registro CRM nuevo.
- Documentación: fases, motivos, cortes e informes ya preparados se distinguen de las validaciones pendientes en una base real.

## Estado de las comprobaciones

Compilaciones y pruebas automáticas con datos simulados verifican permisos, cartera, versiones, campos vacíos, fuente BC/APP, transiciones, notas, motivos, prospección, vínculo reversible, Outlook, agenda, cortes, CSV e informes. Recorridos de navegador comprueban filtros, seis columnas en una fila, tabla, arrastre, ficha, perfiles y temas.

Docker falló al arrancar por un error de acceso al archivo del servicio de inferencia. Se utilizó una alternativa portátil de PostgreSQL 17.11, obtenida de la distribución de binarios EDB, dentro de la carpeta de pruebas ignorada del proyecto. No se instaló un servicio ni se modificó Docker. El 14/10/2026 se creó una base nueva `dts_crm_review` en localhost:55436, se aplicó la propuesta SQL de cortes y se ejecutó `verify-cuts.sql` con resultado satisfactorio. El servidor se detuvo al terminar y los datos de prueba se revirtieron.

Validado con PostgreSQL real: precisión decimal, valores nulos, cabecera/detalle/auditoría inmutables, prohibición de añadir detalle tras publicar, claves únicas, ausencia de permisos directos para anon/authenticated y reversión de una captura parcial.

También se ejecutó la API HTTP de cortes con Nest, Prisma, JWT real y PostgreSQL local: 4 pruebas pasaron. Cubren autenticación, permisos por rol, rechazo de cortes manuales a comerciales, captura y publicación, detalle, CSV, informes, comparación entre cortes y filtrado de ofertas/prospectos por propietario. La suite backend completa pasó 115 pruebas; las cuatro HTTP se omiten por defecto y se ejecutan por separado con el arnés aislado. La base `dts_crm_api_review` se generó desde `schema.prisma` en cada ejecución con filas inventadas. Para aislarla de Supabase, el arnés crea solo una tabla mínima `auth.users`; no reproduce las tablas internas de autenticación de Supabase. El cliente administrativo de Supabase recibe una URL y clave señuelo no alcanzables, y estas rutas no lo consultan.

Estas pruebas no cubren todavía bloqueos entre varias instancias, volumen real, importación BC/n8n ni llamadas reales a Outlook. Tampoco aplican una migración a Supabase.

## Base aislada para probar el SQL de cortes

Archivos: `backend/test/pilot-db/compose.yaml`, `bootstrap.sql`, `verify-cuts.sql`, `api-fixtures.sql` y `run-portable.ps1`. La configuración Docker no se ha ejecutado. Utiliza bases nuevas llamadas `dts_crm_review` y `dts_crm_api_review`, un puerto vinculado solo a localhost y credenciales de prueba. No usa `.env`, tokens, conexión ni datos de producción. La alternativa portátil ya se ha ejecutado contra PostgreSQL real exclusivamente de pruebas.

Cuando Docker esté disponible, desde la carpeta del proyecto:

```powershell
docker compose -f backend/test/pilot-db/compose.yaml up -d --wait
docker compose -f backend/test/pilot-db/compose.yaml exec -T postgres psql -U crm_review -d dts_crm_review -v ON_ERROR_STOP=1 -f /review/verify-cuts.sql
docker compose -f backend/test/pilot-db/compose.yaml stop
```

La primera orden puede descargar `postgres:17` si no existe localmente. Las pruebas se ejecutan únicamente contra el servicio definido en ese archivo. Verifican precisión decimal, importes desconocidos, inmutabilidad, auditoría, claves únicas, permisos directos y rollback; los datos de prueba se revierten. Este entorno contiene solo las tres tablas de cortes: no acredita la integración completa del CRM ni una importación BC.

Alternativa ejecutada: `backend/test/pilot-db/run-portable.ps1`. Requiere los binarios en `frontend/scratch/pg-portable/runtime/pgsql`, comprueba que el puerto esté libre, crea un directorio de datos distinto para cada ejecución, fija localhost/puerto/base/usuario explícitamente y detiene el servidor en `finally`. El esquema Prisma de revisión se genera localmente con Prisma CLI; el archivo temporal y los binarios quedan en una carpeta ignorada. Windows no permitió iniciar PostgreSQL mediante `pg_ctl start` por la creación de un token restringido, así que el arnés inicia el proceso `postgres` oculto y lo detiene con `pg_ctl stop`. Fuente: [binarios oficiales distribuidos por EDB](https://www.enterprisedb.com/download-postgresql-binaries).

## Casos antes de activar el piloto

| Área | Prueba | Resultado requerido |
| --- | --- | --- |
| Permisos | Conceder/revocar CRM y Oportunidades al TESTER desde Usuarios | Antoni accede por la matriz vigente; otros testers no entran al piloto |
| Dirección/Admin | Consultar todo; editar prospectos como Admin | Dirección consulta; Admin conserva propietario al editar |
| Carteras | Abrir por ID una oferta/prospecto/corte ajeno | Rechazo del servidor o filas limitadas al ámbito |
| BC/APP | Cambiar BC, recrear fila por el mismo documento y sincronizar | APP conserva seguimiento; importes generales reciben BC |
| Vacíos | Vaciar un dato local permitido | No recupera el dato BC anterior |
| Fases | Cambiar por arrastre/ficha; cancelar y provocar conflicto de versión | Nota obligatoria; probabilidad automática; cancelación conserva datos |
| Cierre | Ganar/perder con catálogo y sin motivo | Motivo obligatorio; guardado conjunto con nota; fuera del Kanban |
| Prospectos | Crear, editar, archivar/restaurar y duplicar por propietario | Nombre obligatorio, duplicado bloqueado y archivo sin borrado |
| Vinculación | Vincular cliente sin oferta y deshacer asociación errónea | Eventos conservados; desaparecen del cliente incorrecto |
| Correo | Aceptación antes/después de inicializar una oferta piloto | Nunca cierra automáticamente la oferta APP |
| Outlook | Alta/reintento/respuesta desconocida y revocación | Sin duplicados; usar calendario del propietario; no reabrir eliminados |
| Cortes | Dos procesos, fallo intermedio y reinicio | Una publicación completa; idempotencia y recuperación del bloqueo |
| Horario | Viernes, antes de las 18:00 y cambios verano/invierno | Hora civil de Madrid y captura real registrada |
| Histórico | Revisar original y revisión | Original inmutable; revisión captura el presente |
| Informes | Comparar importes conocidos/desconocidos y carteras | Sin IVA; desconocidos separados; sin datos ajenos ni causalidad inventada |
| Rendimiento | Cartera representativa y exportación completa | Medir memoria/tiempo; ampliar paginación antes de producción si procede |

## Validaciones externas pendientes

Confirmar código comercial real de Antoni, ciclo/fin de importación n8n, reutilización de documentos BC, filas cerradas en ERP, permisos del usuario técnico, rendimiento, retención, copias y recuperación. Definir tasa/cohortes de conversión y política de cambios de código comercial. No se copian tokens M365 ni se prueban envíos reales en la base de cortes.

Con las pruebas aprobadas, la rama se copia a `C:/proyectos/webapp_dts` para las pruebas locales, conservando `.env`, dependencias e ignorados. El repositorio local permanece en `main` con cambios sin confirmar; no se envía nada a GitHub. Los interruptores del piloto siguen apagados. Ejecutar la aplicación local con la conexión compartida sigue usando datos reales; el nombre de la carpeta no constituye aislamiento.

La revisión también protege la reutilización de una cabecera de corte ya publicada, evitando incluso una actualización vacía, y mantiene la versión originalmente cargada en la ficha/arrastre durante refrescos de la lista. Un conflicto exige recargar; no se aplica el cambio antiguo contra una versión más reciente.
