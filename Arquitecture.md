\# DOCUMENTO DE ARQUITECTURA Y CONTEXTO GLOBAL (MASTER)  
\*\*Proyecto:\*\* WebApp dTS (Dashboard y BI)  
\*\*Empresa:\*\* dTS Instruments  
\*\*Versión:\*\* 2.0 (Incluye Forecasting IA y Presupuestos Variantes)

\---

\#\# 1\. VISIÓN ESTRATÉGICA Y DE NEGOCIO  
\*\*Objetivo Principal:\*\* Construir una plataforma B2B modular y centralizada (Single Source of Truth) que permita a dTS Instruments visualizar KPIs críticos en tiempo real y realizar simulaciones financieras mediante escenarios manuales e Inteligencia Artificial.

\*\*Estrategia de Datos:\*\*  
\* \*\*Origen de Datos Reales:\*\* Microsoft Dynamics 365 Business Central (vía OData v4).  
\* \*\*Origen de Previsiones:\*\* Archivos Excel/CSV y Motor de Forecasting IA.  
\* \*\*Procesamiento (ETL):\*\* Automatizado mediante flujos de \*\*n8n\*\* para limpiar y unificar la información.  
\* \*\*Almacenamiento:\*\* Base de datos PostgreSQL alojada en \*\*Supabase\*\*.  
\* \*\*Consumo:\*\* Endpoints RESTful estandarizados y protegidos, consumidos por un frontend moderno.

\---

\#\# 2\. ARQUITECTURA TÉCNICA Y STACK CORE

