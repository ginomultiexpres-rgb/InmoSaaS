export const SUPABASE_SQL_SCHEMA = `-- ============================================================================
-- ESQUEMA SQL MULTI-TENANT PARA SAAS INMOBILIARIO (AREQUIPA, PERÚ - PEN)
-- Compatible con Supabase (PostgreSQL 15+) y Row Level Security (RLS)
-- ============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: TENANTS (Agencias o Agentes Inmobiliarios Independientes)
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- Ej: 'valeria-mendoza' -> miapp.com/p/valeria-mendoza
    agent_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL, -- Formato Perú: +51 9XX XXX XXX
    avatar_url TEXT,
    bio TEXT,
    location VARCHAR(100) DEFAULT 'Arequipa, Perú',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. TABLA: USERS (Vínculo entre Supabase Auth y Tenant)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'assistant')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. TABLA: PROPERTIES (Portafolio Inmobiliario en Soles PEN)
CREATE TABLE public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    property_type VARCHAR(50) NOT NULL CHECK (property_type IN ('departamento', 'casa', 'terreno', 'oficina', 'local')),
    status VARCHAR(50) DEFAULT 'activa' CHECK (status IN ('activa', 'reservada', 'vendida')),
    price_pen NUMERIC(12, 2) NOT NULL, -- Moneda en Soles (PEN S/.)
    currency VARCHAR(10) DEFAULT 'PEN' NOT NULL,
    bedrooms INTEGER DEFAULT 0,
    bathrooms INTEGER DEFAULT 0,
    area_m2 NUMERIC(8, 2) NOT NULL,
    district VARCHAR(100) NOT NULL, -- 'Cayma', 'Yanahuara', 'Cerro Colorado', etc.
    address TEXT NOT NULL,
    image_url TEXT NOT NULL,
    gallery_urls TEXT[] DEFAULT '{}',
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_tenant_property_slug UNIQUE (tenant_id, slug)
);

-- 5. TABLA: CRM_LEADS (Gestión de prospectos / Clientes potenciales)
CREATE TABLE public.crm_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'nuevo' CHECK (status IN ('nuevo', 'contactado', 'visita', 'cerrado')),
    budget_pen NUMERIC(12, 2),
    interested_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    notes TEXT,
    source VARCHAR(100) DEFAULT 'Web Pública',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. TABLA: APPOINTMENTS (Agenda de visitas guiadas a propiedades)
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    scheduled_at DATE NOT NULL,
    time_slot VARCHAR(20) NOT NULL, -- Ej: '16:00', '18:30'
    status VARCHAR(50) DEFAULT 'programada' CHECK (status IN ('programada', 'completada', 'cancelada')),
    visit_type VARCHAR(50) DEFAULT 'presencial' CHECK (visit_type IN ('presencial', 'virtual')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- ÍNDICES PARA ALTO RENDIMIENTO MULTI-TENANT
-- ============================================================================
CREATE INDEX idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX idx_properties_tenant_id ON public.properties(tenant_id);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_district ON public.properties(district);
CREATE INDEX idx_crm_leads_tenant_id ON public.crm_leads(tenant_id);
CREATE INDEX idx_crm_leads_status ON public.crm_leads(status);
CREATE INDEX idx_appointments_tenant_id ON public.appointments(tenant_id);
CREATE INDEX idx_appointments_scheduled_at ON public.appointments(scheduled_at);
CREATE INDEX idx_tenants_slug ON public.tenants(slug);

-- ============================================================================
-- FUNCIÓN HELPER: OBTENER EL TENANT_ID DEL USUARIO AUTENTICADO
-- ============================================================================
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS) - AISLAMIENTO ESTRICTO POR TENANT
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS: TENANTS
-- 1. Público: Cualquiera puede ver la información pública del agente para /p/[slug]
CREATE POLICY "Public can view tenant profile by slug"
    ON public.tenants FOR SELECT
    TO anon, authenticated
    USING (true);

-- 2. Agente autenticado: Solo puede modificar su propio tenant
CREATE POLICY "Tenant admin can update own tenant"
    ON public.tenants FOR UPDATE
    TO authenticated
    USING (id = public.current_tenant_id())
    WITH CHECK (id = public.current_tenant_id());

-- ----------------------------------------------------------------------------
-- RLS: USERS
CREATE POLICY "Users can view members of same tenant"
    ON public.users FOR SELECT
    TO authenticated
    USING (tenant_id = public.current_tenant_id());

-- ----------------------------------------------------------------------------
-- RLS: PROPERTIES
-- 1. Público: Los visitantes anónimos solo pueden ver propiedades activas
CREATE POLICY "Public can view active properties for agent portfolio"
    ON public.properties FOR SELECT
    TO anon, authenticated
    USING (status = 'activa');

-- 2. Backoffice: El agente tiene control total (CRUD) sobre las propiedades de su tenant
CREATE POLICY "Tenant users have full access to own properties"
    ON public.properties FOR ALL
    TO authenticated
    USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());

-- ----------------------------------------------------------------------------
-- RLS: CRM_LEADS
-- 1. Público: Un visitante de la landing pública puede registrarse como lead
CREATE POLICY "Public can insert lead into agent tenant"
    ON public.crm_leads FOR INSERT
    TO anon, authenticated
    WITH CHECK (tenant_id IS NOT NULL);

-- 2. Backoffice: Solo los miembros del tenant pueden ver y editar sus leads
CREATE POLICY "Tenant users have full access to own leads"
    ON public.crm_leads FOR ALL
    TO authenticated
    USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());

-- ----------------------------------------------------------------------------
-- RLS: APPOINTMENTS
CREATE POLICY "Tenant users have full access to own appointments"
    ON public.appointments FOR ALL
    TO authenticated
    USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());

-- ============================================================================
-- TRIGGER AUTOMÁTICO: REGISTRO DE NUEVO USUARIO DESDE SUPABASE AUTH
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_tenant_id UUID;
    agent_slug TEXT;
BEGIN
    -- Generar slug a partir del email o nombre
    agent_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]', '-', 'g'));

    -- Crear automáticamente el Tenant para el nuevo agente
    INSERT INTO public.tenants (name, slug, agent_name, email, phone, location)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'agency_name', 'Inmobiliaria ' || split_part(NEW.email, '@', 1)),
        agent_slug || '-' || substr(md5(random()::text), 1, 4),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'phone', '+51 900 000 000'),
        'Arequipa, Perú'
    )
    RETURNING id INTO new_tenant_id;

    -- Asignar el usuario al nuevo Tenant
    INSERT INTO public.users (id, tenant_id, full_name, role)
    VALUES (
        NEW.id,
        new_tenant_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'admin'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparador después de registro en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`;

