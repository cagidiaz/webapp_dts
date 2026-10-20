# 📖 Guía de Instalación y Despliegue: Complemento de Outlook (Add-in dTS CRM)

> **Entrega del 19/10/2026, pendiente de despliegue:** Outlook verificado para todos los perfiles activos con permiso CRM por rol. Sin listas por correo ni flags de piloto. Ajustes utiliza el ZIP Classic 1.1.0 y la vinculación de equipos. Véase «Uso general de Outlook verificado» al final; las secciones anteriores fechadas describen entregas históricas.

> Este manual describe la instalación del Add-in de Office para registrar correos y, en la sección 7, el componente Windows para abrirlos desde el CRM en Outlook Classic. Son instalaciones independientes.

---

## 📑 Índice
1. [Descripción General y Arquitectura](#1-descripción-general-y-arquitectura)
2. [Método 1: Instalación Rápida Individual (Sideloading / Modo Pruebas)](#2-método-1-instalación-rápida-individual-sideloading--modo-pruebas)
3. [Método 2: Despliegue Centralizado en Microsoft 365 (Recomendado para la Empresa)](#3-método-2-despliegue-centralizado-en-microsoft-365-recomendado-para-la-empresa)
4. [Guía de Uso para el Comercial](#4-guía-de-uso-para-el-comercial)
5. [Resolución de Dudas Frecuentes (FAQ)](#5-resolución-de-dudas-frecuentes-faq)
7. [Componente Classic y equipos vinculados](#7-instalador-interno-para-abrir-correos-en-outlook-classic)
8. [Incidencias del complemento en Web](#8-si-outlook-web-no-puede-iniciar-el-complemento)
9. [Responder y responder a todos](#9-actualización-para-responder-y-responder-a-todos)
10. [Nombres de adjuntos](#10-nombres-de-adjuntos-actualización-del-registro)

---

[Ir a instalación de Outlook Classic, sección 7](#7-instalador-interno-para-abrir-correos-en-outlook-classic).

## 1. Descripción General y Arquitectura

El **Add-in dTS CRM** añade un botón oficial `"Registrar en dTS CRM"` directamente en la barra de herramientas superior (Ribbon) de Microsoft Outlook.

```mermaid
flowchart LR
    A["📧 Comercial leyendo correo en Outlook"] --> B["🔘 Clic en botón 'Registrar en dTS CRM'"]
    B --> C["📱 Se abre el Panel Lateral dTS CRM"]
    C --> D["🧠 Detecta contacto, cliente y ofertas abiertas"]
    D --> E["💾 Comercial pulsa 'Guardar en dTS CRM'"]
    E --> F["✅ Registrado en Timeline y Oferta al instante"]

    style B fill:#003E51,stroke:#00B0B9,stroke-width:2px,color:#fff
    style C fill:#f8fafc,stroke:#003E51,stroke-width:2px,color:#000
    style E fill:#00B0B9,stroke:#003E51,stroke-width:2px,color:#fff
    style F fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
```

### Características Principales:
* **Reconocimiento Automático:** Detecta al interlocutor externo (analizando el remitente en correos recibidos o los destinatarios en correos enviados).
* **Vinculación a Ofertas:** Si el cliente tiene cotizaciones abiertas en el pipeline, permite asociar el correo a una oferta específica con un clic.
* **Limpieza Inteligente de RGPD:** Trunca automáticamente cláusulas de privacidad, cadenas de reenvío y firmas pesadas.
* **Control de Duplicados:** Si un correo ya fue registrado, muestra el distintivo verde `✓ Ya registrado en dTS CRM` bloqueando duplicidades.
* **Asociación Directa a Empresa:** Si el remitente no está registrado en los contactos de Business Central, permite vincular el correo directamente al historial de la empresa cliente en el CRM sin bloquear la operativa.

---

## 2. Método 1: Instalación Rápida Individual (Sideloading / Modo Pruebas)

Ideal para probar el complemento en tu propio buzón en menos de 1 minuto sin esperar al administrador de sistemas.

### Pasos en Outlook Web (outlook.office.com):

1. Abre tu navegador e inicia sesión en **[Outlook Web](https://outlook.office.com/)**.
2. Abre cualquier correo electrónico de tu bandeja de entrada.
3. En la esquina superior derecha del correo, haz clic en el icono de **tres puntos (...)** (Más acciones) o en el icono de **Aplicaciones / Complementos** en la barra superior.
4. Selecciona **Obtener complementos** (o *Administrar complementos* / *Add-ins*).
5. En el menú lateral izquierdo de la ventana emergente, pulsa en **Mis complementos**.
6. Desplázate hasta la sección inferior llamada **Complementos personalizados**.
7. Haz clic en **+ Agregar un complemento personalizado** ➔ Selecciona **Agregar desde un archivo...**.
8. Selecciona el archivo [`manifest.xml`](file:///c:/proyectos/webapp_dts/outlook-addin/manifest.xml) de la carpeta `outlook-addin/`.
9. Haz clic en **Instalar**. 
10. ¡Listo! A partir de ese momento, al abrir cualquier correo verás el botón **Registrar en dTS CRM** en tu cinta de opciones.

---

## 3. Método 2: Despliegue Centralizado en Microsoft 365 (Recomendado para la Empresa)

Este método permite al Administrador de Microsoft 365 de dTS Instruments instalar el complemento a todos los comerciales de la empresa **de forma silenciosa y automática**, sin que ningún usuario tenga que configurar nada en su ordenador.

### Pasos para el Administrador de TI:

1. Inicia sesión en el **[Centro de Administración de Microsoft 365](https://admin.microsoft.com/)** con cuenta de administrador global.
2. En el menú de navegación lateral, ve a:  
   **Configuración** ➔ **Aplicaciones integradas** (*Integrated apps*).
3. Haz clic en el botón superior **Implementar aplicación** (*Deploy add-in* o *Get apps*).
4. Elige la opción **Cargar aplicaciones personalizadas** (*Upload custom apps*).
5. En el desplegable, selecciona **Tipo de aplicación: Complemento de Office**.
6. Selecciona la opción **Tengo el archivo de manifiesto (.xml)** y sube el archivo [`manifest.xml`](file:///c:/proyectos/webapp_dts/outlook-addin/manifest.xml).
7. **Asignar Usuarios:**
   * Puedes asignarlo a **Toda la organización** o a un grupo específico (ej. `Equipo Comercial` o `Ventas dTS`).
8. **Método de Implementación:** Selecciona **Fijo (Predeterminado)** para que el complemento aparezca anclado de forma automática en el Outlook de todos los usuarios seleccionados.
9. Pulsa en **Siguiente** y confirma en **Implementar**.
10. Microsoft propagará el complemento a todos los clientes de Outlook (Escritorio, Web y Móvil) en un plazo de entre 1 y 6 horas.

---

## 4. Guía de Uso para el Comercial

### Paso 1: Abrir el panel
Cuando estés leyendo un correo en Outlook de un cliente o proveedor, haz clic en el botón **Registrar en dTS CRM** situado en la barra de herramientas superior.

### Paso 2: Revisar la información detectada
En el panel lateral derecho verás:
* El asunto, remitente y fecha original del mensaje. Los campos **De:** y **Para:** muestran directamente las direcciones de correo electrónico de cada interlocutor de forma limpia y legible.
* Por defecto, la opción de vinculación a oferta permanece en **`(Sin vincular a oferta - Solo ficha cliente)`**, permitiendo al comercial asociar una cotización solo cuando sea pertinente.
* Mientras se consulta la base de datos, el panel muestra un **Skeleton Loader** estructurado con animación suave corporativa, garantizando una percepción de carga instantánea sin pantallas en blanco ni esperas bloqueantes.
* Si el contacto ya existe en dTS, aparecerá con el distintivo verde **✓ Identificado** junto a su empresa.
* Si el remitente no está registrado, dispones de un buscador predictivo para asociar el correo a la empresa cliente correspondiente (los contactos oficiales se crean y sincronizan desde Business Central vía n8n).

### Paso 3: Asignar tipología y oferta (Opcional)
* **Tipología:** Selecciona el botón correspondiente (`📋 Petición oferta`, `📦 Oferta proveedor`, `📝 Revisión oferta`, `💬 Negociación`, `📄 Cierre/Aceptación`).
* **Vincular a Oferta:** Si el cliente tiene cotizaciones en curso y deseas vincular el correo a una de ellas, elígela del menú desplegable. De lo contrario, déjalo en la opción predeterminada para registrarlo exclusivamente en la ficha general del cliente.

### Paso 4: Guardar
Haz clic en **[ 💾 Guardar Correo en dTS CRM ]**.  
Aparecerá una confirmación verde inmediata. El correo queda registrado en el Timeline del contacto, consultable por los usuarios con permisos y cartera autorizados.

---

## 5. Resolución de Dudas Frecuentes (FAQ)

#### ¿Qué ocurre si registro el correo dos veces por error?
El sistema comprueba el identificador único del correo de Microsoft Graph. Si ya fue registrado, el panel muestra el mensaje `✓ Ya registrado en dTS CRM` y no duplica la entrada en la base de datos.

#### ¿Los demás compañeros pueden ver los correos registrados?
La consulta del extracto depende de los permisos y la cartera autorizada del CRM. En el piloto de apertura exacta solo se abre el mensaje del buzón Microsoft 365 del usuario autenticado; Admin y Dirección no obtienen acceso a buzones privados ajenos.

#### ¿Funciona en la aplicación de escritorio de Outlook para Windows?
Sí. El complemento es un Add-in web universal compatible con el nuevo Outlook para Windows, Outlook clásico, Outlook para Mac y Outlook en la web (navegador).

#### ¿Qué hacer si aparece un error de consentimiento o token caducado (`AADSTS65001 / consent_required`)?
Este mensaje indica que Microsoft requiere una confirmación interactiva de permisos para la aplicación `dTS CRM - Exchange Sync`:
1. **Solución rápida para el comercial:** Entra a la WebApp en **CRM** o **Ajustes** (`/settings`), pulsa en **"Reconectar con Microsoft 365"**, inicia sesión y pulsa **Aceptar** en la pantalla de permisos.
2. **Solución definitiva para la empresa (Administrador de TI):** Accede al [Portal de Microsoft Entra / Azure](https://entra.microsoft.com/) ➔ *Aplicaciones* ➔ *Registros de aplicaciones* ➔ `dTS CRM - Exchange Sync` ➔ *Permisos de API* y haz clic en **"Conceder consentimiento de administrador para dTS Instruments"**. De este modo, ningún empleado volverá a requerir confirmación individual.


## 7. Instalador interno para abrir correos en Outlook Classic

### 7.1 Requisitos y estado

- Windows con Outlook **Classic** instalado y el buzón corporativo configurado. El nuevo Outlook no utiliza este componente COM.
- Cuenta Microsoft 365 conectada al CRM, perfil activo y permisos de acceso al CRM por rol.
- Backend y frontend actualizados con la entrega de uso general del 19/10/2026; no hay habilitación individual ni lista de correos del piloto.
- Las tablas de Classic ya están creadas en Supabase y comprobadas a 15/10/2026. La instalación y la prueba completa en producción siguen pendientes de confirmación.

No es necesario cambiar el manifiesto del Add-in ni adquirir un certificado para este instalador interno. La conexión Microsoft 365 de la app y la vinculación del equipo son dos pasos distintos.

### 7.2 Instalación por usuario

1. En el CRM, abre `/outlook-classic`. Si tu cuenta está habilitada y el paquete está desplegado, pulsa **Descargar instalador de Outlook Classic**. El administrador también puede facilitar el mismo ZIP generado en el proyecto.
2. Extrae **todo** `OutlookClassic.zip` en una carpeta. Conserva el ejecutable junto a los BAT; copiar solo el BAT no basta.
3. Ejecuta `Instalar_Outlook_dTS.bat` con tu usuario habitual de Windows, **sin ejecutar como administrador**.
4. El componente se copia al perfil local y registra el protocolo de apertura. A continuación muestra un código y abre el CRM para vincular el equipo.
5. Inicia sesión con tu cuenta del CRM e introduce el código que ves en la ventana del componente. Pulsa **Vincular este equipo a mi cuenta**.
6. Vuelve a la ventana Windows y pulsa **Ya he confirmado en el CRM**. La vinculación caduca en cinco minutos; si ha vencido, inicia una nueva.
7. Desde Emails o Timeline, prueba **Abrir en Outlook Classic** y comprueba el mensaje. Si el navegador solicita abrir la aplicación, acepta para completar esa apertura.

El componente se instala en `%LOCALAPPDATA%\dTS\OutlookClassic\1.1.0` y el protocolo se registra en HKCU. No modifica el manejador antiguo `dts-mail`; la nueva apertura usa `dts-outlook`. La clave del equipo queda cifrada para el usuario Windows.

### 7.3 Distribución interna sin certificado

El paquete se distribuye sin firma Authenticode por decisión de la empresa. Windows puede mostrar un aviso de editor desconocido o aplicar una política que impida ejecutarlo. El instalador no modifica políticas, antivirus ni certificados. Si el equipo lo bloquea, contacta con el responsable informático.

Las comprobaciones de identidad y las firmas criptográficas de las solicitudes del equipo se mantienen. La falta de certificado del ejecutable no elimina la vinculación ni el control de acceso.

### 7.4 Actualización, nueva vinculación y retirada

| Acción | Procedimiento |
| --- | --- |
| Actualizar la versión | Cierra el componente, extrae el ZIP facilitado y ejecuta el BAT de instalación. La vinculación existente se conserva si su clave local sigue disponible. |
| Volver a vincular | Ejecuta `Vincular_Outlook_dTS.bat` y repite la confirmación del código con tu cuenta. Si sustituyes una vinculación, revoca después la entrada anterior que ya no utilices. |
| Retirar del equipo | Ejecuta `Desinstalar_Outlook_dTS.bat` con el mismo usuario Windows y revoca el equipo en **Mis equipos** del CRM. Los ejecutables bloqueados pueden requerir limpieza posterior. |
| Retirar acceso sin disponer del equipo | En `/outlook-classic`, revoca su vinculación. La revocación impide nuevas solicitudes para ese dispositivo. |

### 7.5 Incidencias de apertura

| Mensaje o situación | Qué revisar |
| --- | --- |
| Classic no habilitado | El administrador debe revisar el perfil activo, los permisos del rol para CRM y el despliegue. Instalar el BAT no concede acceso al CRM. |
| El instalador no está publicado | Falta desplegar el frontend que contiene el ZIP y sus metadatos. |
| Código incorrecto o caducado | Inicia una nueva vinculación y utiliza únicamente el código de la ventana de tu equipo. |
| El navegador no abre la aplicación | Comprueba instalación con tu usuario Windows y autorización del navegador. Descargar el ZIP no instala el protocolo. |
| Apertura sin confirmar | Revisa si Outlook ya mostró el mensaje antes de repetir; puedes elegir la alternativa Web. |
| Buzón no disponible o identidad distinta | Verifica que Classic tenga configurada la misma cuenta conectada al CRM. No se abre otro correo como sustituto. |
| Mensaje movido a PST, archivo en línea u otro buzón | Fuera de la cobertura aceptada de esta entrega; solicita revisión. Un movimiento entre carpetas del mismo buzón sí forma parte de las pruebas. |

La prueba de aceptación consiste en abrir el mismo mensaje desde Emails y Timeline, moverlo a otra carpeta del mismo buzón y repetir, además de probar Classic cerrado. Registrar los resultados antes de extender el piloto al equipo.

Administración: [activación, tablas y controles técnicos](propuestas/2026-10-15-fase-4-apertura-exacta-classic.md).

### Validación de apertura comunicada el 16/10/2026

El usuario confirma equipo vinculado y apertura correcta de correos enviados y recibidos, también después de mover el mensaje entre carpetas del mismo buzón. Este resultado actualiza el estado pendiente indicado en la entrega inicial del 15/10. No acredita todavía arranque con Classic cerrado, revocación o perfiles con varias cuentas. La siguiente fase revisa referencias antiguas y acciones compartidas; se mantiene el manejador heredado hasta completar su sustitución.

## 8. Si Outlook Web no puede iniciar el complemento

Cuando Outlook Web muestra «algo ha salido mal y no se puede iniciar este complemento» antes del panel CRM, debe revisarse la carga del propio Add-in. No se soluciona reinstalando el BAT de Classic ni repitiendo el SQL.

La corrección del 16/10/2026 inicia Office antes de pedir acceso al CRM, para admitir la sesión aislada del panel Web. Requiere desplegar el frontend actualizado; no cambia el manifiesto y no exige actualizarlo en Microsoft 365 por este ajuste. Después del despliegue, cerrar el panel, recargar Outlook Web y volver a abrir el complemento desde un correo. Si aparece el formulario de acceso CRM, iniciar sesión allí aunque la aplicación principal ya tenga sesión.

Si persiste el error, distinguir si aparece antes del formulario o dentro del panel, anotar el nombre del complemento y revisar conectividad a Office.js y errores del navegador. La prueba de arranque automatizada no sustituye la validación real: el usuario confirma después del despliegue que el complemento abre correctamente en Outlook Web el 16/10/2026.

## 9. Actualización para responder y responder a todos

Entrega validada por el usuario en producción el 16/10/2026: Responder y Responder a todos funcionan en Classic y Web. El componente Classic está actualizado y conserva la vinculación. Los requisitos de SQL y activación siguientes describen la instalación de esa entrega; no deben repetirse para incorporar los nombres de adjuntos. [Procedimiento técnico](propuestas/2026-10-16-respuestas-verificadas-outlook.md).

1. Descarga el ZIP actualizado de Classic 1.1.0 y extráelo completo.
2. Cierra el componente si está ejecutándose e inicia `Instalar_Outlook_dTS.bat` con tu usuario Windows habitual, sin administrador. Conserva la vinculación del equipo.
3. Abre un correo desde el CRM en Classic para registrar la nueva versión. La versión 1.0.0 sigue sirviendo para abrir, pero no para las respuestas nuevas.
4. En Emails, prueba **Responder** y **Responder a todos**, verificando original, destinatarios, contenido citado y cuenta de envío. Cierra las ventanas sin enviar si solo estás comprobando la preparación.
5. Repite desde Timeline y con Outlook Web seleccionado en Ajustes. En Web deben abrirse borradores de respuesta del mismo hilo, sin enviar automáticamente.

No necesitas desinstalar el manejador antiguo de Windows para esta actualización: la app ya no lo invoca ni lo distribuye. Se conserva la búsqueda de conversaciones en Outlook Web. No cambia el manifiesto del Add-in de Office ni requiere certificado de firma. Si falta la confirmación de una respuesta, revisa las ventanas o Borradores antes de repetir.

## 10. Nombres de adjuntos: actualización del registro

Captura y visualización de nombres verificadas por el usuario con un correo real el 16/10/2026. El procedimiento siguiente se conserva para nuevas instalaciones y comprobaciones adicionales. No requiere ejecutar SQL, cambiar el manifiesto en Microsoft 365, añadir permisos ni reinstalar el BAT/componente Classic. Desplegar backend antes que frontend; cerrar y abrir el panel del complemento para que cargue el código nuevo. Si Outlook conserva la página anterior, recargar el panel antes de registrar el correo de prueba.

Registrar un correo nuevo con varios documentos y una firma con imágenes. Revisar los mismos nombres en Emails y Timeline, desplegar «+N más» y comprobar claro/oscuro. Repetir en Classic y Outlook Web y verificar que editar la tipología o la oferta mantiene los adjuntos. La apertura y las respuestas verificadas se mantienen independientes. Los correos históricos no se actualizan automáticamente y no se borra ningún registro. Los nombres son metadatos informativos; los archivos permanecen en Microsoft 365.

### Comprobación de los adjuntos antes de dar la entrega por aceptada

1. Desplegar backend y después frontend, y volver a abrir el complemento.
2. Registrar un correo nuevo con PDF, Excel y una firma incrustada; comprobar la lista en Emails y Timeline.
3. Repetir con enviado y recibido desde Classic y desde Web.
4. Comprobar más de tres archivos, expansión, nombres largos y los modos claro y oscuro.
5. Editar tipología u oferta y verificar que los nombres permanecen.
6. Preparar un borrador nuevo desde el CRM, añadir un archivo en Outlook, enviarlo y comprobar la lista tras la conciliación existente.

Los correos antiguos permanecen sin cambios. No ejecutar una importación histórica para completar esta prueba. Si aparece «Información no disponible», abrir el correo en Outlook para consultar los archivos; no significa que no tenga adjuntos. [Detalle técnico y límites](guia-integracion-outlook-exchange.md#7-nombres-de-adjuntos-en-el-crm).

### Verificación real comunicada el 16/10/2026

El usuario indicó: «he probado sincronizar un correo con adjuntos y los muestra perfectamente, esa funcionalidad ya esta verificada». Queda registrada la captura y visualización correcta de los nombres para el correo probado. No se especificó si se utilizó Classic o Web, si era enviado o recibido, ni se confirmó individualmente la matriz completa (ambas pestañas, expansión, modos claro/oscuro, incrustados o conciliación de borradores).

La corrección del borrado exclusivo del CRM y los contadores de tipología por oferta son cambios posteriores independientes: su verificación real sigue pendiente de confirmación. No se inicia ninguna recuperación histórica ni se modifica ningún registro por esta actualización documental.

## Uso general de Outlook verificado (19/10/2026)

**Entrega preparada para desplegar y validar.** Se retira el fallback antiguo de apertura y el configurador `dts-mail` de Ajustes y de las descargas públicas. Abrir un mensaje concreto, Responder y Responder a todos utilizan siempre la identidad verificada: Microsoft Graph en Web y componente `dts-outlook` en Classic. Si falta una identidad o un equipo vinculado, se explica el problema y se ofrece la configuración o Web; no se busca otro mensaje por asunto.

La búsqueda de conversaciones se conserva como **«Buscar conversación en Outlook Web»**, independiente de la preferencia Classic/Web. Copiar datos de búsqueda continúa disponible. La redacción de correos nuevos y los eventos de calendario conservan sus flujos existentes; no son el fallback antiguo de apertura de mensajes.

Ajustes descarga **`/downloads/outlook-classic/OutlookClassic.zip`**, versión **1.1.0**, cuando su metadata está publicada, y enlaza a **`/outlook-classic`** para vincular, revisar o revocar equipos propios. Extraer el ZIP completo y ejecutar `Instalar_Outlook_dTS.bat` con el usuario Windows habitual, sin administrador. Si el componente ya estaba instalado y la base restaurada perdió el vínculo, usar `Vincular_Outlook_dTS.bat`. El ejecutable no cambia en esta entrega; no es necesario reinstalar un componente 1.1.0 que funciona y conserva su vínculo.

El acceso se administra mediante los permisos de rol ya existentes para CRM/Contactos y los perfiles activos. No hay excepciones por correo electrónico. Las antiguas variables `CRM_EMAIL_IDENTITY_ENABLED`, `CRM_EMAIL_IDENTITY_EMAILS`, `CRM_OUTLOOK_CLASSIC_ENABLED` y `CRM_EMAIL_REPLY_ENABLED` dejan de controlar el flujo; pueden retirarse de Dokploy al desplegar. No alteran ya la disponibilidad aunque conserven valores antiguos. Se mantienen OAuth por usuario, pertenencia al buzón y cartera, firma de solicitudes, versión compatible del componente y vinculación/revocación de cada equipo. Los permisos se revisan en backend en cada operación.

**Despliegue:** publicar backend y frontend de esta entrega, recargar la app y comprobar perfil activo/rol, apertura Web/Classic, respuestas, descarga del ZIP y búsqueda Web. No requiere SQL adicional si ya están recuperados el esquema de identidad, las tablas Classic y `action`. No se modifica ninguna tabla sincronizada desde BC ni se inicia recuperación histórica. Tras desplegar, comprobar también que denegar el permiso de CRM por rol impide las operaciones aunque el equipo permanezca vinculado.

## 11. Supervisión por el administrador

La entrega del 19/10/2026 añade **Gestión de usuarios → Vinculaciones Outlook** para ADMIN activo. Permite revisar la conexión registrada de cada usuario y los equipos vinculados, sus versiones, último contacto y revocaciones. No hace falta reinstalar el componente ni ejecutar SQL para mostrarla si el esquema Classic ya existe.

Para retirar el acceso de un equipo, localizar usuario/equipo y confirmar «Revocar». No se borran correos ni se desconecta Microsoft 365; se invalida ese vínculo Classic. El usuario puede volver a ejecutar `Vincular_Outlook_dTS.bat` para crear una nueva vinculación. Una fecha de último contacto no implica que el ordenador esté encendido ahora. [Guía administrativa](vistas/06_administracion_configuracion/administracion_usuarios_rbac.md#pestaña-3-vinculaciones-outlook-19102026). Preparado para desplegar y validar; no se han revocado equipos reales durante las pruebas.


## Aceptación comunicada por el usuario (20/10/2026)

El usuario aprueba expresamente estas cinco comprobaciones: prueba de apertura sin crear borradores; vinculaciones de equipos; permisos por rol; avisos flotantes; contadores de tipología al filtrar por oferta. Esta confirmación actualiza los pendientes históricos de esos puntos. No se amplía a casos individuales adicionales que el usuario no haya detallado.

Prueba real de Classic 1.1.2: dos aperturas correctas del mismo correo, con Outlook abierto y cerrado. Desde solicitud emitida hasta confirmación: 2,51 s abierto y 6,23 s cerrado. Trabajo local de Outlook: 1,56 s y 5,16 s; consulta HTTP del componente al backend: 0,65 s y 0,57 s. El arranque en el caso cerrado consume 2,01 s. Los totales no incluyen la preparación inicial anterior a emitir la solicitud; son una muestra por situación, no una garantía de rendimiento. Recomendación: conservar el flujo actual de momento, sin optimización aplicada en esta entrega.

Actualización posterior del 20/10/2026: el usuario aprueba los adjuntos tras editar, el correo preparado desde CRM y las pruebas del segundo usuario. Queda completada la lista principal de aceptación de Outlook. No consta confirmación específica de nombres de adjuntos muy largos, selección entre varias copias del mensaje o escenarios con múltiples cuentas; se conservan como cobertura adicional no verificada. Se conservan las validaciones anteriores de apertura/respuestas, movimiento entre carpetas, adjuntos y borrado exclusivo del CRM.


## Cierre de las pruebas principales de Outlook (20/10/2026)

El usuario confirma: «adjuntos tras editar aprobado», «correo preparado desde crm aprobado» y «segundo usuario pruebas ok». Estas tres aceptaciones completan la lista principal junto con las aprobaciones de prueba sin borradores, vinculaciones, permisos por rol, avisos flotantes y contadores por oferta. Se mantienen las validaciones anteriores de apertura y respuestas Classic/Web, enviados/recibidos, cambio de carpeta, adjuntos y borrado exclusivo del CRM.

La apertura con Classic abierto y cerrado también finalizó correctamente con 1.1.2 (2,51 s y 6,23 s desde solicitud emitida hasta confirmación, respectivamente). No se aplica optimización de rendimiento. Este cierre es aceptación funcional del recorrido principal; no certifica todos los escenarios posibles. Los nombres de adjuntos muy largos, la selección de varias copias y múltiples cuentas siguen sin confirmación específica. PST, archivo en línea y buzones compartidos no quedan acreditados por estas pruebas. Sin cambios de código, SQL ni datos.
