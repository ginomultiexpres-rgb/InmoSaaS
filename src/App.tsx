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
import { SupabaseConnectionModal } from './components/SupabaseConnectionModal';
import { testSupabaseConnection, loadDataFromSupabase, getSupabaseClient } from './lib/supabase';
import { Database, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [tenants, setTenants] = useState<Tenant[]>(INITIAL_TENANTS);
  const [activeTenant, setActiveTenant] = useState<Tenant>(INITIAL_TENANTS[0]);

  const [properties, setProperties] = useState<Property[]>(INITIAL_PROPERTIES);
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);

  // Supabase states
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Navigation View
  const [currentView, setCurrentView] = useState<'dashboard' | 'portafolio' | 'crm' | 'agenda' | 'publico' | 'arquitectura'>('dashboard');
  const [crmMode, setCrmMode] = useState<'kanban' | 'canvas'>('kanban');

  // Modal triggers
  const [isNewPropertyModalOpen, setIsNewPropertyModalOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [scheduleLeadId, setScheduleLeadId] = useState<string | undefined>();
  const [schedulePropertyId, setSchedulePropertyId] = useState<string | undefined>();

  const showNotification = (msg: string) => {
    setSyncToast(msg);
    setTimeout(() => setSyncToast(null), 4000);
  };

  // Cargar datos desde Supabase
  const fetchLiveSupabaseData = async (tenantId: string) => {
    setIsSyncing(true);
    try {
      const liveData = await loadDataFromSupabase(tenantId);
      if (liveData) {
        if (liveData.tenants && liveData.tenants.length > 0) {
          setTenants(liveData.tenants);
          const found = liveData.tenants.find((t) => t.id === tenantId);
          if (found) setActiveTenant(found);
        }
        if (liveData.properties && liveData.properties.length > 0) {
          setProperties(liveData.properties);
        }
        if (liveData.leads && liveData.leads.length > 0) {
          setLeads(liveData.leads);
        }
        if (liveData.appointments && liveData.appointments.length > 0) {
          setAppointments(liveData.appointments);
        }
        showNotification('Datos sincronizados en tiempo real con PostgreSQL (Supabase)');
      }
    } catch (err) {
      console.warn('Error sincronizando con Supabase:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Verificar conexión inicial al montar
  useEffect(() => {
    const verifySupabase = async () => {
      const result = await testSupabaseConnection();
      if (result.success) {
        setIsSupabaseConnected(true);
        if (result.tablesFound && result.tablesFound.length > 0) {
          await fetchLiveSupabaseData(activeTenant.id);
        }
      } else {
        setIsSupabaseConnected(false);
      }
    };
    verifySupabase();
  }, []);

  // Al cambiar de tenant si hay supabase conectado, reconsultar
  useEffect(() => {
    if (isSupabaseConnected) {
      fetchLiveSupabaseData(activeTenant.id);
    }
  }, [activeTenant.id, isSupabaseConnected]);

  // CRUD Propiedades
  const handleAddProperty = async (newProp: Omit<Property, 'id' | 'created_at'>) => {
    const prop: Property = {
      ...newProp,
      id: `prop-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setProperties((prev) => [prop, ...prev]);

    // Persistencia opcional directa en Supabase
    const client = getSupabaseClient();
    if (client && isSupabaseConnected) {
      try {
        const { error } = await client.from('properties').insert([prop]);
        if (error) console.error('Error insertando propiedad en Supabase:', error);
        else showNotification('Propiedad guardada en Supabase');
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleUpdateProperty = async (id: string, updates: Partial<Property>) => {
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );

    const client = getSupabaseClient();
    if (client && isSupabaseConnected) {
      try {
        const { error } = await client.from('properties').update(updates).eq('id', id);
        if (error) console.error('Error actualizando propiedad en Supabase:', error);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDeleteProperty = async (id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));

    const client = getSupabaseClient();
    if (client && isSupabaseConnected) {
      try {
        const { error } = await client.from('properties').delete().eq('id', id);
        if (error) console.error('Error eliminando propiedad en Supabase:', error);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // CRM Leads
  const handleAddLead = async (newLead: Omit<Lead, 'id' | 'created_at'>) => {
    const lead: Lead = {
      ...newLead,
      id: `lead-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setLeads((prev) => [lead, ...prev]);

    const client = getSupabaseClient();
    if (client && isSupabaseConnected) {
      try {
        const { error } = await client.from('crm_leads').insert([lead]);
        if (error) console.error('Error insertando lead en Supabase:', error);
        else showNotification('Lead registrado en Supabase');
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleUpdateLeadStatus = async (id: string, status: LeadStatus) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status } : l))
    );

    const client = getSupabaseClient();
    if (client && isSupabaseConnected) {
      try {
        const { error } = await client.from('crm_leads').update({ status }).eq('id', id);
        if (error) console.error('Error actualizando estado en Supabase:', error);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleUpdateLead = async (id: string, updates: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );

    const client = getSupabaseClient();
    if (client && isSupabaseConnected) {
      try {
        const { error } = await client.from('crm_leads').update(updates).eq('id', id);
        if (error) console.error('Error actualizando lead en Supabase:', error);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDeleteLead = async (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));

    const client = getSupabaseClient();
    if (client && isSupabaseConnected) {
      try {
        const { error } = await client.from('crm_leads').delete().eq('id', id);
        if (error) console.error('Error eliminando lead en Supabase:', error);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Agenda Citas
  const handleAddAppointment = async (newApp: Omit<Appointment, 'id' | 'created_at'>) => {
    const appointment: Appointment = {
      ...newApp,
      id: `app-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setAppointments((prev) => [appointment, ...prev]);

    // Opcionalmente actualizar el lead a 'visita'
    handleUpdateLeadStatus(newApp.lead_id, 'visita');

    const client = getSupabaseClient();
    if (client && isSupabaseConnected) {
      try {
        const { error } = await client.from('appointments').insert([appointment]);
        if (error) console.error('Error insertando cita en Supabase:', error);
        else showNotification('Cita agendada y guardada en Supabase');
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleUpdateAppointmentStatus = async (id: string, status: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );

    const client = getSupabaseClient();
    if (client && isSupabaseConnected) {
      try {
        const { error } = await client.from('appointments').update({ status }).eq('id', id);
        if (error) console.error('Error actualizando cita en Supabase:', error);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));

    const client = getSupabaseClient();
    if (client && isSupabaseConnected) {
      try {
        const { error } = await client.from('appointments').delete().eq('id', id);
        if (error) console.error('Error eliminando cita en Supabase:', error);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Agendar cita directa desde CRM
  const handleStartScheduleFromLead = (leadId: string, propertyId?: string) => {
    setScheduleLeadId(leadId);
    setSchedulePropertyId(propertyId);
    setCurrentView('agenda');
  };

  // Captura de lead desde la web pública
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
    const lead: Lead = {
      id: `lead-pub-${Date.now()}`,
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
    if (client && isSupabaseConnected) {
      try {
        await client.from('crm_leads').insert([lead]);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Si la vista es la página pública del agente, renderizamos la simulación de /p/[slug]
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
      {/* Top Bar Contract (3 zonas) */}
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        tenants={tenants}
        activeTenant={activeTenant}
        onSelectTenant={setActiveTenant}
        isSupabaseConnected={isSupabaseConnected}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

      {/* Sync Toast Notification */}
      {syncToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#0A192F] text-white shadow-2xl border border-[#FFCD00]/40 animate-in fade-in slide-in-from-bottom-3 duration-200 text-xs">
          <CheckCircle2 className="w-4 h-4 text-[#FFCD00] shrink-0" />
          <span className="font-medium">{syncToast}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && (
          <DashboardView
            tenant={activeTenant}
            properties={properties}
            leads={leads}
            appointments={appointments}
            onNavigate={setCurrentView}
            onOpenNewPropertyModal={() => setIsNewPropertyModalOpen(true)}
            onOpenNewLeadModal={() => setIsNewLeadModalOpen(true)}
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

      {/* Modal de Conexión a Supabase */}
      <SupabaseConnectionModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConnectionSuccess={() => {
          setIsSupabaseConnected(true);
          fetchLiveSupabaseData(activeTenant.id);
        }}
      />

      {/* Footer del Backoffice en Glass Presidential */}
      <footer className="glass-presidential text-white py-6 px-4 text-center text-xs border-t border-white/10 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-semibold text-slate-200">
            InmoTenant Perú · SaaS Multi-Tenant para Agentes Inmobiliarios en <strong className="text-[#FFCD00]">Arequipa</strong>
          </span>
          <div className="flex items-center gap-4 text-slate-300">
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="flex items-center gap-1.5 hover:text-[#FFCD00] transition cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-[#FFCD00]" />
              <span className={isSupabaseConnected ? 'text-emerald-400 font-semibold' : ''}>
                {isSupabaseConnected ? 'Supabase Conectado' : 'Configurar Supabase'}
              </span>
            </button>
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