export const NEXTJS_FOLDER_STRUCTURE = `mi-inmo-saas/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx           # Inicio de sesión de agentes
│   │   └── registro/
│   │       └── page.tsx           # Onboarding de nuevo agente inmobiliario
│   ├── (dashboard)/
│   │   ├── layout.tsx             # Sidebar persistente, selector de tenant y header
│   │   ├── page.tsx               # Dashboard principal (Métricas, citas de hoy, leads)
│   │   ├── propiedades/
│   │   │   ├── page.tsx           # CRUD: Listado de propiedades con filtros y buscador
│   │   │   ├── nueva/
│   │   │   │   └── page.tsx       # Formulario con upload de imágenes a Supabase Storage
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Editor de propiedad
│   │   ├── crm/
│   │   │   └── page.tsx           # Tablero Kanban de leads (Nuevo, Contactado, Visita, Cerrado)
│   │   └── agenda/
│   │       └── page.tsx           # Calendario de citas y visitas vinculadas a leads
│   ├── p/                         # RUTAS PÚBLICAS POR AGENTE (Multi-Tenant Landing)
│   │   └── [slug]/
│   │       ├── layout.tsx         # Layout limpio sin dashboard sidebar
│   │       ├── page.tsx           # Catálogo público del agente (miapp.com/p/valeria-mendoza)
│   │       └── [propiedadSlug]/
│   │           └── page.tsx       # Ficha técnica del inmueble con contacto directo WhatsApp
│   ├── api/
│   │   └── webhook/
│   │       └── route.ts           # Webhooks opcionales (WhatsApp Cloud API, Sunarp, etc.)
│   ├── globals.css                # Tailwind CSS v4 y variables shadcn
│   └── layout.tsx                 # Root layout con fuentes (Plus Jakarta Sans)
├── components/
│   ├── ui/                        # Componentes shadcn/ui (Button, Card, Dialog, Badge, Input, etc.)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   └── tabs.tsx
│   ├── dashboard/
│   │   ├── metrics-cards.tsx      # Tarjetas KPI (Propiedades, Leads, Citas, Cartera PEN S/.)
│   │   ├── upcoming-appointments.tsx # Lista de citas de hoy con acción rápida WhatsApp
│   │   └── district-distribution.tsx # Gráfico de inmuebles en Cayma, Yanahuara, etc.
│   ├── crm/
│   │   ├── kanban-board.tsx       # Tablero drag-and-drop o columnas interactivas
│   │   └── lead-dialog.tsx        # Modal de detalle y notas del lead
│   └── public/
│       ├── agent-hero.tsx         # Banner público con foto de agente y fondo de Arequipa
│       ├── property-filter.tsx    # Filtro por tipo, distrito y rango de precio en S/.
│       └── contact-agent-modal.tsx# Formulario de contacto público que inserta en crm_leads
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Cliente Supabase para Browser (createBrowserClient)
│   │   ├── server.ts              # Cliente Supabase para Server Components (createServerClient)
│   │   └── middleware.ts          # Middleware para sesión y refresh de cookies
│   ├── utils.ts                   # cn() helper de shadcn/ui y formateadores de moneda PEN
│   └── types.ts                   # Definición de tipos TypeScript generados de Supabase
├── middleware.ts                  # Middleware global para autenticación y aislamiento
├── next.config.mjs
├── package.json
└── tailwind.config.ts`;

