import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Tenant } from './types';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { PublicAgentLanding } from './components/PublicAgentLanding';
import { LoginView } from './components/LoginView';
import { DataSourceBanner } from './components/DataSourceBanner';
import { ToastStack, makeToast, ToastItem } from './components/Toast';
import { restoreSession, signOut, AppSession } from './lib/auth';
// Fase 4: code-splitting — las vistas pesadas se cargan de forma diferida.
const PortfolioView = React.lazy(() => import('./components/PortfolioView').then((m) => ({ default: m.PortfolioView })));
const CrmKanbanView = React.lazy(() => import('./components/CrmKanbanView').then((m) => ({ default: m.CrmKanbanView })));
const CrmCanvasView = React.lazy(() => import('./components/CrmCanvasView').then((m) => ({ default: m.CrmCanvasView })));
const AgendaCalendarView = React.lazy(() => import('./components/AgendaCalendarView').then((m) => ({ default: m.AgendaCalendarView })));
// DeveloperDocsView arrastra schemaAndCode.ts (~1,275 líneas): solo bajo demanda y rol admin.
const DeveloperDocsView = React.lazy(() => import('./components/DeveloperDocsView').then((m) => ({ default: m.DeveloperDocsView })));

import { useAppData, ToastMsg } from './hooks/useAppData';

type ViewName = 'dashboard' | 'portafolio' | 'crm' | 'agenda' | 'publico' | 'arquitectura';

const ViewSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4 py-8" role="status" aria-label="Cargando vista">
    <div className="h-8 w-1/3 bg-slate-200 rounded-lg" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-40 bg-slate-200 rounded-2xl" />
      ))}
    </div>
  </div>
);

