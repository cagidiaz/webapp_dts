-- DTS Instruments WebApp — Base de Datos Inicial (Supabase / Postgres)
-- Basado en el Documento de Arquitectura v2.0

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CONTROL DE ACCESO (RBAC)
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    route_path VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.role_modules (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (role_id, module_id)
);

-- 2. SIMULACIÓN Y FORECASTING
CREATE TABLE IF NOT EXISTS public.forecast_scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL, 
    description TEXT,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.forecast_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID REFERENCES public.forecast_scenarios(id) ON DELETE CASCADE,
    account_id VARCHAR(50) NOT NULL, 
    period_date DATE NOT NULL,         
    budget_amount DECIMAL(18,2) DEFAULT 0,
    confidence_level DECIMAL(5,2),   
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_forecast_lookup ON public.forecast_lines(scenario_id, period_date);

-- Datos Iniciales (Seed)
INSERT INTO public.roles (name, description) VALUES 
('ADMIN', 'Acceso total a todos los módulos y gestión de usuarios'),
('DIRECCION', 'Acceso a vistas consolidadas, contabilidad y presupuestos'),
('VENTAS', 'Acceso exclusivo a módulos comerciales y facturación'),
('OPERACIONES', 'Acceso a fabricación, stock y maestros')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.modules (name, route_path) VALUES 
('Dashboard Contable', '/dashboard'),
('Ventas y Compras', '/sales'),
('Escenarios y Presupuestos', '/simulations'),
('Fabricación y Stock', '/inventory'),
('Gestión de Usuarios', '/users')
ON CONFLICT (name) DO NOTHING;
