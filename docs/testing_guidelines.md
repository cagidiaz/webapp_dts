# Protocolo de Testeo y Verificación de Datos

Este documento sirve como guía para el equipo (y para mí como asistente de IA) sobre cómo realizar pruebas de datos y depuración sin ensuciar la estructura principal del backend.

## 1. Ubicación de Scripts de Prueba
Todos los scripts de depuración, inspección de base de datos y validación de cálculos dinámicos deben residir en:
`backend/scripts/`

## 2. Inventario de Scripts Disponibles
Actualmente contamos con herramientas útiles para verificar la integridad de dTS Instruments:

-   **`analyze_2026.ts`**: Desglose profundo de ratios presupuestarios para 2026 (útil para cuadrar el Punto de Equilibrio).
-   **`inspect_income.ts` / `inspect_income_clean.ts`**: Validación de las tablas de Pérdidas y Ganancias cargadas en Supabase.
-   **`check-roles.ts` / `check-supabase.ts`**: Verificación de conectividad y políticas de seguridad (RLS) en tiempo real.
-   **`test-budgets.ts`**: Comprobación de que los presupuestos están siendo inyectados correctamente desde las tablas `budgets` y `sales_budgets`.

## 3. Guía de Ejecución
Para ejecutar cualquiera de estos scripts desde la raíz del backend:
```powershell
npx tsx scripts/nombre-del-archivo.ts
```

## 4. Mejores Prácticas
1.  **No usar archivos en la raíz**: Nunca crear archivos `.ts` o `.js` sueltos en `backend/` para pruebas rápidas.
2.  **Aprovechar Scripts Existentes**: Antes de crear un nuevo test de conexión, usa `check-supabase.ts`.
3.  **Actualizar este documento**: Si se crea una herramienta de diagnóstico nueva y útil, añadirla al inventario anterior.
4.  **Uso de `.env`**: Los scripts están configurados para leer el archivo `.env` de la raíz de `backend`, asegurando que usan las mismas credenciales que la app principal.
