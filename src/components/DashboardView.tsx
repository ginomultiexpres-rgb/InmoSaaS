import React, { useState } from 'react';
import { Tenant, Property, Lead, Appointment } from '../types';
import { formatPEN, formatWhatsAppLink } from '../utils/formatters';
import { 
  Building2, 
  Users, 
  CalendarClock, 
  TrendingUp, 
  MapPin, 
  ExternalLink, 
  MessageCircle, 
  Plus, 
  ArrowRight, 
  Clock, 
  Copy, 
  Check, 
  GitBranch, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Calendar,
  ChevronRight
} from 'lucide-react';

interface DashboardViewProps {
  tenant: Tenant;
  properties: Property[];
  leads: Lead[];
  appointments: Appointment[];
  onNavigate: (view: 'portafolio' | 'crm' | 'agenda' | 'publico' | 'arquitectura') => void;
  onOpenNewPropertyModal: () => void;
  onOpenNewLeadModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tenant,
  properties,
  leads,
  appointments,
  onNavigate,
  onOpenNewPropertyModal,
  onOpenNewLeadModal,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const tenantProperties = properties.filter((p) => p.tenant_id === tenant.id);
  const activeProperties = tenantProperties.filter((p) => p.status === 'activa');
  
  const tenantLeads = leads.filter((l) => l.tenant_id === tenant.id);
  const newLeads = tenantLeads.filter((l) => l.status === 'nuevo');
  
  const todayStr = '2026-03-28';
  const tenantAppointments = appointments.filter((a) => a.tenant_id === tenant.id);
  const todayAppointments = tenantAppointments.filter((a) => a.scheduled_at === todayStr && a.status === 'programada');

  const portfolioTotalPEN = activeProperties.reduce((acc, p) => acc + (p.price_pen || 0), 0);

  // Arequipa District Distribution
  const districtCounts: Record<string, number> = {};
  tenantProperties.forEach((p) => {
    districtCounts[p.district] = (districtCounts[p.district] || 0) + 1;
  });

