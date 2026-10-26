# Segmentos y potencialidad anual del cliente

**Fecha:** 26/10/2026. **Ámbito:** ficha compartida de CRM y Ventas.  
**Estado:** código preparado localmente; SQL pendiente de ejecución por Administración. No se han escrito datos en Supabase.

## Procedimiento

1. Abre una empresa y localiza **Segmentos y potencialidad**.
2. Pulsa **Añadir segmento**. Busca por familia o subfamilia y selecciona la opción.
3. Escribe la **potencialidad anual en euros**, por ejemplo `12.500,00`, y guarda. Puede quedar vacía si aún no está estimada; cero significa estimación cero.
4. Añade tantas filas como segmentos tenga el cliente, sin repetir el mismo segmento.
5. Usa el lápiz para editar el importe o la papelera para quitar una fila, previa confirmación. Cambiar el segmento requiere quitarlo y añadir el correcto.

El pie suma los importes completados y avisa de segmentos pendientes. **Facturación** permanece vacía, representada por un guion, y no es editable. Los estilos se adaptan a los modos claro y oscuro.

| Familia | Opciones seleccionables |
| :--- | :--- |
| dTSTemp | ATEX, OEM, Process, Varios |
| dTSPres | OEM, Process |
| dTSFlow | Basics, Process, Tronic |
| dTSCal | dTSCal, sin subfamilia |
| dTSLevel | dTSLevel, sin subfamilia |
| dTSSens | dTSSens, sin subfamilia |

Son doce opciones. Las tres familias con hijos no se seleccionan directamente; se muestran nombres como «dTSTemp → OEM» para distinguir subfamilias homónimas.

## Permisos

Se exige sesión activa y permiso de vista Clientes de Ventas o de CRM (incluyendo el padre CRM). El backend aplica la cartera del perfil autenticado. Admin puede editar cualquier cliente autorizado; un comercial puede editar los clientes cuyo `salesperson_code` coincide con su código. Dirección, Tester y Producción conservan consulta global, pero no pueden editar clientes ajenos salvo que sean Admin. Los permisos de vista siguen asignándose en la gestión existente.

## Instalación y tabla

Ejecutar una vez como propietario de la base en Supabase SQL Editor: [2026-10-26-segmentos-potencialidad-clientes.sql](../../backend/prisma/proposals/2026-10-26-segmentos-potencialidad-clientes.sql).

**Relación confirmada:** se utiliza `client_id`, código estable de Business Central, de tipo `varchar(50)` como `customers.client_id`. La ficha, API, consulta de permisos y tabla nueva usan ese código; el UUID de `customers.id` no interviene en la relación.

Si ya se ejecutó la primera versión con `customer_id` UUID, no volver a crear ni borrar la tabla: ejecutar únicamente [la migración a client_id](../../backend/prisma/proposals/2026-10-26-migrar-segmentos-a-client-id.sql). Traduce las relaciones existentes por lectura de `customers`, conserva importes y metadatos y cancela la transacción si hay filas sin cliente o duplicados. Ninguno de los dos scripts se ha ejecutado desde esta entrega.

| Campo físico | Tipo | Uso |
| :--- | :--- | :--- |
| client_id | varchar(50) obligatorio | Código estable de BC; referencia a `customers.client_id`. |
| segment_code | varchar(40) obligatorio | Una de las doce identidades del catálogo. |
| potential_amount | numeric(14,2), nullable | Estimación anual en EUR, no negativa. NULL = pendiente. |
| billing_amount | numeric(14,2), solo NULL | Reservado para Facturación; no representa cero facturado. |
| version | integer, desde 1 | Control de cambios simultáneos. |
| created_by / updated_by | uuid | Creador y último editor; referencias a perfiles. |
| created_at / updated_at | timestamptz | Fechas de creación y modificación. |

La clave primaria `(client_id, segment_code)` impide duplicados. Se validan importes en navegador, backend y SQL. Las versiones protegen frente a sobrescrituras de otras sesiones. El backend no acepta Facturación ni propietario en el cuerpo de edición.

La nueva tabla `crm_customer_segments` es independiente: no debe actualizarse desde n8n/BC. No se modifican tablas importadas, sus permisos o datos. Se referencia el cliente por su código estable de BC (`customers.client_id`), sin duplicar nombres, contactos o códigos comerciales. SQL parametrizado; no hace falta regenerar Prisma ni ejecutar `db push`. El catálogo del backend y la restricción SQL deben ampliarse juntos.

RLS activada y acceso directo revocado a roles de navegador/Supabase, siguiendo el patrón de las tablas locales del CRM. El backend debe conectarse con propietario/BYPASSRLS y acceso a la tabla. Si falta la tabla, su sección informa de que Administración debe ejecutar el SQL y el resto de la ficha sigue disponible.

## Validación y límites

Pasan 24 pruebas backend de catálogo, cartera, roles, permisos retirados, duplicados, concurrencia, formato de importes y campos no permitidos. Comprobación frontend de formato español, decimales, límites, entradas inválidas y vacío distinto de cero. Compilaciones frontend y backend correctas.

**Pendiente tras instalar SQL y reiniciar:** crear dos segmentos, recargar y comprobar persistencia; editar/vaciar importes; comprobar total, duplicados y eliminación; probar comercial propio/ajeno, selector y modos claro/oscuro. No se declara aceptación visual ni escritura real en la base compartida.

## Mejoras posteriores a estudiar

- Definir fuente y periodo de Facturación, y su correspondencia con segmentos, antes de calcular penetración. No repartir automáticamente la facturación total.
- Añadir ejercicio/histórico si se desea comparar estimaciones de distintos años. Esta versión guarda la estimación anual vigente.
- Informes de potencialidad por familia/subfamilia y comercial tras validar los datos.
