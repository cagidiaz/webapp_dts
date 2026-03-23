# Manual de Usuario — WebApp dTS Instruments

> Este documento se completa dinámicamente según las funcionalidades activas en la plataforma.

## Índice

1. [Inicio de Sesión](#1-inicio-de-sesión)
2. [Navegación y Interfaz](#2-navegación-y-interfaz)
3. [Módulo de Finanzas](#3-módulo-de-finanzas)
    - 3.1 [Análisis de Balances](#31-análisis-de-balances)
    - 3.2 [Cuadro de Mando (20 Ratios)](#32-cuadro-de-mando-20-ratios)
    - 3.3 [Gráficos de Evolución](#33-gráficos-de-evolución)
    - 3.4 [Simulador de Escenarios](#34-simulador-de-escenarios)
4. [Módulo de Ventas](#4-módulo-de-ventas)
5. [Lógica de Cálculo y Cierre Estimado](#5-lógica-de-cálculo-y-cierre-estimado)
6. [Gestión de Usuarios (Admin)](#6-gestión-de-usuarios-admin)

---

## 1. Inicio de Sesión
El acceso está restringido a usuarios autorizados. Los perfiles disponibles son ADMIN, DIRECCION, VENTAS y OPERACIONES. 
- Utilice sus credenciales para acceder al panel principal.
- La plataforma recordará su sesión durante 24 horas.

## 2. Navegación y Interfaz
- **Sidebar**: Permite alternar entre los distintos módulos: Dashboard, Finanzas, Ventas y Ajustes.
- **Scroll Automático**: Al cambiar de página, la aplicación reinicia el scroll al inicio del título para facilitar la lectura.
- **Histórico**: Todas las tablas muestran por defecto los **últimos 4 años**, incluyendo el ejercicio actual proyectado.

## 3. Módulo de Finanzas

Este módulo agrupa las herramientas de análisis patrimonial, solvencia y rentabilidad de dTS Instruments.

### 3.1 Análisis de Balances
Ubicado en **Finanzas > Balances**.
- **Tabla de Balances**: Muestra el Activo, Pasivo y Patrimonio Neto con un **Análisis Vertical** (debajo de cada importe aparece el % que representa sobre el total).
- **Variación Anual**: Debajo del balance, encontrará una tabla que calcula el crecimiento o descenso (%) de cada partida respecto al año anterior.
- **Visualización**: Los gráficos de barras laterales comparan la estructura del Activo frente al Pasivo + PN.

### 3.2 Cuadro de Mando (20 Ratios)
Ubicado en **Finanzas > Ratios (Tabla)**.
- Presenta 20 indicadores clave divididos en 4 bloques: **Liquidez, Solvencia, Gestión y Rentabilidad**.
- Cada ratio incluye una **Definición** y la **Fórmula** utilizada para su cálculo para total transparencia.
- Los datos del año en curso aparecen con la etiqueta **(Est.)** si el ejercicio no está cerrado.

### 3.3 Gráficos de Evolución
Ubicado en **Finanzas > Ratios (Gráficos)**.
- Visualización de tendencias en áreas críticas:
  - **Eficiencia Operativa**: Margen Neto vs Margen de Explotación.
  - **Rentabilidad**: ROE vs ROA.
  - **Tesorería**: Evolución de la Liquidez y Prueba Ácida.
  - **Solvencia**: Capacidad de garantía patrimonial.

### 3.4 Simulador de Escenarios
Ubicado en **Finanzas > Simulador**.
Es una herramienta predictiva para modelar el cierre del año actual:
- **Variación de Ventas**: Ajusta el crecimiento proyectado de ingresos (-10% a +50%).
- **Variación de Costes**: Modifica la estructura de gastos. (Positivo = Aumento de costes, Negativo = Ahorro).
- **Proyección de EBITDA**: El sistema calcula en tiempo real el nuevo EBITDA estimado y los márgenes según los cambios aplicados.
- **Guardado**: Permite guardar escenarios con nombre propio para revisiones posteriores.

## 4. Módulo de Ventas
- *Pendiente de documentación tras la activación de módulos específicos.*

## 5. Lógica de Cálculo y Cierre Estimado

La aplicación dTS Instruments proyecta automáticamente el **Cierre de Año (Est.)** cuando el ejercicio actual aún no ha finalizado (ej. año 2026). 

### A. Pérdidas y Ganancias (P&G) — Columnas "(Est.)"
Para partidas de ingresos y gastos, el motor utiliza **Extrapolación Lineal**:
- **Cerrado vs Pendiente**: Si se han subido datos de 2 meses (Enero y Febrero), el sistema suma dichos meses reales y multiplica el resultado por 6 (`12 / 2`) para proyectar el año completo.
- **Detección de Mes**: El sistema detecta automáticamente el mes más reciente cargado para cada cuenta en la base de datos de Supabase.

### B. Balance de Situación — Columnas "(Est.)"
A diferencia de la P&G, el balance no se extrapola linealmente por tiempo:
1. **Dato de Snapshot**: Se toma el importe del último mes disponible (ej. Febrero) como la situación real a esa fecha. Al ser una "foto" del patrimonio en un momento dado, no se multiplica por el factor de tiempo.
2. **Totales**: Los totales se recalculan automáticamente sumando todas sus subpartidas para asegurar la cuadratura contable.

---

*Manual de dTS Instruments v2.1 — Actualizado a marzo 2026.*
