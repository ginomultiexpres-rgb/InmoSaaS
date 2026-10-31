import React, { useState, useEffect } from 'react';
import { 
  INITIAL_TENANTS, 
  INITIAL_PROPERTIES, 
  INITIAL_LEADS, 
  INITIAL_APPOINTMENTS 
} from './data/mockData';
import { Tenant, Property, Lead, Appointment, LeadStatus, AppointmentStatus } from './types';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { PortfolioView } from './components/PortfolioView';
import { CrmCanvasView } from './components/CrmCanvasView';
import { CrmKanbanView } from './components/CrmKanbanView';
import { AgendaCalendarView } from './components/AgendaCalendarView';
import { PublicAgentLanding } from './components/PublicAgentLanding';
import { DeveloperDocsView } from './components/DeveloperDocsView';
import { loadDataFromSupabase, getSupabaseClient } from './lib/supabase';
import { generateUUID } from './utils/uuid';

export default function App() {
  const [tenants, setTenants] = useState<Tenant[]>(INITIAL_TENANTS);
  const [activeTenant, setActiveTenant] = useState<Tenant>(INITIAL_TENANTS[0]);

  const [properties, setProperties] = useState<Property[]>(INITIAL_PROPERTIES);
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);

  // Navigation View
  const [currentView, setCurrentView] = useState<'dashboard' | 'portafolio' | 'crm' | 'agenda' | 'publico' | 'arquitectura'>('dashboard');
  const [crmMode, setCrmMode] = useState<'kanban' | 'canvas'>('kanban');

  // Modal triggers
  const [isNewPropertyModalOpen, setIsNewPropertyModalOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [scheduleLeadId, setScheduleLeadId] = useState<string | undefined>();
  const [schedulePropertyId, setSchedulePropertyId] = useState<string | undefined>();

  // Cargar datos exclusivamente desde las tablas de Supabase
  const fetchLiveSupabaseData = async (tenantId?: string) => {
    try {
      const liveData = await loadDataFromSupabase(tenantId);
      if (liveData) {
        if (liveData.tenants && liveData.tenants.length > 0) {
          setTenants(liveData.tenants);
          const found = liveData.tenants.find((t) => t.id === tenantId) || liveData.tenants[0];
          if (found) setActiveTenant(found);
        }

        if (liveData.properties) {
          setProperties(liveData.properties);
        }

        if (liveData.leads) {
          setLeads(liveData.leads);
        }

        if (liveData.appointments) {
          setAppointments(liveData.appointments);
        }
      }
    } catch (err) {
      console.error('Error cargando tablas de Supabase:', err);
    }
  };

  // Cargar datos de Supabase y mantener suscripción en tiempo real
  useEffect(() => {
    fetchLiveSupabaseData(activeTenant.id);

    const client = getSupabaseClient();
    const channel = client.channel('public-db-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchLiveSupabaseData(activeTenant.id);
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [activeTenant.id]);

  // CRUD Propiedades con persistencia en Supabase
  const handleAddProperty = async (newProp: Omit<Property, 'id' | 'created_at'>) => {
    const newId = generateUUID();
    const cleanSlug = (newProp.slug || newProp.title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `prop-${Date.now()}`;

    const propRecord = {
      id: newId,
      tenant_id: newProp.tenant_id || activeTenant.id,
      title: newProp.title.trim(),
      slug: cleanSlug,
      description: newProp.description || '',
      property_type: newProp.property_type || 'departamento',
      status: (['activa', 'reservada', 'vendida'].includes(newProp.status) ? newProp.status : 'activa'),
      price: Number(newProp.price_pen) || 0,
      price_pen: Number(newProp.price_pen) || 0,
      currency: newProp.currency || 'PEN',
      bedrooms: Number(newProp.bedrooms) || 0,
      bathrooms: Number(newProp.bathrooms) || 0,
      area_m2: Number(newProp.area_m2) || 0,
      district: newProp.district || 'Cayma',
      address: newProp.address || '',
      image_url: newProp.image_url || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80',
      gallery_urls: Array.isArray(newProp.gallery_urls) && newProp.gallery_urls.length > 0 
        ? newProp.gallery_urls 
        : [newProp.image_url || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80'],
      featured: Boolean(newProp.featured),
      created_at: new Date().toISOString(),
    };

    const prop: Property = {
      id: propRecord.id,
      tenant_id: propRecord.tenant_id,
      title: propRecord.title,
      slug: propRecord.slug,
      description: propRecord.description,
      property_type: propRecord.property_type as any,
      status: propRecord.status as any,
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

    // Actualización inmediata en estado local
    setProperties((prev) => [prop, ...prev]);

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('properties').insert([propRecord]);
        if (error) {
          console.error('Error al insertar propiedad en Supabase:', error);
          if (error.code === '23505' || error.message?.includes('slug')) {
            const retrySlug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;
            propRecord.slug = retrySlug;
            prop.slug = retrySlug;
            await client.from('properties').insert([propRecord]);
          }
        }
      } catch (e) {
        console.error('Excepción al crear propiedad:', e);
      }
    }
  };

  const handleUpdateProperty = async (id: string, updates: Partial<Property>) => {
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );

    const client = getSupabaseClient();
    if (client) {
      try {
        const updatePayload: any = { ...updates };
        if (updates.price_pen !== undefined) {
          updatePayload.price = updates.price_pen;
        }
        await client.from('properties').update(updatePayload).eq('id', id);
      } catch (e) {
        console.error('Error al actualizar propiedad en Supabase:', e);
      }
    }
  };

  const handleDeleteProperty = async (id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('properties').delete().eq('id', id);
      } catch (e) {
        console.error('Error al eliminar propiedad en Supabase:', e);
      }
    }
  };

  // CRM Leads con persistencia tolerante (leads o crm_leads) con UUID
  const handleAddLead = async (newLead: Omit<Lead, 'id' | 'created_at'>) => {
    const newId = generateUUID();
    const lead: Lead = {
      ...newLead,
      id: newId,
      created_at: new Date().toISOString(),
    };
    setLeads((prev) => [lead, ...prev]);

    const client = getSupabaseClient();
    if (client) {
      try {
        const leadPayload = {
          id: newId,
          tenant_id: newLead.tenant_id || activeTenant.id,
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
        };
        const res1 = await client.from('leads').insert([leadPayload]);
        if (res1.error) {
          await client.from('crm_leads').insert([leadPayload]);
        }
      } catch (e) {
        console.error('Error al crear lead:', e);
      }
    }
  };

  const handleUpdateLeadStatus = async (id: string, status: LeadStatus) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status } : l))
    );

    const client = getSupabaseClient();
    if (client) {
      try {
        const res1 = await client.from('leads').update({ status }).eq('id', id);
        if (res1.error) {
          await client.from('crm_leads').update({ status }).eq('id', id);
        }
      } catch (e) {
        console.error('Error al actualizar estado de lead:', e);
      }
    }
  };

  const handleUpdateLead = async (id: string, updates: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );

    const client = getSupabaseClient();
    if (client) {
      try {
        const updatesWithAlias: any = { ...updates };
        if (updates.full_name) {
          updatesWithAlias.name = updates.full_name;
        }
        const res1 = await client.from('leads').update(updatesWithAlias).eq('id', id);
        if (res1.error) {
          await client.from('crm_leads').update(updatesWithAlias).eq('id', id);
        }
      } catch (e) {
        console.error('Error al actualizar datos de lead:', e);
      }
    }
  };

  const handleDeleteLead = async (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));

    const client = getSupabaseClient();
    if (client) {
      try {
        const res1 = await client.from('leads').delete().eq('id', id);
        if (res1.error) {
          await client.from('crm_leads').delete().eq('id', id);
        }
      } catch (e) {
        console.error('Error al eliminar lead:', e);
      }
    }
  };

  // Agenda Citas con persistencia en Supabase (appointments) con UUID
  const handleAddAppointment = async (newApp: Omit<Appointment, 'id' | 'created_at'>) => {
    const newId = generateUUID();
    const appointment: Appointment = {
      ...newApp,
      id: newId,
      created_at: new Date().toISOString(),
    };
    setAppointments((prev) => [appointment, ...prev]);

    if (newApp.lead_id) {
      handleUpdateLeadStatus(newApp.lead_id, 'visita');
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        const appPayload = {
          id: newId,
          tenant_id: newApp.tenant_id || activeTenant.id,
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
        };
        await client.from('appointments').insert([appPayload]);
      } catch (e) {
        console.error('Error al insertar cita en Supabase:', e);
      }
    }
  };

  const handleUpdateAppointmentStatus = async (id: string, status: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('appointments').update({ status }).eq('id', id);
      } catch (e) {
        console.error('Error al actualizar estado de cita:', e);
      }
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('appointments').delete().eq('id', id);
      } catch (e) {
        console.error('Error al eliminar cita:', e);
      }
    }
  };

  // Agendar cita directa desde CRM
  const handleStartScheduleFromLead = (leadId: string, propertyId?: string) => {
    setScheduleLeadId(leadId);
    setSchedulePropertyId(propertyId);
    setCurrentView('agenda');
  };

  // Captura de lead desde la web pública con UUID
  const handlePublicLeadSubmit = async (leadData: {
    tenant_id: string;
    full_name: string;
    phone: string;
    email: string;
    budget_pen: number;
    interested_property_id?: string;
    notes: string;
    source: string;
  }) => {
    const newId = generateUUID();
    const lead: Lead = {
      id: newId,
      tenant_id: leadData.tenant_id,
      full_name: leadData.full_name,
      phone: leadData.phone,
      email: leadData.email,
      status: 'nuevo',
      budget_pen: leadData.budget_pen,
      interested_property_id: leadData.interested_property_id,
      notes: leadData.notes,
      source: leadData.source,
      created_at: new Date().toISOString(),
    };
    setLeads((prev) => [lead, ...prev]);

    const client = getSupabaseClient();
    if (client) {
      try {
        const leadPayload = {
          id: newId,
          tenant_id: leadData.tenant_id,
          name: leadData.full_name,
          full_name: leadData.full_name,
          phone: leadData.phone,
          email: leadData.email,
          status: 'nuevo',
          budget_pen: Number(leadData.budget_pen) || 0,
          interested_property_id: leadData.interested_property_id || null,
          notes: leadData.notes || '',
          source: leadData.source,
          created_at: lead.created_at,
        };
        const res1 = await client.from('leads').insert([leadPayload]);
        if (res1.error) {
          await client.from('crm_leads').insert([leadPayload]);
        }
      } catch (e) {
        console.error('Error al registrar lead desde web pública:', e);
      }
    }
  };

  // Vista pública de aterrizaje del agente
  if (currentView === 'publico') {
    return (
      <PublicAgentLanding
        tenant={activeTenant}
        properties={properties}
        tenants={tenants}
        onSelectTenant={setActiveTenant}
        onBackToDashboard={() => setCurrentView('dashboard')}
        onPublicLeadSubmit={handlePublicLeadSubmit}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar (3 zonas) */}
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        tenants={tenants}
        activeTenant={activeTenant}
        onSelectTenant={setActiveTenant}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && (
          <DashboardView
            tenant={activeTenant}
            properties={properties}
            leads={leads}
            appointments={appointments}
            onNavigate={setCurrentView}
            onOpenNewPropertyModal={() => {
              setCurrentView('portafolio');
              setIsNewPropertyModalOpen(true);
            }}
            onOpenNewLeadModal={() => {
              setCurrentView('crm');
              setIsNewLeadModalOpen(true);
            }}
          />
        )}

        {currentView === 'portafolio' && (
          <PortfolioView
            tenant={activeTenant}
            properties={properties}
            onAddProperty={handleAddProperty}
            onUpdateProperty={handleUpdateProperty}
            onDeleteProperty={handleDeleteProperty}
            onNavigateToPublic={() => setCurrentView('publico')}
            isNewModalOpen={isNewPropertyModalOpen}
            setIsNewModalOpen={setIsNewPropertyModalOpen}
          />
        )}

        {currentView === 'crm' && (
          crmMode === 'kanban' ? (
            <CrmKanbanView
              tenant={activeTenant}
              leads={leads}
              properties={properties}
              onAddLead={handleAddLead}
              onUpdateLeadStatus={handleUpdateLeadStatus}
              onUpdateLead={handleUpdateLead}
              onDeleteLead={handleDeleteLead}
              onScheduleAppointment={handleStartScheduleFromLead}
              isNewLeadModalOpen={isNewLeadModalOpen}
              setIsNewLeadModalOpen={setIsNewLeadModalOpen}
              onSwitchToCanvas={() => setCrmMode('canvas')}
            />
          ) : (
            <CrmCanvasView
              tenant={activeTenant}
              leads={leads}
              properties={properties}
              onAddLead={handleAddLead}
              onUpdateLeadStatus={handleUpdateLeadStatus}
              onUpdateLead={handleUpdateLead}
              onDeleteLead={handleDeleteLead}
              onScheduleAppointment={handleStartScheduleFromLead}
              isNewLeadModalOpen={isNewLeadModalOpen}
              setIsNewLeadModalOpen={setIsNewLeadModalOpen}
              onSwitchToKanban={() => setCrmMode('kanban')}
            />
          )
        )}

        {currentView === 'agenda' && (
          <AgendaCalendarView
            tenant={activeTenant}
            appointments={appointments}
            leads={leads}
            properties={properties}
            onAddAppointment={handleAddAppointment}
            onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
            onDeleteAppointment={handleDeleteAppointment}
            preselectedLeadId={scheduleLeadId}
            preselectedPropertyId={schedulePropertyId}
          />
        )}

        {currentView === 'arquitectura' && <DeveloperDocsView />}
      </main>

      {/* Footer del Backoffice en Glass Presidential */}
      <footer className="glass-presidential text-white py-6 px-4 text-center text-xs border-t border-white/10 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-semibold text-slate-200">
            InmoTenant Perú · SaaS Multi-Tenant para Agentes Inmobiliarios en <strong className="text-[#FFCD00]">Arequipa</strong>
          </span>
          <div className="flex items-center gap-4 text-slate-300">
            <span>Arequipa, Perú</span>
            <span>·</span>
            <span>Next.js 15 App Router</span>
            <span>·</span>
            <span className="font-mono text-[#FFCD00] font-bold">PEN (S/.)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
