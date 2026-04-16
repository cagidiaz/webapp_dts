# Proyecto dTS Instruments - Notas de Simulación y Pendientes

## ✅ Implementado Recentemente (Abril 2026)
- **Estandarización UI Ventas:** Unificación del diseño entre Clientes y Presupuestos (Buscador integrado, tablas sin espaciado, pies de totales fijos).
- **Módulo Pedidos de Venta:** Implementación completa del seguimiento de pedidos abiertos con scroll infinito y ordenación dinámica.
- **KPIs de Cartera:** Lógica de conteo de pedidos únicos (cabeceras) vs líneas para mayor precisión comercial.
- **Deduplicación de Datos:** Sistema de seguridad en frontend para evitar claves duplicadas en listas de carga infinita.

## 🔍 Estado de Simulaciones
- **Ventas Reales vs Presupuesto:** El sistema compara ventas facturadas frente a objetivos cargados en el módulo de presupuestos.
- **Lógica de Fallback:** Si no hay presupuesto 2026 de ventas, el sistema usa 2025 como base.

## ⚠️ Pendiente Crítico: RLS en Supabase
Si los datos no aparecen en el frontend, es necesario habilitar los permisos de lectura en Supabase:
```sql
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir lectura para todos" ON public.budgets FOR SELECT USING (true);
```

## 📅 Próximos Pasos
1. **Subir Presupuesto de Ventas 2026:** Para desactivar el fallback automático.
2. **Módulo de Compras:** Replicar el análisis de rendimiento para el área de aprovisionamiento.
