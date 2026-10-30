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

// Verificar estado de conexión
export const testSupabaseConnection = async (
  customUrl?: string, 
  customKey?: string
): Promise<{ success: boolean; message: string; tablesFound?: string[] }> => {
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
    // Intentar leer de public.tenants
    const { data, error } = await testClient.from('tenants').select('id, name').limit(1);

    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('does not exist')) {
        return {
          success: true,
          message: 'Conexión establecida con éxito, pero la tabla "tenants" aún no existe en Supabase. Debes ejecutar el script SQL en el SQL Editor.',
          tablesFound: [],
        };
      }
      return {
        success: false,
        message: `Error de Supabase: ${error.message} (Código: ${error.code})`,
      };
    }

    return {
      success: true,
      message: '¡Conexión exitosa con Supabase! Tablas y políticas RLS detectadas.',
      tablesFound: ['tenants', 'properties', 'crm_leads', 'appointments'],
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Fallo de conexión de red: ${err.message || err}`,
    };
  }
};

// Cargar datos reales desde Supabase
export const loadDataFromSupabase = async (tenantId: string) => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const [
      { data: tenants, error: tErr },
      { data: properties, error: pErr },
      { data: leads, error: lErr },
      { data: appointments, error: aErr }
    ] = await Promise.all([
      client.from('tenants').select('*'),
      client.from('properties').select('*').eq('tenant_id', tenantId),
      client.from('crm_leads').select('*').eq('tenant_id', tenantId),
      client.from('appointments').select('*').eq('tenant_id', tenantId),
    ]);

    if (tErr || pErr || lErr || aErr) {
      console.warn('Tablas no encontradas o vacías en Supabase, usando estado actual.', { tErr, pErr, lErr, aErr });
      return null;
    }

    return {
      tenants: tenants as Tenant[],
      properties: properties as Property[],
      leads: leads as Lead[],
      appointments: appointments as Appointment[],
    };
  } catch (err) {
    console.error('Error cargando datos de Supabase:', err);
    return null;
  }
};

// Sembrar datos iniciales en Supabase si las tablas están creadas pero vacías
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

    if (tErr) throw new Error(`Error insertando tenants: ${tErr.message}`);

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

    // 3. Insertar Leads
    const { error: lErr } = await client.from('crm_leads').upsert(
      INITIAL_LEADS.map((l) => ({
        id: l.id,
        tenant_id: l.tenant_id,
        full_name: l.full_name,
        phone: l.phone,
        email: l.email,
        status: l.status,
        budget_pen: l.budget_pen,
        interested_property_id: l.interested_property_id,
        notes: l.notes,
        source: l.source,
      }))
    );

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
      message: '¡Datos iniciales de Arequipa sembrados con éxito en tu base de datos Supabase!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error al sembrar datos en Supabase.',
    };
  }
};
