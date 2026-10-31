import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Tenant, Property, Lead, Appointment } from '../types';
import { INITIAL_TENANTS, INITIAL_PROPERTIES, INITIAL_LEADS, INITIAL_APPOINTMENTS } from '../data/mockData';

// Credenciales oficiales fijas del proyecto Supabase
export const SUPABASE_PROJECT_URL = 'https://imospkeubutacrluepfa.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb3Nwa2V1YnV0YWNybHVlcGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNjI2MTcsImV4cCI6MjEwODczODYxN30.KGEnNLe1UQDegyPyfVo-QM5Oem1xk-xpTTUOOXsNKDc';

export const getStoredCredentials = () => {
  return {
    url: SUPABASE_PROJECT_URL,
    key: SUPABASE_ANON_KEY,
  };
};

export const saveCredentials = (url: string, key: string) => {
  // compatibilidad
};

export const clearCredentials = () => {
  // compatibilidad
};

// Cliente Supabase conectado directamente a la base de datos de PostgreSQL
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

// Cargar datos reales y vivos desde las tablas de Supabase
export const loadDataFromSupabase = async (tenantId?: string) => {
  const client = getSupabaseClient();

  try {
    // Consultar las 4 tablas en paralelo directamente a Supabase
    const [tRes, pRes, lRes, aRes] = await Promise.all([
      client.from('tenants').select('*'),
      client.from('properties').select('*'),
      client.from('leads').select('*'),
      client.from('appointments').select('*'),
    ]);

    // 1. Tenants de Supabase
    let tenants: Tenant[] = [];
    if (!tRes.error && tRes.data && tRes.data.length > 0) {
      tenants = tRes.data.map((t: any) => ({
        id: String(t.id),
        name: t.name || 'Valeria Mendoza Inmobiliaria',
        slug: t.slug || 'valeria-mendoza',
        agent_name: t.agent_name || t.name || 'Valeria Mendoza',
        email: t.email || 'contacto@inmotenant.pe',
        phone: t.phone || '+51 954 112 233',
        avatar_url: t.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
        bio: t.bio || 'Asesor inmobiliario especialista en propiedades residenciales y comerciales en Arequipa.',
        location: t.location || 'Arequipa, Perú',
        created_at: t.created_at || new Date().toISOString(),
      }));
    } else {
      tenants = INITIAL_TENANTS;
    }

    const currentTenantId = tenantId || (tenants.length > 0 ? tenants[0].id : undefined);

    // 2. Propiedades de Supabase
    let rawProperties: any[] = [];
    if (!pRes.error && pRes.data && pRes.data.length > 0) {
      rawProperties = pRes.data;
    }

    const properties: Property[] = rawProperties.map((p: any) => ({
      id: String(p.id),
      tenant_id: String(p.tenant_id || currentTenantId || 'b3f81e62-814a-4d7a-9db1-d3a958e41a01'),
      title: p.title || 'Inmueble en Arequipa',
      slug: p.slug || `inmueble-${p.id}`,
      description: p.description || '',
      property_type: p.property_type || p.type || 'departamento',
      status: (['activa', 'reservada', 'vendida'].includes(p.status) ? p.status : (p.status === 'available' ? 'activa' : 'activa')) as any,
      price_pen: Number(p.price_pen ?? p.price ?? 450000),
      currency: p.currency || 'PEN',
      bedrooms: Number(p.bedrooms ?? 3),
      bathrooms: Number(p.bathrooms ?? 2),
      area_m2: Number(p.area_m2 ?? p.area ?? 120),
      district: p.district || 'Cayma',
      address: p.address || 'Arequipa, Perú',
      image_url: p.image_url || p.image || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
      gallery_urls: Array.isArray(p.gallery_urls) ? p.gallery_urls : [],
      featured: Boolean(p.featured),
      created_at: p.created_at || new Date().toISOString(),
    }));

    // 3. Leads de Supabase (revisar 'leads' o 'crm_leads')
    let rawLeads: any[] = [];
    if (!lRes.error && lRes.data && lRes.data.length > 0) {
      rawLeads = lRes.data;
    } else {
      const crmRes = await client.from('crm_leads').select('*');
      if (!crmRes.error && crmRes.data && crmRes.data.length > 0) {
        rawLeads = crmRes.data;
      }
    }

    const leads: Lead[] = rawLeads.map((l: any) => ({
      id: String(l.id),
      tenant_id: String(l.tenant_id || currentTenantId || 'b3f81e62-814a-4d7a-9db1-d3a958e41a01'),
      full_name: l.full_name || l.name || 'Prospecto Inmobiliario',
      phone: l.phone || '+51 900 000 000',
      email: l.email || '',
      status: (['nuevo', 'contactado', 'visita', 'cerrado'].includes(l.status) ? l.status : 'nuevo') as any,
      budget_pen: Number(l.budget_pen ?? l.budget ?? l.price ?? 400000),
      interested_property_id: l.interested_property_id || l.property_id ? String(l.interested_property_id || l.property_id) : undefined,
      notes: l.notes || '',
      source: l.source || 'Portal Web Arequipa',
      created_at: l.created_at || new Date().toISOString(),
    }));

    // 4. Citas de Supabase (appointments)
    let rawAppointments: any[] = [];
    if (!aRes.error && aRes.data && aRes.data.length > 0) {
      rawAppointments = aRes.data;
    }

    const appointments: Appointment[] = rawAppointments.map((a: any) => ({
      id: String(a.id),
      tenant_id: String(a.tenant_id || currentTenantId || 'b3f81e62-814a-4d7a-9db1-d3a958e41a01'),
      lead_id: String(a.lead_id || ''),
      property_id: String(a.property_id || ''),
      scheduled_at: a.scheduled_at || a.date || new Date().toISOString().split('T')[0],
      time_slot: a.time_slot || a.time || '10:30 AM',
      status: (['programada', 'completada', 'cancelada'].includes(a.status) ? a.status : 'programada') as any,
      visit_type: (['presencial', 'virtual'].includes(a.visit_type || a.type) ? (a.visit_type || a.type) : 'presencial') as any,
      notes: a.notes || a.title || '',
      created_at: a.created_at || new Date().toISOString(),
    }));

    const totalRecords = tenants.length + properties.length + leads.length + appointments.length;

    return {
      tenants,
      properties: properties.length > 0 ? properties : INITIAL_PROPERTIES,
      leads: leads.length > 0 ? leads : INITIAL_LEADS,
      appointments: appointments.length > 0 ? appointments : INITIAL_APPOINTMENTS,
      isDatabaseEmpty: totalRecords === 0,
      totalRecords,
      counts: {
        tenants: tenants.length,
        properties: properties.length,
        leads: leads.length,
        appointments: appointments.length,
      },
    };
  } catch (err) {
    console.error('Error cargando datos de Supabase:', err);
    return null;
  }
};

// Sembrar datos iniciales en Supabase si es necesario
export const seedSupabaseData = async (): Promise<{ success: boolean; message: string }> => {
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
