# Actualización: Gráfico Donut Interactivo en Ofertas Comerciales y Corrección de Briefing CRM

**Fecha:** 28 de Septiembre de 2026  
**Módulos Afectados:** Ofertas Comerciales (`/sales/quotes`), Actividades CRM (`/api/crm-activities/briefing`), Base de Datos (`public.customers`)  
**Etiquetas:** `feat: [SALES]`, `fix: [CRM]`, `style: [UX/UI]`

---

## 1. Resumen de Cambios

1. **Nuevo Gráfico Donut de Ofertas Comerciales (`QuotesStatusDonutCard`):**
   - Sustitución de la antigua tarjeta plana de "Ofertas Ganadas" por un componente visual modular de distribución de cartera: **Ganadas vs Perdidas vs Abiertas**.
   - Gráfico tipo anillo (`PieChart`) compacto (68x68px) con recuento central del total de ofertas.
   - Micro-interacción bidireccional limpia: geometría fija sin saltos de tamaño, resaltado por atenuación de opacidad (activo al 100%, inactivos al 25%) y micro-línea conectora SVG animada hacia su fila correspondiente.
   - Espaciado generoso y equilibrado (`gap-8`) entre el gráfico y la leyenda con importes y porcentajes.

2. **Resolución de Error 500 en `/api/crm-activities/briefing`:**
   - **Causa:** Al consultar el briefing diario, Prisma ejecutaba un `include: { customer: true }`. La tabla física `public.customers` en PostgreSQL no tenía aplicada la columna `territory_code` definida en el esquema de Prisma (existía la migración `add_territory_code_to_customers.sql` pendiente de ejecución).
   - **Corrección:** Se ejecutó la migración SQL en la base de datos creando la columna `territory_code` y su índice correspondiente `idx_customers_territory_code`.
   - **Resiliencia:** Se mejoró la extracción del usuario en el controlador (`req.user?.userId || req.user?.id`) y se agregó una guarda defensiva en el servicio para retornar la estructura vacía sin excepción en caso de usuarios no localizados.

3. **Optimización de Gráficos Ejecutivos y Clases Tailwind en `QuotesPage.tsx`:**
   - Eliminadas las advertencias de dimensiones negativas (`width(-1) and height(-1)`) de Recharts agregando `minWidth={0}`, `minHeight={280}` y clase contenedora `min-h-72`.
   - Normalizadas las clases de utilidad arbitrarias de Tailwind a estándares canónicos (`min-h-72`, `w-9`, `w-17`, `h-17`).

---

## 2. Impacto en Base de Datos

Se ejecutó la migración pendiente en PostgreSQL:
```sql
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS territory_code VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_customers_territory_code ON public.customers (territory_code);
COMMENT ON COLUMN public.customers.territory_code IS 'Código de territorio asignado en Business Central (ej. CAT, MAD, AND, NORTE, EXPORT, etc.)';
```

---

## 3. Pruebas y Validación

- **Backend:** Compilación limpia con `npm run build` (`nest build`).
- **Frontend:** Compilación de producción limpia con `npm run build` (`tsc -b && vite build`).
- **Endpoint:** Verificada la recuperación de actividades y briefings con relaciones `customer` y `contact` resueltas satisfactoriamente.
