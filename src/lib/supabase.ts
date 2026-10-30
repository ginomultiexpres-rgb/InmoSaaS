import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Tenant, Property, Lead, Appointment } from '../types';
import { INITIAL_TENANTS, INITIAL_PROPERTIES, INITIAL_LEADS, INITIAL_APPOINTMENTS } from '../data/mockData';

// Claves por defecto proporcionadas para el proyecto de Arequipa
const DEFAULT_URL = 'https://imospkeubutacrluepfa.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb3Nwa2V1YnV0YWNybHVlcGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNjI2MTcsImV4cCI6MjEwODczODYxN30.KGEnNLe1UQDegyPyfVo-QM5Oem1xk-xpTTUOOXsNKDc';

const ENV_URL = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL).replace(/\/+$/, '');
const ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

// Almacenamiento local para permitir al usuario ingresar o cambiar credenciales
const STORAGE_URL_KEY = 'inmotenant_supabase_url';
const STORAGE_ANON_KEY = 'inmotenant_supabase_anon_key';

export const getStoredCredentials = () => {
  const rawUrl = localStorage.getItem(STORAGE_URL_KEY) || ENV_URL;
  const url = rawUrl ? rawUrl.replace(/\/+$/, '') : '';
  const key = localStorage.getItem(STORAGE_ANON_KEY) || ENV_KEY;
  return { url, key };
};

export const saveCredentials = (url: string, key: string) => {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  localStorage.setItem(STORAGE_URL_KEY, cleanUrl);
  localStorage.setItem(STORAGE_ANON_KEY, key.trim());
  clientInstance = null; // Reiniciar instancia para tomar nuevas credenciales
};

export const clearCredentials = () => {
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_ANON_KEY);
  clientInstance = null;
};

let clientInstance: SupabaseClient | null = null;
let currentClientKey = '';

export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, key } = getStoredCredentials();
  if (!url || !key || url === 'https://tu-proyecto.supabase.co') {
    return null;
  }

  const instanceKey = `${url}:${key}`;
  try {
    if (!clientInstance || currentClientKey !== instanceKey) {
      clientInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      currentClientKey = instanceKey;
    }
    return clientInstance;
  } catch (error) {
    console.error('Error al inicializar cliente Supabase:', error);
    return null;
  }
};

