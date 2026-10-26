# Validación de certificados HTTPS del backend

**Fecha:** 26/10/2026. **Ámbito:** `UsersService`, conexión a Supabase y conexiones HTTPS del proceso.

El constructor del servicio de usuarios asignaba `NODE_TLS_REJECT_UNAUTHORIZED=0`. Esa asignación desactivaba la validación de certificados para todo el proceso Node, no solo para Supabase, y producía el aviso de seguridad al abrir conexiones TLS.

Se retira la asignación y se mantienen los clientes Supabase y los flujos de usuarios/permisos existentes. No se modifica el certificado HTTPS de Vite ni se oculta el aviso: las conexiones del backend vuelven a utilizar la validación normal. No se modifican tablas, datos o permisos en Supabase/BC.

**Comprobado:** el entorno consultado no tenía esa variable configurada a nivel de proceso, usuario o máquina. Una petición Node nueva al endpoint de salud del Supabase configurado completó TLS con validación activa y respondió HTTP 401 sin enviar credenciales. El 401 corresponde a la autenticación del endpoint, no a un fallo de certificado; no valida una operación de administración de usuarios. Las pruebas de regresión comprueban que construir el servicio no modifica la política TLS del proceso.

Después de copiar el cambio debe reiniciarse el backend: quitar la línea no revierte la variable dentro de un proceso ya iniciado. El modo de desarrollo normalmente reinicia su proceso hijo al cambiar el archivo. En producción requiere desplegar y reiniciar la nueva versión.

Si otro entorno utiliza una autoridad de certificación privada, debe proporcionarse la cadena de confianza mediante `NODE_EXTRA_CA_CERTS` al arrancar Node. No se debe restablecer la desactivación global ni usar `NODE_NO_WARNINGS` para ocultar el problema.

## Comprobación de compatibilidad de esta entrega

Con la validación de certificados activa se completan lecturas reales de `profiles`, `roles`, `role_modules` y del listado de Supabase Auth (HTTP 200), sin exponer sus registros ni cambiar usuarios. El endpoint público de identificación de Microsoft responde 200; Microsoft Graph responde 401 sin token, que acredita la conexión TLS pero no una operación autenticada de correo o calendario. No se envían invitaciones ni correos de prueba. La corrección está destinada a la copia local; producción requiere desplegar y reiniciar antes de considerarla aplicada allí.
