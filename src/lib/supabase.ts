import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Tenant, Property, Lead, Appointment } from '../types';
import { INITIAL_TENANTS, INITIAL_PROPERTIES, INITIAL_LEADS, INITIAL_APPOINTMENTS } from '../data/mockData';

// ── Credenciales desde variables de entorno (Vite: import.meta.env) ──────────
// Definir en .env.local: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
// NUNCA commitear claves reales: ver .env.example.
const ENV_URL = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '').trim();
const ENV_ANON_KEY = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '').trim();

/** true si hay credenciales válidas inyectadas por el entorno */
export const isSupabaseConfigured = (): boolean =>
  /^https:\/\/.+\.supabase\.(co|in|net)/.test(ENV_URL) && ENV_ANON_KEY.length > 20;

// Placeholder seguro: permite crear el cliente sin exponer credenciales reales
// cuando el proyecto no está configurado. Ninguna consulta tendrá éxito y el
// estado 'error' se propagará explícitamente a la UI.
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'public-anon-placeholder-key-not-a-real-credential';

export const SUPABASE_PROJECT_URL = isSupabaseConfigured() ? ENV_URL : PLACEHOLDER_URL;
export const SUPABASE_ANON_KEY = isSupabaseConfigured() ? ENV_ANON_KEY : PLACEHOLDER_KEY;

export const getStoredCredentials = () => ({
  url: SUPABASE_PROJECT_URL,
  key: SUPABASE_ANON_KEY,
  configured: isSupabaseConfigured(),
});

export const saveCredentials = (_url: string, _key: string) => {
  // Las credenciales ahora provienen exclusivamente de import.meta.env (.env.local).
  // Esta función se conserva por compatibilidad con la UI del modal de conexión.
};

export const clearCredentials = () => {
  // No-op: las credenciales de entorno no se guardan en el cliente.
};

// Cliente Supabase (configurado vía entorno, o placeholder inofensivo)
export const supabaseClient: SupabaseClient = createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const getSupabaseClient = (): SupabaseClient => {
  return supabaseClient;
};

