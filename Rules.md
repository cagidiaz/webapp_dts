# 📜 MANUAL DE REGLAS Y BUENAS PRÁCTICAS DE DESARROLLO (RULES.md) - v1.2
## Proyecto: WebApp dTS Instruments
**Objetivo:** Garantizar un código limpio, escalable, seguro y alineado con la identidad corporativa.

---

## 1. PRINCIPIOS DE ARQUITECTURA

### 1.1 Inmutabilidad de Datos de Negocio (Crítico)
* **Regla de Oro:** Los datos que provienen de Dynamics Business Central (vía n8n) son **SOLO LECTURA**. 
* **Restricción:** Solo lectura (`SELECT`) para tablas operativas reales. No se permiten mezclas físicas de datos reales y previsiones en las mismas tablas de la base de datos.
* **Excepción:** Solo se permiten escrituras en las tablas de `auth`, `profiles` y `roles` gestionadas por Supabase.

### 1.2 Modularidad Independiente
* Cada funcionalidad (Contabilidad, Ventas, Stock, Finanzas, etc.) debe ser un módulo aislado.
* **Estructura:** Si se elimina una carpeta de módulo, el resto de la aplicación debe seguir funcionando sin errores de dependencia circular.

### 1.3 Segregación de Previsiones (Escenarios What-If)
* **Tablas Espejo:** Los presupuestos y previsiones deben residir en esquemas o tablas separadas (`sales_budgets`, `budgets`).
* **Unificación en Capa de Aplicación:** La comparativa "Real vs. Previsión" se realizará mediante `JOINs` en el Backend o agregaciones en el Frontend, nunca alterando la fuente de origen.

---

## 2. ESTÁNDARES TÉCNICOS: BACKEND (NESTJS)

### 2.1 Tipado y Estructura
* **TypeScript Estricto:** Prohibido el uso de `any`. Definir `Interfaces` o `DTOs` para cada entrada y salida de datos.
* **Arquitectura:** Seguir el patrón de NestJS: `Controller` (Rutas) -> `Service` (Lógica) -> `Module` (Inyección de dependencias).

### 2.2 Lógica de Negocio y KPIs (Reglas Críticas)
* **Valoración de Pedidos (Cartera/Pendientes):** 
    * **Fórmula de Precio Efectivo:** No usar `unit_price` directamente si existen descuentos. El precio real de cada línea se calcula como `(line_amount / quantity)`.
    * **Exclusión de Ceros:** Las líneas con precio efectivo o cantidad igual a cero **NO** deben sumarse a los KPIs.
* **Comparativas Temporales (YTD):**
    * Para el año actual, las consultas deben soportar el parámetro `limitToToday` para realizar comparaciones "día a día" (YTD vs LYTD) y evitar comparativas injustas con meses incompletos.
* **Desglose de Cuentas (G/L Accounts):**
    * En los KPIs de pedidos, se debe mostrar de forma desglosada (generalmente debajo o al lado de la cifra principal) el total correspondiente a líneas de cuentas contables.

### 2.3 Seguridad
* **Validación:** Uso obligatorio de `ValidationPipe` con `class-validator`.
* **Autenticación:** Implementar `Passport` con `JwtStrategy` conectado a los tokens de Supabase Auth.

---

## 3. ESTÁNDARES TÉCNICOS: FRONTEND (REACT)

### 3.1 Interfaz de Usuario (UI/UX)
* **Aesthetics:** El diseño debe ser premium, moderno y dinámico (Rich Aesthetics).
* **Nomenclatura Oficial de KPIs:**
    * `VENTAS YTD VS VENTAS LYTD`: Para comparativas de ventas acumuladas.
    * `OBJETIVO FACTURACIÓN ANUAL`: Para el seguimiento del presupuesto anual.
    * `CARTERA DE PEDIDOS`: Título general para el bloque de pedidos abiertos.
* **Estilos de KPIs:**
    * Los porcentajes de desviación deben ser grandes (`text-xl`), con fuente ligera (`font-light`) y pegados al valor principal (`mt-0.5`).

### 3.2 Gestión de Estado y Datos
* **Zustand:** Para estados globales ligeros (filtros, sesión, sidebar).
* **React Query:** Para el consumo de la API con estrategias de cacheo.

---

## 4. CONTROL DE VERSIONES Y DESPLIEGUE (GIT)

### 4.1 Reglas de Commit y Push
* **Idioma:** **TODOS** los mensajes de commit deben redactarse en **español**.
* **Semántica:** Usar prefijos `feat:`, `fix:`, `style:`, `docs:`, etc.
* **PUSH MANUAL:** Está estrictamente prohibido que la IA realice un `git push` automático. Solo se hará bajo petición explícita del usuario.
* **Actualizaciones en la App:** 
    * Solo los commits `feat:` y `style:` que sean descriptivos aparecerán en el modal de novedades de la app.
    * Los `fix:` y cambios técnicos deben estar en español pero se filtran para no molestar al usuario.
* **Etiquetado:** Usar corchetes para cambios específicos de rol: `[ADMIN]`, `[SALES]`.

---

## 5. CHECKLIST DE CALIDAD (PRE-ENTREGA)
- [ ] ¿El código sigue el esquema de colores corporativos?
- [ ] ¿Los mensajes de commit están en español?
- [ ] ¿La valoración de pedidos usa el Precio Efectivo (Neto)?
- [ ] ¿Se han excluido las líneas de precio cero en los KPIs?
- [ ] ¿El KPI de Ventas es comparativo "día a día" (YTD)?
- [ ] ¿Los porcentajes de desviación en el Dashboard tienen el estilo XL Light?
- [ ] ¿Se ha respetado la prohibición de push automático?
- [ ] ¿La interfaz es 100% responsiva?
