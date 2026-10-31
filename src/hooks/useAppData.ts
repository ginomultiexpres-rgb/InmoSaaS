import { useState, useEffect, useCallback } from 'react';
import { Tenant, Property, Lead, Appointment, LeadStatus, AppointmentStatus } from '../types';
import { INITIAL_TENANTS, INITIAL_PROPERTIES, INITIAL_LEADS, INITIAL_APPOINTMENTS } from '../data/mockData';
import { loadDataFromSupabase, getSupabaseClient, DataLoadSource } from '../lib/supabase';
import { generateUUID } from '../utils/uuid';

export interface ToastMsg {
  type: 'success' | 'error' | 'info';
  message: string;
}

/**
 * Hook de datos multi-tenant (Fase 5.1): centraliza carga desde Supabase,
 * estado de origen de datos, y CRUD con rollback optimista + notificaciones.
 */
export function useAppData(activeTenantId: string, notify: (t: ToastMsg) => void) {
  const [tenants, setTenants] = useState<Tenant[]>(INITIAL_TENANTS);
  const [properties, setProperties] = useState<Property[]>(INITIAL_PROPERTIES);
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [dataSource, setDataSource] = useState<DataLoadSource>('not-configured');
  const [loading, setLoading] = useState(true);

  const fetchLiveSupabaseData = useCallback(
    async (tenantId?: string) => {
      const res = await loadDataFromSupabase(tenantId);
      setDataSource(res.source);
      setLoading(false);

      if (res.source === 'supabase' || res.source === 'empty-db') {
        if (res.tenants.length > 0) setTenants(res.tenants);
        setProperties(res.properties);
        setLeads(res.leads);
        setAppointments(res.appointments);
      } else if (res.source === 'error') {
        notify({ type: 'error', message: `Error al cargar datos de Supabase: ${res.error ?? 'desconocido'}` });
      }
      // 'not-configured': la UI muestra banner con instrucciones; se conservan los mocks locales visibles.
    },
    [notify],
  );

  // Carga inicial + recarga al cambiar de tenant.
  // (Se retiró la suscripción realtime 'postgres_changes' sobre TODAS las tablas:
  // re-disparaba fetchLiveSupabaseData en cascada. Se puede reactivar por tabla si se necesita.)
  useEffect(() => {
    setLoading(true);
    fetchLiveSupabaseData(activeTenantId);
  }, [activeTenantId, fetchLiveSupabaseData]);

  // ── Propiedades ────────────────────────────────────────────────────────────
  const addProperty = useCallback(
    async (newProp: Omit<Property, 'id' | 'created_at'>) => {
      const newId = generateUUID();
      const cleanSlug = (newProp.slug || newProp.title)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `prop-${Date.now()}`;

      const propRecord = {
        id: newId,
        tenant_id: newProp.tenant_id || activeTenantId,
        title: newProp.title.trim(),
        slug: cleanSlug,
        description: newProp.description || '',
        property_type: newProp.property_type || 'departamento',
        status: ['activa', 'reservada', 'vendida'].includes(newProp.status) ? newProp.status : 'activa',
        price: Number(newProp.price_pen) || 0,
        price_pen: Number(newProp.price_pen) || 0,
        currency: newProp.currency || 'PEN',
        bedrooms: Number(newProp.bedrooms) || 0,
        bathrooms: Number(newProp.bathrooms) || 0,
        area_m2: Number(newProp.area_m2) || 0,
        district: newProp.district || 'Cayma',
        address: newProp.address || '',
        image_url:
          newProp.image_url || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80',
        gallery_urls:
          Array.isArray(newProp.gallery_urls) && newProp.gallery_urls.length > 0
            ? newProp.gallery_urls
            : [newProp.image_url || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80'],
        featured: Boolean(newProp.featured),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const prop: Property = {
        id: propRecord.id,
        tenant_id: propRecord.tenant_id,
        title: propRecord.title,
        slug: propRecord.slug,
        description: propRecord.description,
        property_type: propRecord.property_type as Property['property_type'],
        status: propRecord.status as Property['status'],
        price_pen: propRecord.price_pen,
        currency: propRecord.currency,
        bedrooms: propRecord.bedrooms,
        bathrooms: propRecord.bathrooms,
        area_m2: propRecord.area_m2,
        district: propRecord.district,
        address: propRecord.address,
        image_url: propRecord.image_url,
        gallery_urls: propRecord.gallery_urls,
        featured: propRecord.featured,
        created_at: propRecord.created_at,
      };

      setProperties((prev) => [prop, ...prev]); // optimistic

      try {
        const { error } = await getSupabaseClient().from('properties').insert([propRecord]);
        if (error) {
          if (error.code === '23505' || error.message?.includes('slug')) {
            const retrySlug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;
            const retryRecord = { ...propRecord, slug: retrySlug };
            const retryRes = await getSupabaseClient().from('properties').insert([retryRecord]);
            if (retryRes.error) throw retryRes.error;
            setProperties((prev) => prev.map((p) => (p.id === newId ? { ...p, slug: retrySlug } : p)));
            return;
          }
          throw error;
        }
        notify({ type: 'success', message: `Propiedad «${prop.title}» creada.` });
      } catch (e: any) {
        setProperties((prev) => prev.filter((p) => p.id !== newId)); // rollback
        notify({ type: 'error', message: `No se pudo guardar la propiedad: ${e?.message ?? e}` });
      }
    },
    [activeTenantId, notify],
  );

  const updateProperty = useCallback(
    async (id: string, updates: Partial<Property>) => {
      let snapshot: Property[] = [];
      setProperties((prev) => {
        snapshot = prev;
        return prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      });
      try {
        const updatePayload: Record<string, unknown> = { ...updates };
        if (updates.price_pen !== undefined) updatePayload.price = updates.price_pen;
        updatePayload.updated_at = new Date().toISOString();
        const { error } = await getSupabaseClient().from('properties').update(updatePayload).eq('id', id);
        if (error) throw error;
      } catch (e: any) {
        setProperties(snapshot);
        notify({ type: 'error', message: `No se pudo actualizar la propiedad: ${e?.message ?? e}` });
      }
    },
    [notify],
  );

  const deleteProperty = useCallback(
    async (id: string) => {
      let snapshot: Property[] = [];
      setProperties((prev) => {
        snapshot = prev;
        return prev.filter((p) => p.id !== id);
      });
      try {
        const { error } = await getSupabaseClient().from('properties').delete().eq('id', id);
        if (error) throw error;
      } catch (e: any) {
        setProperties(snapshot);
        notify({ type: 'error', message: `No se pudo eliminar la propiedad: ${e?.message ?? e}` });
      }
    },
    [notify],
  );

  // ── Leads (tabla canónica 'leads' con espejo legacy 'crm_leads') ──────────
  const mutateLeadTable = useCallback(
    async (action: 'insert' | 'update' | 'delete', payloadOrId: unknown, id?: string) => {
      const client = getSupabaseClient();
      const run = async (table: string) => {
        if (action === 'insert') return client.from(table).insert(payloadOrId as any[]);
        if (action === 'update') return client.from(table).update(payloadOrId as any).eq('id', id!);
        return client.from(table).delete().eq('id', id!);
      };
      const first = await run('leads');
      if (!first.error) return { ok: true };
      const second = await run('crm_leads');
      if (!second.error) return { ok: true };
      return { ok: false, error: first.error.message || second.error?.message };
    },
    [],
  );

  const addLead = useCallback(
    async (newLead: Omit<Lead, 'id' | 'created_at'>) => {
      const newId = generateUUID();
      const lead: Lead = { ...newLead, id: newId, created_at: new Date().toISOString() };
      setLeads((prev) => [lead, ...prev]);

      const leadPayload = {
        id: newId,
        tenant_id: newLead.tenant_id || activeTenantId,
        name: newLead.full_name,
        full_name: newLead.full_name,
        phone: newLead.phone,
        email: newLead.email,
        status: newLead.status || 'nuevo',
        budget_pen: Number(newLead.budget_pen) || 0,
        interested_property_id: newLead.interested_property_id || null,
        notes: newLead.notes || '',
        source: newLead.source || 'CRM',
        created_at: lead.created_at,
        updated_at: lead.created_at,
      };
      const res = await mutateLeadTable('insert', [leadPayload]);
      if (!res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== newId));
        notify({ type: 'error', message: `No se pudo crear el lead: ${res.error ?? 'desconocido'}` });
      } else {
        notify({ type: 'success', message: `Lead «${lead.full_name}» creado.` });
      }
    },
    [activeTenantId, mutateLeadTable, notify],
  );

  const updateLeadStatus = useCallback(
    async (id: string, status: LeadStatus) => {
      let snapshot: Lead[] = [];
      setLeads((prev) => {
        snapshot = prev;
        return prev.map((l) => (l.id === id ? { ...l, status } : l));
      });
      const res = await mutateLeadTable('update', { status, updated_at: new Date().toISOString() }, id);
      if (!res.ok) {
        setLeads(snapshot);
        notify({ type: 'error', message: `No se pudo actualizar el lead: ${res.error ?? 'desconocido'}` });
      }
    },
    [mutateLeadTable, notify],
  );

  const updateLead = useCallback(
    async (id: string, updates: Partial<Lead>) => {
      let snapshot: Lead[] = [];
      setLeads((prev) => {
        snapshot = prev;
        return prev.map((l) => (l.id === id ? { ...l, ...updates } : l));
      });
      const updatesWithAlias: Record<string, unknown> = { ...updates };
      if (updates.full_name) updatesWithAlias.name = updates.full_name;
      updatesWithAlias.updated_at = new Date().toISOString();
      const res = await mutateLeadTable('update', updatesWithAlias, id);
      if (!res.ok) {
        setLeads(snapshot);
        notify({ type: 'error', message: `No se pudo actualizar el lead: ${res.error ?? 'desconocido'}` });
      }
    },
    [mutateLeadTable, notify],
  );

  const deleteLead = useCallback(
    async (id: string) => {
      let snapshot: Lead[] = [];
      setLeads((prev) => {
        snapshot = prev;
        return prev.filter((l) => l.id !== id);
      });
      const res = await mutateLeadTable('delete', null, id);
      if (!res.ok) {
        setLeads(snapshot);
        notify({ type: 'error', message: `No se pudo eliminar el lead: ${res.error ?? 'desconocido'}` });
      }
    },
    [mutateLeadTable, notify],
  );

  // ── Citas ──────────────────────────────────────────────────────────────────
  const addAppointment = useCallback(
    async (newApp: Omit<Appointment, 'id' | 'created_at'>) => {
      const newId = generateUUID();
      const appointment: Appointment = { ...newApp, id: newId, created_at: new Date().toISOString() };
      setAppointments((prev) => [appointment, ...prev]);

      if (newApp.lead_id) updateLeadStatus(newApp.lead_id, 'visita');

      const appPayload = {
        id: newId,
        tenant_id: newApp.tenant_id || activeTenantId,
        lead_id: newApp.lead_id,
        property_id: newApp.property_id,
        title: `Visita ${newApp.visit_type || 'presencial'}`,
        scheduled_at: newApp.scheduled_at,
        time_slot: newApp.time_slot,
        visit_type: newApp.visit_type || 'presencial',
        type: newApp.visit_type || 'presencial',
        status: newApp.status || 'programada',
        notes: newApp.notes || '',
        created_at: appointment.created_at,
        updated_at: appointment.created_at,
      };
      try {
        const { error } = await getSupabaseClient().from('appointments').insert([appPayload]);
        if (error) throw error;
        notify({ type: 'success', message: 'Cita agendada.' });
      } catch (e: any) {
        setAppointments((prev) => prev.filter((a) => a.id !== newId));
        notify({ type: 'error', message: `No se pudo agendar la cita: ${e?.message ?? e}` });
      }
    },
    [activeTenantId, updateLeadStatus, notify],
  );

  const updateAppointmentStatus = useCallback(
    async (id: string, status: AppointmentStatus) => {
      let snapshot: Appointment[] = [];
      setAppointments((prev) => {
        snapshot = prev;
        return prev.map((a) => (a.id === id ? { ...a, status } : a));
      });
      try {
        const { error } = await getSupabaseClient()
          .from('appointments')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      } catch (e: any) {
        setAppointments(snapshot);
        notify({ type: 'error', message: `No se pudo actualizar la cita: ${e?.message ?? e}` });
      }
    },
    [notify],
  );

  const deleteAppointment = useCallback(
    async (id: string) => {
      let snapshot: Appointment[] = [];
      setAppointments((prev) => {
        snapshot = prev;
        return prev.filter((a) => a.id !== id);
      });
      try {
        const { error } = await getSupabaseClient().from('appointments').delete().eq('id', id);
        if (error) throw error;
      } catch (e: any) {
        setAppointments(snapshot);
        notify({ type: 'error', message: `No se pudo eliminar la cita: ${e?.message ?? e}` });
      }
    },
    [notify],
  );

  // Lead capturado desde la web pública
  const addPublicLead = useCallback(
    async (leadData: {
      tenant_id: string;
      full_name: string;
      phone: string;
      email: string;
      budget_pen: number;
      interested_property_id?: string;
      notes: string;
      source: string;
    }) => {
      await addLead({ ...leadData, status: 'nuevo' });
    },
    [addLead],
  );

  return {
    tenants,
    properties,
    leads,
    appointments,
    dataSource,
    loading,
    addProperty,
    updateProperty,
    deleteProperty,
    addLead,
    updateLeadStatus,
    updateLead,
    deleteLead,
    addAppointment,
    updateAppointmentStatus,
    deleteAppointment,
    addPublicLead,
  };
}
