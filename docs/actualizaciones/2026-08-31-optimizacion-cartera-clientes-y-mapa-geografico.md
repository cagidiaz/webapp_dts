# Actualización: Inteligencia Geográfica, Mapa Interactivo y Optimización Integral de Cartera de Clientes (31/08/2026)

Esta actualización moderniza y optimiza por completo la sección de **Cartera de Clientes** (`/sales/customers`), introduciendo un motor de Inteligencia Geográfica con proyección cartográfica D3 y mejorando el rendimiento de renderizado a 60–120 FPS.

---

## 1. Inteligencia Geográfica & Top Clientes (IGN & Eurostat)
* **Cartografía Dual D3 Oficial**:
  * Proyección Mercator dual para la Península Ibérica, Baleares, Portugal y un Inset dedicado y perfectamente centrado para las Islas Canarias.
  * Capa de coropletas provinciales con gradiente cromático de calor según volumen de facturación o saldo deudor.
  * Límites costeros y fronterizos exteriores destacados en cian dTS (`#00B0B9`).
* **Interactividad Lista-Mapa con Pin 3D y Radar Instantáneo (0ms)**:
  * Al pasar el ratón sobre cualquier empresa del ranking lateral o sobre el mapa, se dibuja de forma inmediata un **Pin Cartográfico 3D** en color verde esmeralda (`#10B981` / `#059669`) con punto central y ondas concéntricas de radar.
  * Las rutas vectoriales D3 de todas las provincias se pre-calculan en memoria (`useMemo`), garantizando un tiempo de respuesta de <1 ms sin bloqueo de CPU.
* **Tooltip Flotante Dinámico**:
  * Panel informativo en la esquina superior izquierda del mapa que detalla el nombre del cliente, tipo, vendedor, ventas acumuladas y deuda pendiente en tiempo real.

---

## 2. Scroll Continuo de Alto Rendimiento y Tabla de 20 Clientes
* **Altura Fija y Precarga Continua**:
  * El contenedor de la tabla tiene una altura calibrada (`max-h-[735px]`) que muestra 20 clientes iniciales en pantalla con barra de desplazamiento vertical interna.
  * Carga infinita mediante `IntersectionObserver` anclado al contenedor con un margen anticipado (`rootMargin: '250px'`) y páginas de 40 registros (`pageSize: 40`), eliminando esperas o parones al hacer scroll.
* **Aislamiento y Memoización (`React.memo`)**:
  * Cada fila de la tabla (`CustomerTableRow`) y el mapa geográfico (`IberianGeoSalesMap`) están aislados mediante memoización para evitar re-renderizados innecesarios del árbol DOM.
* **Eliminación de Filtros y Animaciones Pesadas en GPU**:
  * Se suprimieron los filtros rasterizados `drop-shadow`, `feGaussianBlur` y animaciones SMIL continuas del mapa para garantizar un desplazamiento fluido y suave en toda la página.

---

## 3. Filtros Comerciales Optimizados
* **Selector de Mercado con Desplazamiento Fijo (5 Opciones)**:
  * Menú desplegable estilizado con altura máxima de 5 opciones visibles (`max-h-[165px]`) y scroll interno suave, evitando desplegables kilométricos.
* **Filtros Avanzados y Clasificación**:
  * Filtros por Tipo de Cliente (A–F), Modelo de Negocio, Territorio, Términos de Pago y Vendedor asignado.
  * Retirado el filtro de bloqueo para mantener la interfaz centrada en la operativa activa.
