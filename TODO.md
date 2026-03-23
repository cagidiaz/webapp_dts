# Proyecto dTS Instruments - Notas de Simulación y Pendientes

## 🔍 Estado Actual de Simulaciones (Marzo 2026)
- Se ha implementado un motor de simulación que permite comparar Escenarios Reales vs Presupuestos.
- **Lógica de Fallback:** Dado que el presupuesto 2026 actual solo contiene **gastos**, el sistema toma automáticamente las **ventas reales de 2025** como base para las proyecciones de 2026.
- **Mapeo de Cuentas:** Se han incluido códigos de tributos (63) y resultados extraordinarios (67) dentro de los Gastos de Explotación (A.7).

## ⚠️ Pendiente Crítico: RLS en Supabase
Si los datos no aparecen en el frontend, es necesario habilitar los permisos de lectura en Supabase:
```sql
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir lectura para todos" ON public.budgets FOR SELECT USING (true);
```

## 📅 Próximos Pasos (USER)
1. **Subir Presupuesto de Ventas 2026:** Una vez subas las líneas de ventas (códigos 70/74) a la tabla `budgets`, la simulación dejará de usar el fallback de 2025 y usará tus objetivos reales de 2026.
2. **Revisar Escenarios:** Validar si el EBITDA negativo es aceptable según el volumen de gastos cargado (~2.6M€).

---
*Nota: No se han realizado nuevos commits en GitHub a petición del usuario hasta confirmar funcionamiento local.*