export const CODE_DASHBOARD_PAGE = `// app/(dashboard)/page.tsx
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Users, 
  CalendarClock, 
  TrendingUp, 
  MapPin, 
  Clock, 
  ArrowUpRight, 
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Dashboard Inmobiliario | InmoTenant Arequipa',
};

// Formateador de moneda oficial para Perú (PEN Soles)
const formatPEN = (amount: number) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Obtener datos aislados del tenant actual gracias a las políticas RLS
  const [
    { data: tenant },
    { count: activePropertiesCount, data: properties },
    { count: newLeadsCount },
    { data: todayAppointments }
  ] = await Promise.all([
    supabase.from('tenants').select('*').single(),
    supabase.from('properties').select('*', { count: 'exact' }).eq('status', 'activa'),
    supabase.from('crm_leads').select('*', { count: 'exact' }).eq('status', 'nuevo'),
    supabase
      .from('appointments')
      .select(\`
        id,
        scheduled_at,
        time_slot,
        visit_type,
        notes,
        crm_leads (full_name, phone),
        properties (title, district, address)
      \`)
      .eq('scheduled_at', new Date().toISOString().split('T')[0])
      .order('time_slot', { ascending: true })
  ]);

  // Cálculo de valorización total de cartera en Soles
  const portfolioTotalPEN = properties?.reduce((acc, p) => acc + Number(p.price_pen || 0), 0) || 0;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Encabezado con link público del agente */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Panel de Control
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Resumen operativo para {tenant?.agent_name || 'Agente'} · Arequipa, Perú
          </p>
        </div>
        
        {/* Enlace al sitio público del agente */}
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild size="sm">
            <Link 
              href={\`/p/\${tenant?.slug}\`} 
              target="_blank"
              className="inline-flex items-center gap-2"
            >
              <span>Ver mi Web Pública</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/propiedades/nueva">
              + Nueva Propiedad
            </Link>
          </Button>
        </div>
      </div>

      {/* Grid de Métricas Principales (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Propiedades Activas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Propiedades Activas
            </CardTitle>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-slate-900">
              {activePropertiesCount || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Publicadas en tu catálogo de Arequipa
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Leads Nuevos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Leads Nuevos
            </CardTitle>
            <Users className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-slate-900">
              {newLeadsCount || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pendientes de primer contacto
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Citas de Hoy */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Citas para Hoy
            </CardTitle>
            <CalendarClock className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-slate-900">
              {todayAppointments?.length || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Visitas presenciales programadas
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Valor de Cartera en PEN */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Cartera en Gestión
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-slate-900">
              {formatPEN(portfolioTotalPEN)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Valor total de inventario activo (S/.)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sección Inferior: Citas de Hoy y Acciones Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Próximas Citas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Agenda de Visitas para Hoy
                </CardTitle>
                <CardDescription>
                  Coordinaciones en Cayma, Yanahuara y Cerro Colorado
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/agenda" className="text-xs text-blue-600 flex items-center gap-1">
                  Ver calendario completo <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(!todayAppointments || todayAppointments.length === 0) ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No tienes citas programadas para el día de hoy.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {todayAppointments.map((app: any) => (
                  <div key={app.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">
                          {app.crm_leads?.full_name || 'Prospecto'}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {app.time_slot} hrs
                        </span>
                        <span className="text-xs text-slate-500">
                          ({app.visit_type})
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{app.properties?.title} ({app.properties?.district})</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {app.crm_leads?.phone && (
                        <a
                          href={\`https://wa.me/\${app.crm_leads.phone.replace(/[^0-9]/g, '')}?text=Hola \${encodeURIComponent(app.crm_leads.full_name)}, le escribo para confirmar nuestra visita de hoy.\`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acceso Rápido al CRM Kanban */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Pipeline de Ventas (CRM)
            </CardTitle>
            <CardDescription>
              Progreso de leads en el embudo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Leads sin contactar</span>
                <span className="font-semibold tabular-nums">{newLeadsCount || 0}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '45%' }} />
              </div>
            </div>

            <p className="text-xs text-slate-500 pt-2 border-t">
              Mueve prospectos de "Nuevo" a "Visita" en el tablero interactivo para agendar recorridos automáticamente.
            </p>

            <Button asChild variant="outline" className="w-full text-xs">
              <Link href="/crm">Abrir Tablero Kanban CRM</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
`;