\#\#\# 2.1 Frontend (Capa de Presentación)  
\* \*\*Framework:\*\* React.js empaquetado con Vite (para máximo rendimiento).  
\* \*\*Gestión de Estado:\*\* Zustand (estado de sesión y UI) y React Query (caché y fetching de API).  
\* \*\*Enrutamiento:\*\* React Router DOM v6.  
\* \*\*Exportación de Datos:\*\* SheetJS (\`xlsx\`) para generación de reportes en cliente.
\* \*\*Visor de Documentación:\*\* Integración de visor Markdown (\`react-markdown\`) para el Manual de Usuario.

\#\#\# 2.2 Backend (Capa Lógica y API)  
\* \*\*Framework:\*\* Node.js con NestJS.  
\* \*\*ORM:\*\* Prisma o TypeORM para interactuar con Supabase.  
\* \*\*Seguridad:\*\* Supabase Auth con validación de tokens JWT (Passport.js).  
\* \*\*Documentación API:\*\* Swagger (OpenAPI) autogenerado y accesible en \`/api-docs\`.  
\* \*\*Motor Analítico:\*\* Servicios integrados para cálculo de desviaciones y proyección de series temporales (Forecasting).

\---

\#\# 3\. DISEÑO UX/UI Y SISTEMA VISUAL  
El diseño prioriza la legibilidad (Data Storytelling) y se basará estrictamente en las referencias visuales creadas en \*\*Stitch\*\*.

\#\#\# 3.1 Identidad Corporativa y Componentes  
\* \*\*Color Primario:\*\* Hex \`\#003E51\` (Azul corporativo). Representa la Realidad, menús principales (Sidebar) y tipografía de alto contraste.  
\* \*\*Color Secundario / Acento:\*\* Hex \`\#00B0B9\` (Cian corporativo). Representa la Previsión, botones de acción, y gráficos de tendencias.  
\* \*\*Librería de Layout:\*\* Tailwind CSS.  
\* \*\*Librería de Dashboards:\*\* \*\*Recharts v3.8+\*\* (Exclusivo para KpiCards, BarCharts, LineCharts, DonutCharts y DataGrids).  
\* \*\*Lenguaje Visual de IA:\*\* Las predicciones estadísticas se mostrarán en gráficos usando líneas punteadas o áreas sombreadas translúcidas.

\---

\#\# 4\. MÓDULOS Y FUNCIONALIDADES DEL SISTEMA

\#\#\# 4.1 Módulos de Operación y Visualización (Solo Lectura)  
1\.  \*\*Dashboard Contable:\*\* KPIs en tiempo real (EBITDA, Liquidez, Margen Bruto) con filtros evolutivos.  
2\.  \*\*Ventas y Compras:\*\* Análisis de facturación, ticket medio, y ranking Top 10 Clientes/Proveedores.  
3\.  \*\*Gestión de Maestros:\*\* Fichas interactivas con histórico de transacciones (facturas, cobros).  
4\.  \*\*Fabricación y Stock:\*\* Control de inventario valorado y estado de órdenes de producción.

\#\#\# 4.2 Módulo de Simulación y BI (Escritura Permitida)  
1\.  \*\*Escenarios Manuales:\*\* Creación de múltiples presupuestos (What-If), clonación de datos reales y carga masiva vía Excel.  
2\.  \*\*Forecasting Predictivo (IA):\*\* Motor que analiza un mínimo de 24 meses históricos de Business Central para sugerir proyecciones a 6 meses.  
3\.  \*\*Análisis de Desviaciones (Gap Analysis):\*\* Comparativa dinámica entre datos Reales (BC) vs. Presupuestos (Manual/IA) destacando deltas porcentuales.

\---

\#\# 5\. REGLAS CRÍTICAS DE ARQUITECTURA (HARD CONSTRAINTS)

1\.  \*\*INMUTABILIDAD DEL ERP (REGLA DE ORO):\*\* Las credenciales de la API y las funciones del Backend tienen \*\*PROHIBIDO\*\* ejecutar operaciones \`POST\`, \`PUT\`, \`PATCH\` o \`DELETE\` sobre las tablas sincronizadas desde Business Central (clientes, facturación, stock). \*\*Son de SOLO LECTURA.\*\*  
2\.  \*\*Segregación de Previsiones:\*\* Los datos reales nunca se mezclan físicamente con las previsiones. Las previsiones viven en tablas aisladas (\`forecast\_scenarios\`, \`forecast\_lines\`) y se unen visualmente en el frontend o mediante JOINs de solo lectura en el backend.  
3\.  \*\*Marcado de IA:\*\* Todo dato generado por algoritmos predictivos debe llevar el flag \`is\_ai\_generated: true\` en la base de datos para no confundirse con decisiones humanas.

\---

\#\# 6\. ESQUEMA DE BASE DE DATOS MAESTRO (SQL INIT)  
Las tablas del ERP ya están en Supabase vía n8n. El IDE debe ejecutar este script para inicializar la lógica de la App:

\`\`\`sql  
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\-- 1\. CONTROL DE ACCESO (RBAC)  
CREATE TABLE public.roles (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    name VARCHAR(50) UNIQUE NOT NULL,  
    description TEXT,  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);

CREATE TABLE public.profiles (  
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,  
    email VARCHAR(255) UNIQUE NOT NULL,  
    first\_name VARCHAR(100),  
    last\_name VARCHAR(100),  
    role\_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,  
    is\_active BOOLEAN DEFAULT TRUE,  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);

CREATE TABLE public.modules (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    name VARCHAR(100) UNIQUE NOT NULL,  
    route\_path VARCHAR(255) NOT NULL,  
    is\_active BOOLEAN DEFAULT TRUE  
);

CREATE TABLE public.role\_modules (  
    role\_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,  
    module\_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,  
    can\_view BOOLEAN DEFAULT TRUE,  
    PRIMARY KEY (role\_id, module\_id)  
);

\-- 2\. SIMULACIÓN Y FORECASTING  
CREATE TABLE public.forecast\_scenarios (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    name VARCHAR(100) NOT NULL,   
    description TEXT,  
    is\_ai\_generated BOOLEAN DEFAULT FALSE,  
    created\_by UUID REFERENCES auth.users(id),  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);

CREATE TABLE public.forecast\_lines (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    scenario\_id UUID REFERENCES public.forecast\_scenarios(id) ON DELETE CASCADE,  
    account\_id VARCHAR(50) NOT NULL,   
    period\_date DATE NOT NULL,         
    budget\_amount DECIMAL(18,2) DEFAULT 0,  
    confidence\_level DECIMAL(5,2),   
    updated\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);

\-- Índices de Rendimiento  
CREATE INDEX idx\_profiles\_role ON public.profiles(role\_id);  
CREATE INDEX idx\_forecast\_lookup ON public.forecast\_lines(scenario\_id, period\_date);

\#\# 7\. INFRAESTRUCTURA Y DESPLIEGUE (DEVOPS)  
Entorno VPS: Orquestación mediante plataforma Dokploy.

Contenedores: Se utilizarán archivos Dockerfile multistage y un docker-compose.yml para levantar la API de NestJS y servir el empaquetado estático de React.

Control de Versiones: Git Flow (main, develop, feature/module-name).

\#\# 8\. HOJA DE RUTA DE DESARROLLO (MÓDULOS)  
\#\#\# 8.1. Fase 1: Core y Fundamentos  
\#\#\#\# 8.1.1. Configuración del Repositorio (Git/GitHub) y entorno local.  
\#\#\#\# 8.1.2. Despliegue de DB schema en Supabase (Roles/Users).  
\#\#\#\# 8.1.3. Backend: Setup de NestJS, integración de Supabase Auth, Swagger, Logger, Guards de Roles.  
\#\#\#\# 8.1.4. Frontend: Setup React, Tailwind, Tremor. Creación del Layout (Sidebar responsivo) y Pantalla de Login.

\#\#\# 8.2. Fase 2: Módulo Dashboard Contable (MVP)

\#\#\#\# 8.2.1. Backend: Endpoints GET con filtros de fechas para EBITDA, Liquidez y Margen Bruto.  
\#\#\#\# 8.2.2. Frontend: Pantalla Contable. Uso de Grid de Tremor para KpiCards, y LineChart para evolutivos.

\#\#\# 8.3. Fase 3: Módulos Comerciales y Presupuestos

\#\#\#\# 8.3.1. Módulo Ventas y Compras (Análisis de facturación, top clientes).  
\#\#\#\# 8.3.2. Integración de visualización Excel vs Real (Business Central) en el panel de Presupuestos Anuales.

\#\#\# 8.4. Fase 4: Maestros, Stock y Documentación

\#\#\#\# 8.4.1. Módulo Fichas de Maestros y Stock.  
\#\#\#\# 8.4.2. Implementación de visor Markdown en frontend (react-markdown) leyendo el directorio /docs.  
\#\#\#\# 8.4.3. Pruebas y despliegue final en Dokploy (VPS).

\#\# 9\. INFRAESTRUCTURA, DESPLIEGUE Y QA

\#\#\# 9.1. Dokploy (VPS): Utilizaremos contenedores Docker. docker-compose.yml orquestará la imagen de NestJS (Backend) y un servidor Nginx para servir los estáticos de React (Frontend).  
\#\#\# 9.2. JSDoc: Todas las funciones de cálculo dentro de los Services de NestJS deben estar documentadas con bloque /\*\* ... \*/.  
\#\#\# 9.3. Git Flow: Ramas main (Producción), develop (Staging local), y feature/nombre-modulo.

\#\# 10\. ESTRUCTURA DETALLADA DEL PROYECTO (SCAFFOLDING)  
Esta jerarquía define la organización del código siguiendo principios de Clean Architecture y modularidad NestJS/React.

/proyecto-webapp-dts  
│  
├── /backend                        \# API REST \- NestJS  
│   ├── /src  
│   │   ├── /auth                   \# Guardias JWT y estrategia Supabase  
│   │   ├── /common                 \# Middlewares, filtros de excepción y decoradores  
│   │   ├── /modules  
│   │   │   ├── /accounting         \# Endpoints de KPIs Reales (Business Central)  
│   │   │   ├── /sales              \# Análisis de facturación y rankings  
│   │   │   ├── /scenarios          \# CRUD de presupuestos y gestión de variantes  
│   │   │   ├── /forecast           \# Motor de IA: Lógica de predicción estadística  
│   │   │   └── /users              \# Gestión de perfiles y roles (RBAC)  
│   │   ├── /prisma                 \# Esquema y migraciones (o TypeORM)  
│   │   └── main.ts                 \# Configuración de Swagger y CORS  
│   ├── Dockerfile                  \# Build optimizado para NestJS  
│   └── .env.example                \# Variables: SUPABASE\_URL, JWT\_SECRET, etc.  
│  
├── /frontend                       \# SPA \- React \+ Vite  
│   ├── /src  
│   │   ├── /api                    \# Clientes de Axios y hooks de React Query  
│   │   ├── /components  
│   │   │   ├── /ui                 \# Componentes base (Botones, inputs)  
│   │   │   ├── /shared             \# Sidebar, Navbar y Layout según diseño Stitch  
│   │   │   └── /charts             \# Wrappers de Tremor v3 para consistencia visual  
│   │   ├── /hooks                  \# Lógica de filtros globales y auth  
│   │   ├── /pages  
│   │   │   ├── /dashboard          \# Vista contable general  
│   │   │   ├── /simulations        \# Editor de escenarios y comparativas IA  
│   │   │   └── /inventory          \# Módulo de stock y fabricación  
│   │   ├── /store                  \# Estado global con Zustand (UI/Filtros)  
│   │   ├── /utils                  \# Utilidades compartidas (exportToXlsx, etc.)
│   │   └── App.tsx                 \# Definición de rutas protegidas  
│   ├── tailwind.config.js          \# Configuración de colores corporativos dTS  
│   └── Dockerfile                  \# Build multistage para Nginx  
│  
├── /docs                           \# Manuales en Markdown  
│   ├── manual-usuario.md           \# Guía para el usuario final  
│   └── kpi-definitions.md          \# Lógica de negocio tras cada métrica  
│  
├── docker-compose.yml              \# Orquestación para Dokploy VPS  
└── .github/workflows               \# CI/CD para despliegue automático

\#\# 11\. Notas Técnicas para el IDE:  
\#\#\# 11.1. Inyección de Dependencias: Cada carpeta en /modules (backend) debe exportar un Module de NestJS para mantener el desacoplamiento.

\#\#\# 11.2. Layout responsivo: El sidebar en /shared debe colapsarse automáticamente en resoluciones menores a 1024px.

\#\#\# 11.3. Hydration: React Query debe manejar el estado de carga (loading states) de los gráficos de Tremor para evitar saltos visuales en el dashboard.