export default function App() {
  // ── Sesión (Fase 1.3) ──────────────────────────────────────────────────────
  const [session, setSession] = useState<AppSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  // 'supabase' (credenciales reales) | 'demo' (login local sin backend de auth)
  const [authMode, setAuthMode] = useState<'supabase' | 'demo'>('demo');

  useEffect(() => {
    let mounted = true;
    restoreSession().then(({ session: s, status }) => {
      if (mounted) {
        setSession(s);
        setAuthMode(status === 'authenticated' ? 'supabase' : 'demo');
        setAuthReady(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // ── Notificaciones (Fase 2.2) ──────────────────────────────────────────────
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const notify = useCallback((t: ToastMsg) => setToasts((prev) => [...prev.slice(-4), makeToast(t.type, t.message)]), []);
  const dismissToast = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  // ── Tenant activo ──────────────────────────────────────────────────────────
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);

  // ── Datos + CRUD con rollback y origen explícito (Fases 2.x y 5.1) ────────
  const data = useAppData(activeTenant?.id ?? '', notify);

  useEffect(() => {
    if (!activeTenant && data.tenants.length > 0) {
      setActiveTenant(data.tenants[0]);
    }
  }, [data.tenants, activeTenant]);

  // Si el tenant activo desaparece tras una recarga, re-seleccionar primero
  useEffect(() => {
    if (activeTenant && data.tenants.length > 0 && !data.tenants.some((t) => t.id === activeTenant.id)) {
      setActiveTenant(data.tenants[0]);
    }
  }, [data.tenants, activeTenant]);

  // Guardar sesión tras login desde LoginView
  const handleLoggedIn = (s: AppSession, mode: 'supabase' | 'demo') => {
    setSession(s);
    setAuthMode(mode);
  };

  const handleSignOut = async () => {
    await signOut();
    setSession(null);
  };

  // Navigation View
  const [currentView, setCurrentView] = useState<ViewName>('dashboard');
  const [crmMode, setCrmMode] = useState<'kanban' | 'canvas'>('kanban');

  // Modal triggers
  const [isNewPropertyModalOpen, setIsNewPropertyModalOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [scheduleLeadId, setScheduleLeadId] = useState<string | undefined>();
  const [schedulePropertyId, setSchedulePropertyId] = useState<string | undefined>();

  // Agendar cita directa desde CRM
  const handleStartScheduleFromLead = (leadId: string, propertyId?: string) => {
    setScheduleLeadId(leadId);
    setSchedulePropertyId(propertyId);
    setCurrentView('agenda');
  };

  // ── Gate de autenticación (Fase 1.3) ───────────────────────────────────────
  if (!authReady) return <ViewSkeleton />;
  if (!session) return <LoginView onLoggedIn={handleLoggedIn} />;

  // La vista de arquitectura está restringida a rol admin (Fase 1.4).
  const effectiveView: ViewName = currentView === 'arquitectura' && session.role !== 'admin' ? 'dashboard' : currentView;

  // Vista pública de aterrizaje del agente
  if (effectiveView === 'publico') {
    return (
      <>
        <PublicAgentLanding
          tenant={activeTenant ?? data.tenants[0]}
          properties={data.properties}
          tenants={data.tenants}
          onSelectTenant={setActiveTenant}
          onBackToDashboard={() => setCurrentView('dashboard')}
          onPublicLeadSubmit={data.addPublicLead}
        />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  if (!activeTenant) return <ViewSkeleton />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <DataSourceBanner source={data.dataSource} authMode={authMode} />

      {/* Top Bar (3 zonas) */}
      <Navbar
        currentView={effectiveView}
        onSelectView={setCurrentView}
        tenants={data.tenants}
        activeTenant={activeTenant}
        onSelectTenant={setActiveTenant}
        session={session}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<ViewSkeleton />}>
          {data.loading ? (
            <ViewSkeleton />
          ) : (
            <>
              {effectiveView === 'dashboard' && (
                <DashboardView
                  tenant={activeTenant}
                  properties={data.properties}
                  leads={data.leads}
                  appointments={data.appointments}
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

              {effectiveView === 'portafolio' && (
                <PortfolioView
                  tenant={activeTenant}
                  properties={data.properties}
                  onAddProperty={data.addProperty}
                  onUpdateProperty={data.updateProperty}
                  onDeleteProperty={data.deleteProperty}
                  onNavigateToPublic={() => setCurrentView('publico')}
                  isNewModalOpen={isNewPropertyModalOpen}
                  setIsNewModalOpen={setIsNewPropertyModalOpen}
                />
              )}

              {effectiveView === 'crm' &&
                (crmMode === 'kanban' ? (
                  <CrmKanbanView
                    tenant={activeTenant}
                    leads={data.leads}
                    properties={data.properties}
                    onAddLead={data.addLead}
                    onUpdateLeadStatus={data.updateLeadStatus}
                    onUpdateLead={data.updateLead}
                    onDeleteLead={data.deleteLead}
                    onScheduleAppointment={handleStartScheduleFromLead}
                    isNewLeadModalOpen={isNewLeadModalOpen}
                    setIsNewLeadModalOpen={setIsNewLeadModalOpen}
                    onSwitchToCanvas={() => setCrmMode('canvas')}
                  />
                ) : (
                  <CrmCanvasView
                    tenant={activeTenant}
                    leads={data.leads}
                    properties={data.properties}
                    onAddLead={data.addLead}
                    onUpdateLeadStatus={data.updateLeadStatus}
                    onUpdateLead={data.updateLead}
                    onDeleteLead={data.deleteLead}
                    onScheduleAppointment={handleStartScheduleFromLead}
                    isNewLeadModalOpen={isNewLeadModalOpen}
                    setIsNewLeadModalOpen={setIsNewLeadModalOpen}
                    onSwitchToKanban={() => setCrmMode('kanban')}
                  />
                ))}

              {effectiveView === 'agenda' && (
                <AgendaCalendarView
                  tenant={activeTenant}
                  appointments={data.appointments}
                  leads={data.leads}
                  properties={data.properties}
                  onAddAppointment={data.addAppointment}
                  onUpdateAppointmentStatus={data.updateAppointmentStatus}
                  onDeleteAppointment={data.deleteAppointment}
                  preselectedLeadId={scheduleLeadId}
                  preselectedPropertyId={schedulePropertyId}
                />
              )}

              {effectiveView === 'arquitectura' && session.role === 'admin' && <DeveloperDocsView />}
            </>
          )}
        </Suspense>
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
            <span>React 19 + Vite + Supabase</span>
            <span>·</span>
            <span className="font-mono text-[#FFCD00] font-bold">PEN (S/.)</span>
          </div>
        </div>
      </footer>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