export const CODE_PUBLIC_AGENT_PAGE = `// app/p/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Bed, Bath, Maximize, Phone, Mail, MessageCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicPropertyFilters } from './property-filters'; // Componente cliente para filtrado interactivo

interface Props {
  params: {
    slug: string;
  };
  searchParams: {
    tipo?: string;
    distrito?: string;
    precio_max?: string;
  };
}

// Generación de metadatos dinámicos SEO por agente inmobiliario
export async function generateMetadata({ params }: Props) {
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, agent_name, bio, location')
    .eq('slug', params.slug)
    .single();

  if (!tenant) {
    return { title: 'Agente Inmobiliario No Encontrado' };
  }

  return {
    title: \`\${tenant.agent_name} - Portafolio Inmobiliario en \${tenant.location}\`,
    description: tenant.bio,
    openGraph: {
      title: \`\${tenant.name} | Catálogo Oficial de Propiedades\`,
      description: \`Encuentra casas, departamentos y terrenos en Arequipa con \${tenant.agent_name}.\`,
    },
  };
}

export default async function PublicAgentPortfolioPage({ params, searchParams }: Props) {
  const supabase = await createClient();

  // 1. Buscar la agencia/agente por su slug único
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (!tenant) {
    notFound();
  }

  // 2. Cargar las propiedades activas de este tenant específico
  let query = supabase
    .from('properties')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('status', 'activa')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (searchParams.tipo) {
    query = query.eq('property_type', searchParams.tipo);
  }
  if (searchParams.distrito) {
    query = query.eq('district', searchParams.distrito);
  }
  if (searchParams.precio_max) {
    query = query.lte('price_pen', Number(searchParams.precio_max));
  }

  const { data: properties } = await query;

  const formatPEN = (val: number) =>
    new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* 1. Header / Navbar del Agente */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg text-slate-900 tracking-tight">
              {tenant.name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={\`https://wa.me/\${tenant.phone.replace(/[^0-9]/g, '')}?text=Hola \${encodeURIComponent(tenant.agent_name)}, vi su portafolio inmobiliario y deseo información.\`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Contactar Agente</span>
            </a>
          </div>
        </div>
      </header>

      {/* 2. Hero Section con información del Agente */}
      <section className="bg-white border-b border-slate-200 py-12 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
          <div className="md:col-span-1 flex justify-center">
            <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-slate-100 shadow-md">
              <Image
                src={tenant.avatar_url || '/placeholder-agent.jpg'}
                alt={tenant.agent_name}
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          <div className="md:col-span-3 space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Agente Inmobiliario Verificado en {tenant.location}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {tenant.agent_name}
            </h1>
            <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
              {tenant.bio}
            </p>
            <div className="pt-2 flex flex-wrap justify-center md:justify-start gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {tenant.location}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {tenant.phone}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {tenant.email}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Catálogo de Propiedades con Filtro Interactivo */}
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Propiedades Disponibles ({properties?.length || 0})
            </h2>
            <p className="text-xs text-slate-500">
              Inmuebles seleccionados en Cayma, Yanahuara, Cerro Colorado y distritos top
            </p>
          </div>

          {/* Filtros cliente */}
          <PublicPropertyFilters currentSlug={params.slug} />
        </div>

        {/* Grid de Propiedades */}
        {(!properties || properties.length === 0) ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            No se encontraron propiedades activas con los filtros seleccionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((prop) => (
              <div 
                key={prop.id} 
                className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Imagen del Inmueble */}
                <div className="relative aspect-16/9 bg-slate-100 overflow-hidden">
                  <Image
                    src={prop.image_url}
                    alt={prop.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-xs font-semibold px-2 py-0.5 rounded shadow-xs capitalize">
                    {prop.property_type}
                  </div>
                  {prop.featured && (
                    <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-semibold px-2 py-0.5 rounded shadow-xs">
                      Destacada
                    </div>
                  )}
                </div>

                {/* Contenido */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="text-xl font-bold text-slate-900 tabular-nums">
                      {formatPEN(prop.price_pen)}
                    </div>
                    <h3 className="font-semibold text-slate-900 line-clamp-1 hover:text-blue-600 transition">
                      {prop.title}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{prop.address}, {prop.district}</span>
                    </p>
                  </div>

                  {/* Especificaciones */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    {prop.bedrooms > 0 && (
                      <span className="flex items-center gap-1">
                        <Bed className="w-3.5 h-3.5 text-slate-400" />
                        {prop.bedrooms} dits.
                      </span>
                    )}
                    {prop.bathrooms > 0 && (
                      <span className="flex items-center gap-1">
                        <Bath className="w-3.5 h-3.5 text-slate-400" />
                        {prop.bathrooms} bñs.
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Maximize className="w-3.5 h-3.5 text-slate-400" />
                      {prop.area_m2} m²
                    </span>
                  </div>

                  {/* Botón de Contacto por WhatsApp directo */}
                  <a
                    href={\`https://wa.me/\${tenant.phone.replace(/[^0-9]/g, '')}?text=Hola \${encodeURIComponent(tenant.agent_name)}, me interesa la propiedad: \${encodeURIComponent(prop.title)} (\${formatPEN(prop.price_pen)}) en \${prop.district}.\`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full text-center py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition"
                  >
                    Agendar Visita por WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer Público */}
      <footer className="mt-16 bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} {tenant.name} · Operando en Arequipa, Perú.</p>
        <p className="mt-1">Sitio web potenciado por InmoTenant SaaS</p>
      </footer>
    </div>
  );
}
`;