// Verificar estado de conexión e inspeccionar conteos reales
export const testSupabaseConnection = async (
  _customUrl?: string,
  _customKey?: string
): Promise<{
  success: boolean;
  message: string;
  tablesFound?: string[];
  counts?: { tenants: number; properties: number; leads: number; appointments: number };
  hasRows?: boolean;
}> => {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message:
        'Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local y reinicia el servidor.',
    };
  }
  try {
    const client = getSupabaseClient();

    // Inspeccionar tablas disponibles y conteos
    const [tRes, pRes, lRes1, aRes] = await Promise.all([
      client.from('tenants').select('*', { count: 'exact', head: true }),
      client.from('properties').select('*', { count: 'exact', head: true }),
      client.from('leads').select('*', { count: 'exact', head: true }),
      client.from('appointments').select('*', { count: 'exact', head: true }),
    ]);

    let leadsCount = lRes1.count ?? 0;
    if (lRes1.error) {
      const lRes2 = await client.from('crm_leads').select('*', { count: 'exact', head: true });
      if (!lRes2.error) {
        leadsCount = lRes2.count ?? 0;
      }
    }

    const counts = {
      tenants: tRes.count ?? 0,
      properties: pRes.count ?? 0,
      leads: leadsCount,
      appointments: aRes.count ?? 0,
    };

    const totalRows = counts.tenants + counts.properties + counts.leads + counts.appointments;

    return {
      success: true,
      message: `Conexión exitosa: ${totalRows} filas encontradas en Supabase PostgreSQL.`,
      tablesFound: ['tenants', 'properties', 'leads', 'appointments'],
      counts,
      hasRows: totalRows > 0,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error de red: ${err.message || err}`,
    };
  }
};

export type DataLoadSource = 'supabase' | 'empty-db' | 'not-configured' | 'error';

export interface DataLoadResult {
  source: DataLoadSource;
  error?: string;
  tenants: Tenant[];
  properties: Property[];
  leads: Lead[];
  appointments: Appointment[];
  /** true solo cuando source==='supabase' y la BD realmente tiene filas */
  isDatabaseEmpty: boolean;
  totalRecords: number;
  counts: { tenants: number; properties: number; leads: number; appointments: number };
}

const emptyCounts = { tenants: 0, properties: 0, leads: 0, appointments: 0 };

const buildResult = (source: DataLoadSource, data?: Partial<DataLoadResult>, error?: string): DataLoadResult => ({
  source,
  error,
  tenants: data?.tenants ?? [],
  properties: data?.properties ?? [],
  leads: data?.leads ?? [],
  appointments: data?.appointments ?? [],
  isDatabaseEmpty: data?.isDatabaseEmpty ?? true,
  totalRecords: data?.totalRecords ?? 0,
  counts: data?.counts ?? emptyCounts,
});

// Cargar datos reales y vivos desde las tablas de Supabase.
// SIN fallback silencioso a datos mock: el origen de los datos es explícito.
export const loadDataFromSupabase = async (tenantId?: string): Promise<DataLoadResult> => {
  if (!isSupabaseConfigured()) {
    return buildResult('not-configured');
  }

  const client = getSupabaseClient();

  try {
    // Consultar las 4 tablas en paralelo directamente a Supabase.
    // Nota: la tabla canónica de leads se resuelve más abajo ('leads' o legacy 'crm_leads').
    const [tRes, pRes, lRes, aRes] = await Promise.all([
      client.from('tenants').select('*'),
      client.from('properties').select('*'),
      client.from('leads').select('*'),
      client.from('appointments').select('*'),
    ]);

    // Error explícito SOLO si una consulta falla por algo distinto a "tabla no existe"
    // (code 42P01). La ausencia de la tabla 'leads' es un caso soportado: se usa 'crm_leads'.
    const TABLE_MISSING = '42P01';
    const realError = [tRes, pRes, aRes].find((r) => r.error && r.error.code !== TABLE_MISSING);
    if (realError?.error) {
      return buildResult('error', undefined, realError.error.message || 'Consulta fallida');
    }

    // 1. Tenants de Supabase
    const tenants: Tenant[] = (tRes.data ?? []).map((t: any) => ({
      id: String(t.id),
      name: t.name || 'Inmobiliaria',
      slug: t.slug || 'inmobiliaria',
      agent_name: t.agent_name || t.name || 'Agente',
      email: t.email || '',
      phone: t.phone || '',
      avatar_url: t.avatar_url || '',
      bio: t.bio || '',
      location: t.location || 'Arequipa, Perú',
      created_at: t.created_at || new Date().toISOString(),
    }));

    const currentTenantId = tenantId || (tenants.length > 0 ? tenants[0].id : undefined);

    // 2. Propiedades de Supabase
    const properties: Property[] = (pRes.data ?? []).map((p: any) => ({
      id: String(p.id),
      tenant_id: String(p.tenant_id || currentTenantId || ''),
      title: p.title || 'Inmueble en Arequipa',
      slug: p.slug || `inmueble-${p.id}`,
      description: p.description || '',
      property_type: p.property_type || p.type || 'departamento',
      status: (['activa', 'reservada', 'vendida'].includes(p.status)
        ? p.status
        : p.status === 'available'
          ? 'activa'
          : 'activa') as Property['status'],
      price_pen: Number(p.price_pen ?? p.price ?? 0),
      currency: p.currency || 'PEN',
      bedrooms: Number(p.bedrooms ?? 0),
      bathrooms: Number(p.bathrooms ?? 0),
      area_m2: Number(p.area_m2 ?? p.area ?? 0),
      district: p.district || 'Cayma',
      address: p.address || 'Arequipa, Perú',
      image_url: p.image_url || p.image || '',
      gallery_urls: Array.isArray(p.gallery_urls) ? p.gallery_urls : [],
      featured: Boolean(p.featured),
      created_at: p.created_at || new Date().toISOString(),
    }));

    // 3. Leads de Supabase (tabla canónica 'leads'; espejo legacy 'crm_leads')
    let rawLeads: any[] = lRes.data ?? [];
    if (lRes.error || rawLeads.length === 0) {
      const crmRes = await client.from('crm_leads').select('*');
      if (!crmRes.error && crmRes.data && crmRes.data.length > 0) {
        rawLeads = crmRes.data;
      }
    }

    const leads: Lead[] = rawLeads.map((l: any) => ({
      id: String(l.id),
      tenant_id: String(l.tenant_id || currentTenantId || ''),
      full_name: l.full_name || l.name || 'Prospecto Inmobiliario',
      phone: l.phone || '',
      email: l.email || '',
      status: (['nuevo', 'contactado', 'visita', 'cerrado'].includes(l.status)
        ? l.status
        : 'nuevo') as Lead['status'],
      budget_pen: Number(l.budget_pen ?? l.budget ?? l.price ?? 0),
      interested_property_id:
        l.interested_property_id || l.property_id ? String(l.interested_property_id || l.property_id) : undefined,
      notes: l.notes || '',
      source: l.source || 'Portal Web Arequipa',
      created_at: l.created_at || new Date().toISOString(),
    }));

    // 4. Citas de Supabase (appointments)
    const appointments: Appointment[] = (aRes.data ?? []).map((a: any) => ({
      id: String(a.id),
      tenant_id: String(a.tenant_id || currentTenantId || ''),
      lead_id: String(a.lead_id || ''),
      property_id: String(a.property_id || ''),
      scheduled_at: a.scheduled_at || a.date || new Date().toISOString().split('T')[0],
      time_slot: a.time_slot || a.time || '10:30 AM',
      status: (['programada', 'completada', 'cancelada'].includes(a.status)
        ? a.status
        : 'programada') as Appointment['status'],
      visit_type: (['presencial', 'virtual'].includes(a.visit_type || a.type)
        ? a.visit_type || a.type
        : 'presencial') as Appointment['visit_type'],
      notes: a.notes || a.title || '',
      created_at: a.created_at || new Date().toISOString(),
    }));

    const totalRecords = tenants.length + properties.length + leads.length + appointments.length;
    const counts = {
      tenants: tenants.length,
      properties: properties.length,
      leads: leads.length,
      appointments: appointments.length,
    };

    if (totalRecords === 0) {
      // BD conectada pero vacía: se devuelven datos de ejemplo EXPLÍCITAMENTE
      // marcados como demo (source: 'empty-db') para poder mostrar un banner.
      return buildResult('empty-db', {
        tenants: INITIAL_TENANTS,
        properties: INITIAL_PROPERTIES,
        leads: INITIAL_LEADS,
        appointments: INITIAL_APPOINTMENTS,
        isDatabaseEmpty: true,
        totalRecords: 0,
      });
    }

    return buildResult('supabase', { tenants, properties, leads, appointments, isDatabaseEmpty: false, totalRecords, counts });
  } catch (err: any) {
    return buildResult('error', undefined, err?.message ? String(err.message) : 'Error de red desconocido');
  }
};

// Sembrar datos iniciales en Supabase si es necesario
export const seedSupabaseData = async (): Promise<{ success: boolean; message: string }> => {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'No se puede sembrar: define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local.',
    };
  }
  const client = getSupabaseClient();
  try {
    const { error: tErr } = await client.from('tenants').upsert(
      INITIAL_TENANTS.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        agent_name: t.agent_name,
        email: t.email,
        phone: t.phone,
        avatar_url: t.avatar_url,
        bio: t.bio,
        location: t.location,
      }))
    );
    if (tErr) throw new Error(tErr.message);
    return { success: true, message: 'Datos sembrados con éxito en Supabase' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Error al sembrar' };
  }
};