  const publicPortfolioUrl = `miapp.com/p/${tenant.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://${publicPortfolioUrl}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Hero Executive Banner: Azul Presidente + Amarillo CAT + Glass */}
      <div className="relative overflow-hidden rounded-3xl glass-presidential text-white p-7 sm:p-9 shadow-2xl border border-white/20">
        {/* Subtle background glow with Amarillo CAT and deep blue */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-[#FFCD00]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-10 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-[#FFCD00] shadow-2xl shrink-0 ring-4 ring-[#FFCD00]/20 group">
              <img
                src={tenant.avatar_url}
                alt={tenant.agent_name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#0A192F] bg-[#FFCD00] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0A192F]" />
                  Tenant Arequipa Activo
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  {tenant.location}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {tenant.agent_name}
              </h1>

              <p className="text-xs text-slate-300">
                {tenant.name} · <span className="font-mono text-[#FFCD00]">ID: {tenant.id}</span>
              </p>
            </div>
          </div>

          {/* Quick Share Link Pill */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/20 px-3.5 py-2 rounded-2xl text-xs font-mono text-white shadow-inner">
              <span className="text-slate-400 text-[11px]">Web Pública:</span>
              <span className="font-bold text-[#FFCD00]">{publicPortfolioUrl}</span>
              <button
                onClick={handleCopyLink}
                title="Copiar enlace público"
                className="p-1 hover:bg-white/20 rounded-lg transition text-slate-300 hover:text-white cursor-pointer ml-1"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-[#FFCD00]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              onClick={() => onNavigate('publico')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-black bg-[#FFCD00] hover:bg-[#E6B800] text-[#0A192F] rounded-2xl transition shadow-lg hover:scale-103 cursor-pointer"
            >
              <span>Ver Catálogo en Vivo</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#0A192F]" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Grid in Frosted Glass with Amarillo CAT Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Propiedades Activas */}
        <div
          onClick={() => onNavigate('portafolio')}
          className="glass-card rounded-3xl p-5 shadow-xs hover:-translate-y-1 transition-all duration-200 cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Propiedades Activas</span>
            <div className="w-9 h-9 rounded-xl bg-[#0A192F] text-[#FFCD00] flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0A192F] mt-3 tabular-nums tracking-tight">
            {activeProperties.length}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{tenantProperties.length} en inventario</span>
            <span className="text-[#0A192F] font-bold group-hover:text-[#FFCD00] group-hover:underline flex items-center gap-0.5 transition-colors">
              Ver lista <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Metric 2: Leads Nuevos */}
        <div
          onClick={() => onNavigate('crm')}
          className="glass-card rounded-3xl p-5 shadow-xs hover:-translate-y-1 transition-all duration-200 cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Leads Nuevos</span>
            <div className="w-9 h-9 rounded-xl bg-[#FFCD00] text-[#0A192F] flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0A192F] mt-3 tabular-nums tracking-tight">
            {newLeads.length}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{tenantLeads.length} en embudo activo</span>
            <span className="text-[#0A192F] font-bold group-hover:text-[#FFCD00] group-hover:underline flex items-center gap-0.5 transition-colors">
              Abrir CRM <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Metric 3: Citas Hoy */}
        <div
          onClick={() => onNavigate('agenda')}
          className="glass-card rounded-3xl p-5 shadow-xs hover:-translate-y-1 transition-all duration-200 cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Citas Hoy</span>
            <div className="w-9 h-9 rounded-xl bg-[#0A192F] text-[#FFCD00] flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <CalendarClock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0A192F] mt-3 tabular-nums tracking-tight">
            {todayAppointments.length}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Visitas agendadas</span>
            <span className="text-[#0A192F] font-bold group-hover:text-[#FFCD00] group-hover:underline flex items-center gap-0.5 transition-colors">
              Agenda <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Metric 4: Cartera en Gestión */}
        <div className="glass-card rounded-3xl p-5 shadow-xs hover:-translate-y-1 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cartera en Gestión</span>
            <div className="w-9 h-9 rounded-xl bg-[#FFCD00] text-[#0A192F] flex items-center justify-center shadow-md">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0A192F] mt-3 tabular-nums tracking-tight">
            {formatPEN(portfolioTotalPEN)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Valor inventariado en Soles (PEN S/.)
          </div>
        </div>
      </div>

      {/* 3. CRM Canvas Feature Spotlight (Azul Presidente + Amarillo CAT) */}
      <div 
        onClick={() => onNavigate('crm')}
        className="glass-presidential rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-white/20 cursor-pointer group hover:border-[#FFCD00] transition-all duration-300 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-80 h-full bg-[#FFCD00]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFCD00] text-[#0A192F] text-xs font-black shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#0A192F]" />
              <span>CRM Espacial · Lienzo Canvas con Estilo Glass</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white group-hover:text-[#FFCD00] transition-colors">
              Grafo Espacial de Relaciones entre Compradores e Inmuebles
            </h2>
            <p className="text-xs text-slate-200 leading-relaxed">
              Visualiza nodos de prospectos y propiedades de Cayma, Yanahuara y Cerro Colorado en un lienzo 2D con cables en Amarillo CAT que conectan clientes en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="flex -space-x-3 overflow-hidden p-1">
              {tenantProperties.slice(0, 3).map((p) => (
                <img
                  key={p.id}
                  src={p.image_url}
                  alt={p.title}
                  className="inline-block h-11 w-11 rounded-full ring-2 ring-[#FFCD00] object-cover"
                />
              ))}
            </div>

            <button
              onClick={() => onNavigate('crm')}
              className="px-5 py-2.5 bg-[#FFCD00] hover:bg-[#E6B800] text-[#0A192F] rounded-2xl text-xs font-black transition shadow-lg flex items-center gap-2 group-hover:scale-104 duration-200"
            >
              <GitBranch className="w-4 h-4 text-[#0A192F]" />
              <span>Abrir Lienzo Canvas</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#0A192F]" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Split Section: Today's Appointments & Territory Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Today's Visits in Glass Panel */}
        <div className="lg:col-span-2 glass-white rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 mb-4">
              <div>
                <h3 className="text-base font-black text-[#0A192F]">
                  Agenda de Citas para Hoy ({todayAppointments.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Visitas guiadas coordinadas en Arequipa
                </p>
              </div>

              <button
                onClick={() => onNavigate('agenda')}
                className="text-xs font-bold text-[#0A192F] hover:text-[#FFCD00] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Ver calendario completo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayAppointments.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs space-y-1">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No tienes citas agendadas para hoy.</p>
                <p className="text-slate-400">Puedes programar visitas desde el portafolio o el CRM.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {todayAppointments.map((app) => {
                  const lead = tenantLeads.find((l) => l.id === app.lead_id);
                  const prop = tenantProperties.find((p) => p.id === app.property_id);
                  const waMsg = `Hola ${lead?.full_name || 'cliente'}, le saluda ${tenant.agent_name}. Le escribo para confirmar nuestra visita de hoy a las ${app.time_slot} hrs a: ${prop?.title || 'inmueble'}.`;

                  return (
                    <div key={app.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0A192F] text-sm">
                            {lead?.full_name || 'Prospecto'}
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold bg-[#0A192F] text-[#FFCD00] px-2 py-0.5 rounded-lg shadow-xs">
                            <Clock className="w-3 h-3 text-[#FFCD00]" />
                            {app.time_slot} hrs
                          </span>
                          <span className="text-xs text-slate-500 capitalize">
                            ({app.visit_type})
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-bold text-slate-800">{prop?.title}</span>
                          <span className="text-slate-400">({prop?.district})</span>
                        </div>

                        {app.notes && (
                          <p className="text-xs text-slate-500 italic">
                            "{app.notes}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {lead?.phone && (
                          <a
                            href={formatWhatsAppLink(lead.phone, waMsg)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0A192F] bg-[#FFCD00] hover:bg-[#E6B800] rounded-xl transition shadow-xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Confirmar WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200/80 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Sincronizado con base de datos multi-tenant Supabase.
            </span>
            <button
              onClick={() => onNavigate('agenda')}
              className="text-xs font-black text-[#0A192F] hover:text-[#FFCD00] cursor-pointer transition-colors"
            >
              + Programar Nueva Cita
            </button>
          </div>
        </div>

        {/* Right: Distribution in Arequipa */}
        <div className="space-y-6">
          <div className="glass-white rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0A192F]">
                Inmuebles por Distrito (Arequipa)
              </h3>
              <span className="text-xs text-slate-400 font-mono font-bold">{tenantProperties.length} total</span>
            </div>

            <div className="space-y-3">
              {Object.entries(districtCounts).length === 0 ? (
                <p className="text-xs text-slate-400">Sin inmuebles registrados.</p>
              ) : (
                Object.entries(districtCounts).map(([distrito, count]) => {
                  const percentage = Math.round((count / tenantProperties.length) * 100);

                  return (
                    <div key={distrito} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-700 font-medium flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {distrito}
                        </span>
                        <span className="font-mono font-bold text-[#0A192F]">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#0A192F] h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={onOpenNewPropertyModal}
                className="w-full py-2.5 px-3 text-xs font-black text-white bg-[#0A192F] hover:bg-[#15335b] rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5 text-[#FFCD00]" />
                <span>Publicar Nueva Propiedad</span>
              </button>
            </div>
          </div>

          {/* Quick Lead Capture button */}
          <div className="glass-white rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-[#0A192F]">
              Captura Rápida de Prospectos
            </h3>
            <p className="text-xs text-slate-500">
              Registra un comprador interesado y asígnalo inmediatamente al lienzo Canvas.
            </p>
            <button
              onClick={onOpenNewLeadModal}
              className="w-full py-2 px-3 text-xs font-bold text-[#0A192F] bg-[#FFCD00] hover:bg-[#E6B800] rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Lead en CRM</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
