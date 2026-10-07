# 🏢 Documentación de Vista: CRM — Clientes

> **Ubicación en la aplicación:** `/crm/customers`  
> **Acceso en menú:** CRM → *Clientes*  
> **Componente frontend:** `frontend/src/pages/crm/components/CrmCustomers.tsx`  
> **Componente de análisis:** `frontend/src/pages/crm/components/CustomerRelationshipMatrix.tsx`  
> **API cliente:** `frontend/src/api/customers.ts`  
> **Servicio backend:** `backend/src/modules/customers/customers.service.ts`  
> **Controlador backend:** `backend/src/modules/customers/customers.controller.ts` (`GET /customers`, `GET /customers/salespersons`, `GET /customers/relationship-matrix`, `PATCH /customers/:clientId/client-type`)  
> **Última actualización:** Septiembre 2026

---

## 1. Propósito y utilidad de negocio 🎯

La vista **CRM — Clientes** centraliza el directorio de cuentas comerciales de dTS Instruments y su análisis de relación con la empresa. Permite consultar la cartera, segmentarla por responsable y tipología de relación, vigilar el saldo pendiente y revisar cómo evoluciona la facturación de cada grupo de clientes.

Sus dos áreas de trabajo son:

* **Directorio de Clientes:** localización y mantenimiento de la clasificación comercial de cada cuenta.
* **Matriz de Relación / Análisis YTD:** lectura agregada de clientes y facturación por tipología, con comparación frente al ejercicio anterior y desglose por comercial.

Los datos maestros de cuentas se sincronizan desde **Microsoft Dynamics 365 Business Central**. La aplicación no crea clientes: cualquier alta debe realizarse en el ERP y llegará a la plataforma mediante los flujos de sincronización.

---

## 2. Estructura de la vista 🖥️

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Pestañas: [ Directorio de Clientes ] [ Matriz de Relación / Análisis YTD ]│
├──────────────────────────────────────────────────────────────────────────┤
│ Directorio                                                               │
│  [Ventas Totales] [Cuentas Activas] [Pendiente Revisión] [Deuda Acum.]   │
│  Búsqueda + filtros de Comercial y Relación                              │
│  Tabla con scroll infinito: 50 cuentas por carga                         │
├──────────────────────────────────────────────────────────────────────────┤
│ Matriz YTD                                                               │
│  Selector de ejercicio y criterio YTD / ejercicio completo               │
│  Total empresa o pestaña de comercial                                    │
│  Filas A–F, subtotales y total; exportación Excel y drill-down           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directorio de Clientes 📋

### 3.1 Indicadores superiores

Los cuatro KPI se recalculan sobre el conjunto resultante de los filtros activos:

| KPI | Cálculo / origen | Utilidad |
| :--- | :--- | :--- |
| **Ventas Totales** | Suma de `total_sales`. | Facturación acumulada de las cuentas visibles. |
| **Cuentas Activas** | Número de registros devueltos por la consulta. | Tamaño de la cartera bajo análisis. |
| **Pendiente de Revisión** | Clientes creados desde el inicio del año en curso. | Identifica altas recientes que requieren seguimiento comercial. |
| **Deuda Acumulada** | Suma de `balance_due_lcy`. | Importe pendiente de cobro para priorizar la gestión financiera. |

> Los clientes técnicos o comodín de nueva captación (`9999999`, `99999999` y sus variantes `CLI-`) se excluyen desde el servicio de datos para no alterar el directorio ni sus agregados.

### 3.2 Búsqueda y filtros

* **Buscador con espera de 400 ms:** busca por nombre, código de cliente, ciudad, provincia, territorio o código de comercial, sin lanzar una consulta por cada pulsación.
* **Comercial:** permite acotar el directorio a un responsable. Para usuarios de `VENTAS`, `OPERACIONES` y `PRODUCCION`, se fija automáticamente el código del usuario y el selector no se muestra.
* **Relación:** filtra por las categorías A–F descritas en la sección 4.
* **Restablecer filtros:** limpia búsqueda y relación; en perfiles con cartera asignada mantiene el comercial propio como medida de alcance funcional.

La carga se realiza en páginas de **50 clientes**. Al alcanzar el final de la tabla, el observador de intersección solicita la siguiente página sin interrumpir la navegación.

### 3.3 Tabla de cuentas

| Columna | Contenido |
| :--- | :--- |
| **Código** | Identificador de cliente procedente de Business Central (`client_id`). |
| **Nombre del Cliente** | Nombre comercial, avatar con iniciales y, si existe, página web. |
| **Ciudad** | Ciudad registrada; muestra `---` cuando no está informada. |
| **Comercial** | Código del responsable asignado. |
| **Deuda Pendiente** | Saldo vencido o pendiente (`balance_due_lcy`), en euros. |
| **Ventas Totales** | Facturación acumulada de la cuenta (`total_sales`). |
| **Tipo Cliente** | Selector editable de categoría de relación A–F o *Sin clasificar*. |
| **Estado** | `Activo` o `Bloqueado`, según el campo de bloqueo recibido del ERP. |

