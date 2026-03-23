\# 📜 MANUAL DE REGLAS Y BUENAS PRÁCTICAS DE DESARROLLO (RULES.md) \- v1.1  
\#\# Proyecto: WebApp dTS Instruments  
\*\*Objetivo:\*\* Garantizar un código limpio, escalable, seguro y alineado con la identidad corporativa.

\---

\#\# 1\. PRINCIPIOS DE ARQUITECTURA

\#\#\# 1.1 Inmutabilidad de Datos de Negocio (Crítico)  
\* \*\*Regla de Oro:\*\* Los datos que provienen de Dynamics Business Central (vía n8n) son  \*\*SOLO LECTURA\*\*.   
\* \*\*Restricción:\*\* Solo lectura (\`SELECT\`) para tablas operativas reales. No se permiten mezclas físicas de datos reales y previsiones en las mismas tablas de la base de datos.  
\* \*\*Excepción:\*\* Solo se permiten escrituras en las tablas de \`auth\`, \`profiles\` y \`roles\` gestionadas por Supabase.

\#\#\# 1.2 Modularidad Independiente  
\* Cada funcionalidad (Contabilidad, Ventas, Stoc, finanzas, etc.) debe ser un módulo aislado.  
\* \*\*Estructura:\*\* Si se elimina una carpeta de módulo, el resto de la aplicación debe seguir funcionando sin errores de dependencia circular.

\#\#\# 1.3 Segregación de Previsiones (Escenarios What-If)  
\* \*\*Tablas Espejo:\*\* Los presupuestos y previsiones deben residir en esquemas o tablas separadas (\`forecast\_scenarios\`, \`forecast\_lines\`).  
\* \*\*Unificación en Capa de Aplicación:\*\* La comparativa "Real vs. Previsión" se realizará mediante \`JOINs\` en el Backend o agregaciones en el Frontend, nunca alterando la fuente de origen.

\---

\#\# 2\. ESTÁNDARES TÉCNICOS: BACKEND (NESTJS)

\#\#\# 2.1 Tipado y Estructura  
\* \*\*TypeScript Estricto:\*\* Prohibido el uso de \`any\`. Definir \`Interfaces\` o \`DTOs\` para cada entrada y salida de datos.  
\* \*\*Arquitectura:\*\* Seguir el patrón de NestJS: \`Controller\` (Rutas) \-\> \`Service\` (Lógica) \-\> \`Module\` (Inyección de dependencias).

\#\#\# 2.2 Documentación de API  
\* \*\*Swagger (OpenAPI):\*\* Cada endpoint debe estar decorado con \`@ApiOperation\`, \`@ApiResponse\` y \`@ApiTags\`. Accesible en \`/api-docs\`.  
\* \*\*JSDoc:\*\* Documentar funciones con lógica de negocio compleja (ej. cálculos financieros) detallando \`@param\`, \`@returns\` y la lógica aplicada.

\#\#\# 2.3 Seguridad  
\* \*\*Validación:\*\* Uso obligatorio de \`ValidationPipe\` con \`class-validator\` para limpiar y validar datos de entrada.  
\* \*\*Autenticación:\*\* Implementar \`Passport\` con \`JwtStrategy\` conectado a los tokens de Supabase Auth.

\#\#\# 2.4 Módulo de Inteligencia Artificial (Forecasting)  
\* \*\*Lógica de IA:\*\* Los servicios de predicción deben ser puramente funcionales. Reciben una serie temporal (histórico) y devuelven un array de proyecciones.  
\* \*\*Persistencia de IA:\*\* Los resultados de las predicciones de IA deben marcarse con un flag \`is\_ai\_generated: true\` para que el usuario sepa que es una sugerencia estadística.

\---

\#\# 3\. ESTÁNDARES TÉCNICOS: FRONTEND (REACT)

\#\#\# 3.1 Interfaz de Usuario (UI/UX)  
\* \*\*Librerías:\*\* Uso exclusivo de \*\*Tailwind CSS\*\* para estilos y \*\*Tremor v3\*\* para componentes de dashboard (KpiCards, Charts, Tables).  
\* \*\*Diseño Visual:\*\* \* \*\*Primario:\*\* \`\#003E51\` (Sidebar, Títulos, Fondos oscuros).  
    \* \*\*Secundario:\*\* \`\#00B0B9\` (Botones, Gráficos destacados, Hover).  
    \* \*\*Layout:\*\* Debe ser 100% responsivo (Mobile-First).

\#\#\# 3.2 Visualización de Comparativas (UI/UX)  
\* \*\*Consistencia Visual:\*\* \* \*\*Realidad:\*\* Usar siempre el color Primario \`\#003E51\`.  
    \* \*\*Previsión/Presupuesto:\*\* Usar siempre el color Secundario \`\#00B0B9\`.  
    \* \*\*IA:\*\* Usar una variante punteada o sombreada del color secundario para indicar "Predicción".  
\* \*\*Gráficos:\*\* Utilizar \`AreaChart\` de Tremor para mostrar rangos de confianza de IA y \`BarChart\` agrupado para comparar Real vs. Presupuesto.

\#\#\# 3.3 Gestión de Estado y Datos  
\* \*\*Zustand:\*\* Para estados globales ligeros (filtros de fecha, sesión, estado del sidebar).  
\* \*\*React Query:\*\* Para el consumo de la API. Cachear datos para evitar llamadas innecesarias al backend.

\#\#\# 3.2 Interactividad  
\* \*\*Edición en Caliente:\*\* Los componentes de entrada de datos para presupuestos deben tener validación inmediata para evitar valores negativos o incoherentes.

\---

\#\# 4\. BASE DE DATOS Y PERSISTENCIA (SUPABASE)

\#\#\# 4.1 Convenciones SQL  
\* \*\*Nomenclatura:\*\* Tablas y columnas en \`snake\_case\`. Nombres de tablas en plural (ej. \`user\_profiles\`).  
\* \*\*RLS (Row Level Security):\*\* Todas las tablas nuevas deben tener políticas de seguridad activas basadas en el \`role\_id\`.

\#\#\# 4.2 Gestión de Versiones de Escenarios  
\* Cada vez que un usuario cree una variante de presupuesto, se debe registrar el \`user\_id\` y el \`timestamp\`.  
\* Implementar una función de "Cerrar Escenario" (Read-Only) para evitar modificaciones accidentales una vez aprobado un presupuesto anual.

\---

\#\# 5\. REGLAS ESPECÍFICAS PARA EL IDE (ANTIGRAVITY)

\#\#\# 5.1 Dockerización  
\* \*\*Multistage Builds:\*\* Los \`Dockerfile\` deben separar la etapa de construcción (build) de la de ejecución para minimizar el tamaño de la imagen.  
\* \*\*Variables de Entorno:\*\* Nunca hardcodear credenciales. Usar \`.env\` y proporcionar un \`.env.example\`.

\#\#\# 5.2 Control de Versiones (Git)  
\* \*\*Commits Semánticos:\*\* \* \`feat:\` para nuevas funcionalidades.  
    \* \`fix:\` para corrección de errores.  
    \* \`docs:\` para cambios en documentación.  
    \* \`style:\` para cambios visuales que no afectan la lógica.

\#\#\# 5.3 Implementación del Simulador  
\* \*\*Paso 1:\*\* Crea primero la estructura de tablas para escenarios manuales.  
\* \*\*Paso 2:\*\* Implementa la lógica de "Clonado de Escenario" (copiar líneas de un escenario a otro).  
\* \*\*Paso 3:\*\* Integra la librería de cálculos estadísticos para el forecasting (IA) basándote en al menos 24 meses de datos históricos de ventas/gastos.

\---

\#\# 6\. CHECKLIST DE CALIDAD (PRE-ENTREGA)  
\- \[ \] ¿El código sigue el esquema de colores corporativos?  
\- \[ \] ¿Están definidos todos los tipos de TypeScript?  
\- \[ \] ¿El endpoint aparece correctamente en Swagger?  
\- \[ \] ¿La interfaz se ve bien en una pantalla de móvil?  
\- \[ \] ¿Se han evitado las mutaciones de datos en tablas de negocio?  
\- \[ \] ¿Los datos de IA están claramente diferenciados de los manuales?  
\- \[ \] ¿El sistema permite comparar el "Real" contra cualquier escenario guardado?  
\- \[ \] ¿Se han incluido los colores corporativos correctamente en las gráficas comparativas?  
\- \[ \] ¿El motor de carga de Excel valida que las cuentas contables existan en el sistema?  
