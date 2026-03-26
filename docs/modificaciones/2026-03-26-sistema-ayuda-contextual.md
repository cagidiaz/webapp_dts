# Plan de Implementación: Sistema de Ayuda Contextual (Finalizado)

## Objetivo
Implementar un sistema de ayuda interactivo centralizado en dTS Instruments para facilitar la transparencia de datos, fórmulas y objetivos de negocio directamente en la interfaz.

## Evolución del Diseño: Del Popover al Dialog Modal
Inicialmente se planteó un **Popover**, pero tras el análisis y feedback del usuario, se evolucionó a un **Dialog (Modal centrado)**:
1.  **Visibilidad**: El modal centrado asegura que la ayuda sea el foco principal y no se vea cortada en pantallas pequeñas.
2.  **Interactividad**: El uso de `Transition` de `@headlessui/react` proporciona una experiencia fluida con desenfoque de fondo.
3.  **Contenido**: Permite mostrar bloques extensos de texto, fórmulas matemáticas resaltadas y descripciones de origen de datos sin comprometer el layout de la página.

## Componente Core: `InfoPopover.tsx`
Ubicación: `frontend/src/components/ui/InfoPopover.tsx`

**Características técnicas:**
- Motor: `@headlessui/react` (Dialog, Transition).
- Estilos: Tailwind CSS (v3 y v4 compatible).
- Iconografía: `lucide-react` (Info, X).
- Características: Fondo desenfocado, centrado absoluto, cierre mediante botón X, tecla ESC o clic exterior.

## Cobertura de Integración de Ayuda
El sistema se ha desplegado en el 100% de las vistas críticas:

1.  **Dashboard**: Ayuda general en el título y detallada en paneles de Ventas, EBITDA y Consecución.
2.  **Balances de Situación**: Ayuda sobre la estructura vertical (Activo vs Pasivo) y origen de datos contables.
3.  **Cuadro de Mando (Ratios)**:
    - Tabla comparativa multianual.
    - Gráficos de tendencias (Rentabilidad, Eficiencia, Liquidez y Solvencia) con desglose de fórmulas cada uno.
4.  **Simulaciones (Presupuestos 2026)**:
    - Ayuda sobre el motor de simulación.
    - Explicación del ratio de compras vinculado (67.4%).
5.  **Análisis de 4 Puntos Clave**: Ayuda ejecutiva para Liquidez, Capitalización, Endeudamiento y Garantía.
6.  **Gestión de Usuarios**: Ayuda sobre perfiles, roles y control de acceso.

## Verificación Final
- [x] Centrado perfecto en resoluciones móviles y escritorio.
- [x] Resalte de fórmulas en bloques monoespaciados.
- [x] Consistencia de diseño Dark/Light mode.
- [x] Gestión de estado reactivo (cierre/apertura).