El cambio de **Tipo Cliente** se guarda de inmediato mediante `PATCH /customers/:clientId/client-type`. Tras la actualización se invalidan las consultas del directorio para reflejar la categoría actual sin recarga manual.

---

## 4. Tipología de relación comercial 🤝

La clasificación se gestiona por cuenta y sirve tanto para filtrar el directorio como para agrupar la matriz:

| Código | Categoría | Interpretación comercial |
| :---: | :--- | :--- |
| **A** | Clientes Leales o Fieles | Clientes que recomiendan la marca. |
| **B** | Habituales / Frecuentes | Compran de forma recurrente y confían en la marca. |
| **C** | Clientes Ocasionales | Compran puntualmente, sin ritmo fijo. |
| **D** | Clientes Nuevos | Han realizado su primera compra recientemente. |
| **E** | Potenciales | Aún no han comprado, pero muestran interés. |
| **F** | Inactivos | Compraron en el pasado, pero han dejado de hacerlo. |

La categoría es editable para las cuentas que el usuario puede consultar. Los registros sin categoría permanecen identificados como **Sin clasificar** y también se contabilizan en la matriz cuando existan.

---

## 5. Matriz de Relación / Análisis YTD 📊

La segunda pestaña convierte el directorio en una lectura de cartera y retención. Presenta primero el bloque **Total Empresa** y permite seleccionar cada comercial disponible.

### 5.1 Controles de análisis

* **Ejercicio:** parte del año actual y permite cambiar el año a analizar.
* **YTD / año completo:** por defecto compara hasta el mismo día del año seleccionado (*Year to Date*), para que la comparación con el ejercicio anterior sea homogénea. El usuario puede consultar el ejercicio completo.
* **Pestañas de comercial:** muestran el agregado corporativo o cada responsable. La interfaz omite a Joaquim Pla (`JPL`) de la lista de pestañas.
* **Alcance por rol:** los perfiles comerciales ven únicamente su propio bloque cuando tienen código de comercial asignado.
* **Exportar a Excel:** descarga `matriz_relacion_clientes_<año>.xlsx` con el total de empresa y los bloques de comerciales accesibles.

### 5.2 Métricas de cada fila

Para cada tipo A–F —y, cuando corresponda, *Sin clasificar*— se muestran:

| Métrica | Descripción |
| :--- | :--- |
| **Facturación del ejercicio** | Ventas del tipo de cliente en el año seleccionado. |
| **% sobre facturación** | Peso relativo de esa facturación frente al total del bloque. |
| **Facturación año anterior** | Importe comparable del ejercicio previo. |
| **Variación YoY** | Variación porcentual interanual entre ambas facturaciones. |
| **Nº Clientes** | Cuentas incluidas en la categoría. |
| **% sobre clientes** | Peso de la categoría sobre el total de cuentas del bloque. |

La matriz añade dos subtotales orientados a la toma de decisiones:

* **A + B — Retención:** cartera leal y habitual, núcleo recurrente del negocio.
* **C + D + E + F — Desarrollo:** cartera ocasional, nueva, potencial o inactiva, foco de crecimiento y reactivación.

El total del bloque cierra los porcentajes al 100 % y ofrece el resultado consolidado para la empresa o el comercial seleccionado.

### 5.3 Navegación desde el análisis al detalle

Al seleccionar una fila de categoría, la aplicación vuelve al **Directorio de Clientes** con el tipo correspondiente aplicado. Si la fila procede de un comercial concreto, también aplica ese comercial —salvo en perfiles comerciales, cuyo filtro propio se conserva—. Esto permite pasar del agregado a la lista de cuentas que explica el dato.

---

## 6. Datos e integración técnica 🔌

| Recurso | Finalidad |
| :--- | :--- |
| `GET /customers` | Directorio paginado, búsqueda, filtros, ordenación y resumen de KPI. |
| `GET /customers/salespersons` | Lista de comerciales con clientes asignados para el filtro. |
| `GET /customers/relationship-matrix` | Matriz por tipología, año, comercial y criterio YTD. |
| `PATCH /customers/:clientId/client-type` | Actualiza la clasificación A–F de una cuenta. |

Todas las rutas requieren autenticación JWT. En el frontend, la ruta CRM está disponible para `ADMIN`, `DIRECCION`, `VENTAS`, `OPERACIONES`, `PRODUCCION` y `TESTER`; la restricción de cartera descrita anteriormente se aplica en la propia vista para los perfiles comerciales.

---

## 7. Consideraciones operativas ⚠️

* La vista es una herramienta de consulta y clasificación comercial; no sustituye el alta ni la modificación de datos maestros de Business Central.
* Un saldo pendiente elevado no implica por sí mismo que la cuenta esté bloqueada: ambos valores se muestran de forma independiente.
* La comparación YTD debe interpretarse con el mismo corte temporal para evitar atribuir a crecimiento lo que sea simplemente diferencia de días transcurridos.
* Las categorías A–F son un dato de gestión comercial. Conviene acordar sus criterios de asignación y revisar periódicamente las cuentas *Sin clasificar* para que la matriz sea accionable.
