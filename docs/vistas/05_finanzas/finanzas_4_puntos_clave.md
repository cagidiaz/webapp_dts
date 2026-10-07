# 💎 Documentación de Vista: Finanzas — 4 Puntos Clave

> **Ubicación en la aplicación:** `/finance/key-points`  
> **Acceso en menú:** Finanzas → *4 Puntos Clave*  
> **Componente Frontend:** [`KeyPointsPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/finance/KeyPointsPage.tsx)  
> **Servicio Backend:** `backend/src/modules/finance/finance.service.ts` (`getBalanceData`)  
> **Tabla de Base de Datos:** `financial_balances`  
> **Control de Acceso (RBAC):** Restringido a roles `ADMIN` y `DIRECCION`.  
> **Última actualización:** Octubre 2026

---

## 1. Propósito y Utilidad de Negocio 🎯

La vista **4 Puntos Clave** es el cuadro de mando ejecutivo por excelencia para la Dirección General. Destila la complejidad del balance de situación en las cuatro dimensiones fundamentales de supervivencia y fortaleza corporativa:

1. **Liquidez**: ¿Dispone la empresa de recursos a corto plazo suficientes para pagar sus deudas inmediatas?
2. **Capitalización / Autonomía**: ¿Qué porcentaje del activo total está financiado con fondos propios de la compañía?
3. **Endeudamiento**: ¿Cuántas veces supera el volumen total de deuda a los fondos propios?
4. **Garantía Patrimonial**: ¿Cuál es el respaldo real de los activos frente a los acreedores en caso de liquidación?

---

## 2. Definición, Fórmulas y Rangos Óptimos de los 4 Puntos 📐

| Punto Clave | Fórmula Contable | Rango Óptimo | Interpretación en dTS |
| :--- | :--- | :--- | :--- |
| **1. Liquidez** | $\frac{\text{Activo Circulante (1.B)}}{\text{Pasivo Corto Plazo (2.C)}}$ | **> 1,50** | Garantiza que no habrá tensiones de tesorería para atender pagos operativos inmediatos. |
| **2. Capitalización** | $\frac{\text{Patrimonio Neto (2.A)}}{\text{Total Activo (1.TOT)}} \times 100$ | **40% – 60%** | Mide el grado de independencia financiera respecto a la banca y acreedores externos. |
| **3. Endeudamiento** | $\frac{\text{Total Pasivo (2.B + 2.C)}}{\text{Patrimonio Neto (2.A)}}$ | **< 1,50** | Nivel de apalancamiento. Cuanto menor sea, menor es el riesgo de insolvencia o sobrecarga financiera. |
| **4. Garantía** | $\frac{\text{Total Activo (1.TOT)}}{\text{Total Pasivo (2.B + 2.C)}}$ | **> 1,80 – 2,00** | Margen de seguridad para los acreedores antes de que la empresa entre en quiebra técnica. |

---

## 3. Estructura Visual e Interacción 🖥️

* **Selector de Ejercicio:** Desplegable para seleccionar el año de análisis (histórico cerrado o proyección actual).
* **Tarjetas Semánticas de Diagnóstico:** Cada uno de los 4 pilares se renderiza en una tarjeta con código de colores según se encuentre en rango óptimo (verde), de atención (ámbar) o de riesgo (rojo).
* **Gráficos de Distribución de Activo y Pasivo:** Paneles auxiliares que detallan visualmente el peso de Fijo, Existencias, Realizable y Disponible frente a Fondos Propios y Deudas.
