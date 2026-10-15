# Ejecución de la fase 0 de apertura de correos en Outlook

**Fecha:** 15 de octubre de 2026  
**Estado:** Prueba principal superada con una cuenta; cobertura adicional pendiente

**Cuenta autorizada para pruebas:** gdiaz@dtsinstruments.com  
**Clientes indicados por el usuario:** Outlook Classic y Outlook Web instalada como aplicación; también dispone del nuevo Outlook.

La rama y la carpeta local partían del commit `9b63831`, sin cambios pendientes. La fase 0 incorpora herramientas independientes de prueba y no sustituye todavía el flujo de apertura del CRM ni su instalador.

## Componentes preparados

| Archivo | Función |
| --- | --- |
| `backend/src/modules/exchange-sync/outlook-identity-probe.ts` | Conversión explícita de formatos, comprobación de buzón y resolución de un mensaje exacto con Graph. No se publica como endpoint. |
| `backend/src/modules/exchange-sync/outlook-identity-probe.spec.ts` | Pruebas de formato binario, identidad, movimiento simulado y errores de Graph. |
| `backend/scripts/outlook-phase0/probe.cjs` | Prueba con la cuenta elegida y generación de referencias técnicas locales, sin cuerpos ni tokens en la salida. |
| `backend/scripts/outlook-phase0/Verify-OutlookClassic.ps1` | Inventario de Office y verificación MAPI por buzón, EntryID, StoreID e identificador del mensaje. La apertura requiere un interruptor explícito. |
| `backend/scripts/outlook-phase0/README.md` | Procedimiento reproducible de la prueba antes y después de mover el mensaje. |

## Resultados verificados

- Office detectado: versión `16.0.20430.20146`, plataforma x64.
- Outlook Classic se ha detectado abierto tras la preparación del usuario.
- La cuenta guardada tenía un token de acceso caducado. La renovación normal de Microsoft 365 permitió realizar la prueba; no se han modificado correos mediante Graph ni tablas importadas de BC.
- Graph ha verificado el buzón autorizado y una referencia real de mensaje.
- Las conversiones EWS a Graph inmutable y REST a Graph inmutable han devuelto el mismo mensaje.
- La conversión del identificador binario de Exchange al EntryID hexadecimal se ha comprobado con Outlook Classic real.
- Classic ha localizado el correo en el almacén correspondiente a la cuenta y su `internetMessageId` coincide exactamente con el de Graph.
- Tras el movimiento manual confirmado por el usuario, Graph ha comprobado que cambian la carpeta y el EntryID de MAPI, pero se mantienen el identificador inmutable y el `internetMessageId`. Classic ha localizado y verificado el mismo correo usando la referencia actualizada, sin buscar por asunto.
- El usuario ha confirmado que Outlook Web sigue abriendo el mismo correo después de moverlo y que cerró Classic para la prueba de arranque.
- Se han encontrado dos mensajes reales con el mismo asunto y se han resuelto a identidades distintas en Graph y a EntryID distintos. Ambas referencias se han localizado y verificado individualmente en Classic sin abrirlas ni usar el asunto para resolverlas.
- Tras observar Classic cerrado, se ha iniciado mediante la opción explícita de arranque, se ha verificado el mensaje movido y se ha mostrado. Se detecta una cuenta configurada y un único almacén coincidente para el buzón de prueba.
- Una consulta inmediatamente posterior al arranque encontró el proceso de Outlook pero no su registro en la Running Object Table. Se ha añadido conexión alternativa al objeto COM único de Outlook, manteniendo la selección explícita de buzón y almacén. La repetición de las comprobaciones exactas ha pasado.
- Se ha mostrado el mensaje exacto en Classic. La primera solicitud web no abrió una ventana visible y se corrigió el lanzador, que utilizaba un estilo de ventana oculto. El usuario confirmó que el enlace directo de Outlook Web abre el mismo correo que Classic. La apertura automática mediante el lanzador corregido sigue pendiente de comprobarse visualmente.
- Compilación del backend correcta y 166 pruebas automáticas superadas en la primera tanda. Después de ampliar los casos de diagnóstico se han superado las 35 pruebas específicas de identidad. Cinco pruebas HTTP que requieren la base aislada no se han ejecutado en esta tanda.

La comprobación inicial encontró un cierre transitorio de una conexión de Supabase. La herramienta captura ahora los errores de conexiones inactivas sin volcar objetos de conexión en la salida.

Los informes con identificadores técnicos permanecen en la carpeta `scratch`, fuera de Git. Este documento no incluye identificadores de mensajes, tokens ni contenido del correo.

## Matriz pendiente

| Comprobación | Estado |
| --- | --- |
| Identificación exacta Graph y Classic del mensaje inicial | Superada con la cuenta real |
| Apertura inicial en Classic | Realizada |
| Confirmación visual del mismo mensaje en Outlook Web mediante enlace directo | Confirmada por el usuario |
| Apertura automática mediante el lanzador web corregido | Pendiente de validación visual |
| Movimiento manual a otra carpeta del mismo buzón | Confirmado por el usuario y por Graph |
| Resolución de la referencia inicial después del movimiento | Superada en Graph y Classic; EntryID actualizado |
| Apertura del mismo mensaje tras el movimiento en Classic y web | Classic abierto y verificado; web reconfirmado por el usuario |
| Dos correos con el mismo asunto | Diferenciados y verificados individualmente en Graph y Classic |
| Varias cuentas configuradas | Pendiente: en el equipo de prueba hay una cuenta; no se ha validado una configuración con varias |
| Classic inicialmente cerrado | Arranque, identificación y apertura del correo movido superados |
| Archivo en línea, PST y buzones compartidos | Fuera de la prueba inicial; cobertura por decidir |

La prueba principal con la cuenta y los clientes indicados por el usuario permite avanzar al contrato de la fase 1. No se extiende esta validación a configuraciones con varias cuentas, buzones compartidos, archivo en línea o PST. La apertura web automática del componente y esas coberturas siguen condicionadas a sus pruebas antes de ampliar el despliegue.
