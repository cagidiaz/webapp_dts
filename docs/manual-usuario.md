# Manual de Usuario — WebApp dTS Instruments

> Este documento detalla el funcionamiento técnico y la procedencia de los datos de la plataforma dTS Instruments para asegurar la transparencia en el análisis de negocio.

## Índice

1. [Dashboard Principal](#1-dashboard-principal)
2. [Módulo de Finanzas](#2-módulo-de-finanzas)
    - 2.1 [Análisis de Balances](#21-análisis-de-balances)
    - 2.2 [4 Puntos Clave (Análisis Rápido)](#22-4-puntos-clave-análisis-rápido)
    - 2.3 [Cuadro de Mando (20 Ratios)](#23-cuadro-de-mando-20-ratios)
    - 2.4 [Evolución de Ratios (Gráficos)](#24-evolución-de-ratios-gráficos)
    - 2.5 [Simulador de Escenarios](#25-simulador-de-escenarios)
3. [Módulo de Ventas (Clientes y Productos)](#3-módulo-de-ventas-clientes-y-productos)
    - 3.1 [Scroll Infinito y Rendimiento](#31-scroll-infinito-y-rendimiento)
    - 3.2 [Filtros y Búsqueda Avanzada](#32-filtros-y-búsqueda-avanzada)
    - 3.3 [KPIs Dinámicos y Ordenación](#33-kpis-dinámicos-y-ordenación)
    - 3.4 [Presupuestos de Ventas (Novedad)](#34-presupuestos-de-ventas-novedad)
    - 3.5 [Seguimiento de Pedidos (Novedad)](#35-seguimiento-de-pedidos-novedad)
4. [Lógica de Cálculo y Datos (Backend)](#4-lógica-de-cálculo-y-datos-backend)
    - 4.1 [Fuentes de Información](#41-fuentes-de-información)
    - 4.2 [Proyección de Cierre 2026 (Est.)](#42-proyección-de-cierre-2026-est)
5. [Exportación de Datos (XLSX)](#5-exportación-de-datos-xlsx)
6. [Gestión de Usuarios (Admin)](#6-gestión-de-usuarios-admin)
7. [Sistema de Notificaciones y Actualizaciones (Novedad)](#7-sistema-de-notificaciones-y-actualizaciones-novedad)

---

## 1. Dashboard Principal
El Dashboard es el centro de monitorización en tiempo real del cumplimiento de objetivos.
- **Ventas Cierre Est.**: Muestra la previsión de ventas a final de año. Si existe un presupuesto cargado para 2026, toma el valor objetivo del presupuesto.
- **EBITDA Cierre Est.**: Resultado operativo proyectado antes de amortizaciones. Se calcula cruzando el presupuesto de ventas con el de gastos.
- **Ventas YTD vs Ppto YTD (Actualizado)**: Compara las **Ventas Reales YTD** (lo facturado hasta hoy) contra el **Presupuesto Acumulado (YTD)**. Este KPI muestra ambos valores con el mismo tamaño de letra para una comparativa directa y equilibrada del cumplimiento de objetivos a fecha actual.
- **Objetivo Anual (Velocímetro)**: Gráfico circular de precisión que indica el porcentaje de cumplimiento del objetivo total de facturación para el año completo. Dispone de aguja en flecha, marcas cada 25% y un arco de seguimiento para facilitar la lectura.
- **Evolución Ventas vs Presupuesto (Actualizado)**: Gráfico de área que muestra la comparativa **acumulada (YTD)** mensual. Permite visualizar tres líneas críticas: las ventas del año actual (en verde), las del año anterior (en índigo) y el presupuesto objetivo (línea discontinua).

## 2. Módulo de Finanzas

### 2.1 Análisis de Balances
Ubicado en **Finanzas > Balances**.
- **Propósito**: Analizar la solidez patrimonial y el crecimiento de la empresa.
- **Datos utilizados**: Provienen de la tabla `financial_balances`.

### 2.2 4 Puntos Clave (Análisis Rápido)
Ubicado en **Finanzas > Puntos Clave**.
- **Propósito**: Evaluación inmediata de la salud financiera mediante semáforos (Verde/Rojo).

### 2.3 Cuadro de Mando (20 Ratios)
Ubicado en **Finanzas > Ratios (Tabla)**.
- **Propósito**: Auditoría financiera profunda en 4 bloques: Liquidez, Solvencia, Gestión y Rentabilidad.

### 2.4 Evolución de Ratios (Gráficos)
Ubicado en **Finanzas > Ratios (Gráficos)**.
- Visualiza las tendencias históricas y posiciones proyectadas (Est.).

### 2.5 Simulador de Escenarios
Ubicado en **Finanzas > Simulador**.
- Permite proyectar el EBITDA y Tesorería variando ventas y costes.

---

## 3. Módulo de Ventas (Clientes y Productos)

### 3.1 Scroll Infinito y Rendimiento
- Carga bajo demanda para manejar miles de registros con fluidez.

### 3.2 Filtros y Búsqueda Avanzada
- Filtros por Vendedor, Familia y buscadores inteligentes (Combobox).

### 3.3 KPIs Dinámicos y Ordenación
- Ordenación instantánea y lógica de stock físico (ignorar negativos).

#### 3.4 Presupuestos de Ventas (Novedad)
- Comparativa en tiempo real de facturación frente a objetivos con filtrado por vendedor.

#### 3.5 Seguimiento de Pedidos (Novedad)
- Monitorización de cartera (backlog) y pendientes de facturar.

### 3.6 Exportación de Datos (XLSX)
- Descarga de listados completos respetando los filtros activos de la UI.

---

## 7. Sistema de Notificaciones y Actualizaciones (Novedad)
Para asegurar que todos los usuarios están al tanto de las mejoras y cambios en la plataforma, se ha integrado un sistema de avisos automáticos:
- **Aviso de Novedades**: Ventana emergente al detectar actualizaciones críticas.
- **Centro de Notificaciones**: Historial de los últimos 3 cambios técnicos en la campana de la barra superior.
- **Filtrado por Relevancia**: Notificaciones personalizadas según el rol del usuario (Ventas, Dirección, Admin).

---

## Registro de Modificaciones Técnicas (Resumen)
- **4 Mayo 2026 (v3.8)**: 
  - Implementación de **Velocímetro de Objetivo Anual** con aguja de flecha y marcas.
  - Actualización de KPIs a modelo **YTD (Real vs Ppto)**.
  - Integración del **Sistema de Notificaciones** con GitHub.
- **17 Abril 2026 (v3.0)**: Exportación a Excel (XLSX).
- **16 Abril 2026 (v2.9)**: Seguimiento de Pedidos y estandarización estética.

*Manual de dTS Instruments v3.8 — Actualizado a 4 de mayo 2026.*