// Verificar estado de conexión e inspeccionar conteos reales
export const testSupabaseConnection = async (
  customUrl?: string, 
  customKey?: string
): Promise<{ 
  success: boolean; 
  message: string; 
  tablesFound?: string[];
  counts?: { tenants: number; properties: number; leads: number; appointments: number };
  hasRows?: boolean;
}> => {
  const url = customUrl || getStoredCredentials().url;
  const key = customKey || getStoredCredentials().key;

  if (!url || !key || url.includes('tu-proyecto')) {
    return {
      success: false,
      message: 'Falta configurar la URL y la Anon Key de Supabase.',
    };
  }

  try {
    const testClient = createClient(url, key);
    
    // Inspeccionar tablas disponibles y conteos
    const [tRes, pRes, lRes1, aRes] = await Promise.all([
      testClient.from('tenants').select('*', { count: 'exact', head: true }),
      testClient.from('properties').select('*', { count: 'exact', head: true }),
      testClient.from('crm_leads').select('*', { count: 'exact', head: true }),
      testClient.from('appointments').select('*', { count: 'exact', head: true }),
    ]);

    // Si crm_leads da error, probar con tabla 'leads'
    let leadsCount = lRes1.count ?? 0;
    let leadsTable = 'crm_leads';
    if (lRes1.error) {
      const lRes2 = await testClient.from('leads').select('*', { count: 'exact', head: true });
      if (!lRes2.error) {
        leadsCount = lRes2.count ?? 0;
        leadsTable = 'leads';
      }
    }

    const tablesFound: string[] = [];
    if (!tRes.error) tablesFound.push('tenants');
    if (!pRes.error) tablesFound.push('properties');
    tablesFound.push(leadsTable);
    if (!aRes.error) tablesFound.push('appointments');

    const counts = {
      tenants: tRes.count ?? 0,
      properties: pRes.count ?? 0,
      leads: leadsCount,
      appointments: aRes.count ?? 0,
    };

    const totalRows = counts.tenants + counts.properties + counts.leads + counts.appointments;

    return {
      success: true,
      message: totalRows > 0 
        ? `¡Conexión exitosa! ${totalRows} registros cargados desde Supabase PostgreSQL.`
        : '¡Conexión establecida con Supabase! Las tablas existen en PostgreSQL y están listas.',
      tablesFound,
      counts,
      hasRows: totalRows > 0,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Fallo de conexión de red: ${err.message || err}`,
    };
  }
};

// Cargar datos reales desde Supabase con mapeo flexible y tolerante a esquemas
export const loadDataFromSupabase = async (tenantId?: string) => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // 1. Cargar Tenants de la base de datos
    const { data: rawTenants, error: tErr } = await client.from('tenants').select('*');
    let tenants: Tenant[] = [];
    if (!tErr && rawTenants && rawTenants.length > 0) {
      tenants = rawTenants.map((t: any) => ({
        id: String(t.id),
        name: t.name || 'Agencia Inmobiliaria Arequipa',
        slug: t.slug || 'agente-inmobiliario',
        agent_name: t.agent_name || t.name || 'Agente Inmobiliario',
        email: t.email || 'contacto@inmotenant.pe',
        phone: t.phone || '+51 954 112 233',
        avatar_url: t.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
        bio: t.bio || 'Asesor inmobiliario especialista en propiedades residenciales y comerciales en Arequipa.',
        location: t.location || 'Arequipa, Perú',
        created_at: t.created_at || new Date().toISOString(),
      }));
    }

    const currentTenantId = tenantId || (tenants.length > 0 ? tenants[0].id : undefined);

    // 2. Cargar Propiedades
    let rawProperties: any[] = [];
    const { data: propsAll, error: pErr } = await client.from('properties').select('*');
    if (!pErr && propsAll && propsAll.length > 0) {
      rawProperties = propsAll;
    }

    const properties: Property[] = rawProperties.map((p: any) => ({
      id: String(p.id),
      tenant_id: String(p.tenant_id || currentTenantId || 'tenant-valeria'),
      title: p.title || 'Inmueble en Arequipa',
      slug: p.slug || `inmueble-${p.id}`,
      description: p.description || '',
      property_type: p.property_type || p.type || 'departamento',
      status: p.status || 'activa',
      price_pen: Number(p.price_pen || p.price || 450000),
      currency: p.currency || 'PEN',
      bedrooms: Number(p.bedrooms ?? 3),
      bathrooms: Number(p.bathrooms ?? 2),
      area_m2: Number(p.area_m2 || p.area || 120),
      district: p.district || 'Cayma',
      address: p.address || 'Arequipa, Perú',
      image_url: p.image_url || p.image || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
      gallery_urls: Array.isArray(p.gallery_urls) ? p.gallery_urls : [],
      featured: Boolean(p.featured),
      created_at: p.created_at || new Date().toISOString(),
    }));

    // 3. Cargar Leads (crm_leads o leads)
    let rawLeads: any[] = [];
    const { data: crmLeadsData, error: crmErr } = await client.from('crm_leads').select('*');
    if (!crmErr && crmLeadsData && crmLeadsData.length > 0) {
      rawLeads = crmLeadsData;
    } else {
      const { data: leadsData } = await client.from('leads').select('*');
      if (leadsData && leadsData.length > 0) {
        rawLeads = leadsData;
      }
    }

    const leads: Lead[] = rawLeads.map((l: any) => ({
      id: String(l.id),
      tenant_id: String(l.tenant_id || currentTenantId || 'tenant-valeria'),
      full_name: l.full_name || l.name || 'Prospecto Inmobiliario',
      phone: l.phone || '+51 900 000 000',
      email: l.email || '',
      status: (['nuevo', 'contactado', 'visita', 'cerrado'].includes(l.status) ? l.status : 'nuevo') as any,
      budget_pen: Number(l.budget_pen || l.budget || l.price || 380000),
      interested_property_id: l.interested_property_id || l.property_id ? String(l.interested_property_id || l.property_id) : undefined,
      notes: l.notes || '',
      source: l.source || 'Web Pública / Supabase',
      created_at: l.created_at || new Date().toISOString(),
    }));

    // 4. Cargar Citas (appointments)
    let rawAppointments: any[] = [];
    const { data: appData, error: aErr } = await client.from('appointments').select('*');
    if (!aErr && appData && appData.length > 0) {
      rawAppointments = appData;
    }

    const appointments: Appointment[] = rawAppointments.map((a: any) => ({
      id: String(a.id),
      tenant_id: String(a.tenant_id || currentTenantId || 'tenant-valeria'),
      lead_id: String(a.lead_id || ''),
      property_id: String(a.property_id || ''),
      scheduled_at: a.scheduled_at || a.date || new Date().toISOString().split('T')[0],
      time_slot: a.time_slot || a.time || '10:00 AM',
      status: (['programada', 'completada', 'cancelada'].includes(a.status) ? a.status : 'programada') as any,
      visit_type: (['presencial', 'virtual'].includes(a.visit_type || a.type) ? (a.visit_type || a.type) : 'presencial') as any,
      notes: a.notes || '',
      created_at: a.created_at || new Date().toISOString(),
    }));

    const totalRecords = tenants.length + properties.length + leads.length + appointments.length;

    return {
      tenants,
      properties,
      leads,
      appointments,
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

// Sembrar datos iniciales en Supabase
export const seedSupabaseData = async (): Promise<{ success: boolean; message: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'No hay cliente Supabase conectado.' };
  }

  try {
    // 1. Insertar Tenants
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

    if (tErr) {
      if (tErr.code === '42501' || tErr.message.includes('row-level security')) {
        throw new Error('RLS_RESTRICTION: La base de datos tiene Row Level Security activo que requiere permisos para el rol "anon". Ejecuta el script SQL en Supabase SQL Editor para habilitar la inserción.');
      }
      throw new Error(`Error insertando tenants: ${tErr.message}`);
    }

    // 2. Insertar Propiedades
    const { error: pErr } = await client.from('properties').upsert(
      INITIAL_PROPERTIES.map((p) => ({
        id: p.id,
        tenant_id: p.tenant_id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        property_type: p.property_type,
        status: p.status,
        price_pen: p.price_pen,
        currency: 'PEN',
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        area_m2: p.area_m2,
        district: p.district,
        address: p.address,
        image_url: p.image_url,
        featured: p.featured,
      }))
    );

    if (pErr) throw new Error(`Error insertando properties: ${pErr.message}`);

    // 3. Insertar Leads (crm_leads o leads)
    const leadsPayload = INITIAL_LEADS.map((l) => ({
      id: l.id,
      tenant_id: l.tenant_id,
      full_name: l.full_name,
      name: l.full_name,
      phone: l.phone,
      email: l.email,
      status: l.status,
      budget_pen: l.budget_pen,
      interested_property_id: l.interested_property_id,
      notes: l.notes,
      source: l.source,
    }));

    let lErr: any = null;
    const res1 = await client.from('crm_leads').upsert(leadsPayload);
    if (res1.error) {
      const res2 = await client.from('leads').upsert(leadsPayload);
      if (res2.error) lErr = res2.error;
    }

    if (lErr) throw new Error(`Error insertando leads: ${lErr.message}`);

    // 4. Insertar Citas
    const { error: aErr } = await client.from('appointments').upsert(
      INITIAL_APPOINTMENTS.map((a) => ({
        id: a.id,
        tenant_id: a.tenant_id,
        lead_id: a.lead_id,
        property_id: a.property_id,
        scheduled_at: a.scheduled_at,
        time_slot: a.time_slot,
        status: a.status,
        visit_type: a.visit_type,
        notes: a.notes,
      }))
    );

    if (aErr) throw new Error(`Error insertando appointments: ${aErr.message}`);

    return {
      success: true,
      message: '¡Datos iniciales de Arequipa sembrados con éxito en Supabase PostgreSQL!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error al sembrar datos en Supabase.',
    };
  }
};
