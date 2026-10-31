import React from 'react';
import { Tenant } from '../types';
import { AppSession } from '../lib/auth';
import { ExternalLink, ChevronDown, Check, Sparkles, Database, LogOut } from 'lucide-react';

interface NavbarProps {
  currentView: 'dashboard' | 'portafolio' | 'crm' | 'agenda' | 'publico' | 'arquitectura';
  onSelectView: (view: 'dashboard' | 'portafolio' | 'crm' | 'agenda' | 'publico' | 'arquitectura') => void;
  tenants: Tenant[];
  activeTenant: Tenant;
  onSelectTenant: (tenant: Tenant) => void;
  session?: AppSession | null;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  tenants,
  activeTenant,
  onSelectTenant,
  session,
  onSignOut,
}) => {
  const [tenantDropdownOpen, setTenantDropdownOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 glass-presidential transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectView('dashboard')}
              className="text-left group cursor-pointer focus-visible:outline-none"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white group-hover:text-[#FFCD00] transition-colors whitespace-nowrap">
                  InmoTenant
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#FFCD00] text-[#0A192F] px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-[#0A192F]" />
                  <span>CANVAS</span>
                </span>
              </div>
              <span className="text-[11px] text-slate-300 block font-medium -mt-0.5">
                Arequipa · Multi-Tenant
              </span>
            </button>
          </div>

          {/* Zone 2: Navigation Links (Glass Container) */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold p-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
            <button
              onClick={() => onSelectView('dashboard')}
              className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-[#FFCD00] text-[#0A192F] font-bold shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onSelectView('portafolio')}
              className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                currentView === 'portafolio'
                  ? 'bg-[#FFCD00] text-[#0A192F] font-bold shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Portafolio
            </button>
            <button
              onClick={() => onSelectView('crm')}
              className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                currentView === 'crm'
                  ? 'bg-[#FFCD00] text-[#0A192F] font-bold shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>CRM Canvas</span>
            </button>
            <button
              onClick={() => onSelectView('agenda')}
              className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                currentView === 'agenda'
                  ? 'bg-[#FFCD00] text-[#0A192F] font-bold shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Agenda
            </button>
            {/* Fase 1.4: la vista de esquema SQL solo es accesible para rol admin */}
            {session?.role === 'admin' && (
              <button
                onClick={() => onSelectView('arquitectura')}
                className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  currentView === 'arquitectura'
                    ? 'bg-[#FFCD00] text-[#0A192F] font-bold shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                Esquema SQL & Next.js
              </button>
            )}
          </nav>

          {/* Sesión / Logout */}
          {session && (
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-semibold text-slate-200 max-w-[160px] truncate" title={session.email}>
                {session.email}
                {session.role === 'admin' && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#FFCD00]/20 text-[#FFCD00] text-[9px] uppercase font-black">
                    Admin
                  </span>
                )}
              </span>
              <button
                onClick={onSignOut}
                title="Cerrar sesión"
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Zone 3: Primary Action & Tenant Selector */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Tenant Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 rounded-xl transition border border-white/20 cursor-pointer whitespace-nowrap backdrop-blur-md"
              >
                <div className="w-5 h-5 rounded-full overflow-hidden bg-white/20 shrink-0 border border-[#FFCD00]">
                  <img
                    src={activeTenant.avatar_url}
                    alt={activeTenant.agent_name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <span className="truncate max-w-[130px]">
                  {activeTenant.agent_name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#FFCD00]" />
              </button>

              {tenantDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setTenantDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 glass-presidential rounded-2xl shadow-2xl border border-white/20 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-white">
                    <div className="px-3.5 py-1.5 text-[10px] font-bold text-[#FFCD00] uppercase tracking-wider">
                      Cambiar de Tenant (Aislamiento RLS)
                    </div>
                    {tenants.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          onSelectTenant(t);
                          setTenantDropdownOpen(false);
                        }}
                        className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between hover:bg-white/15 transition cursor-pointer ${
                          activeTenant.id === t.id ? 'bg-white/20 text-[#FFCD00] font-bold' : 'text-white/90'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <img
                            src={t.avatar_url}
                            alt={t.agent_name}
                            className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-white/30"
                            referrerPolicy="no-referrer"
                          />
                          <div className="truncate">
                            <div className="font-bold truncate">{t.name}</div>
                            <div className="text-[11px] text-slate-300 truncate font-mono">
                              /p/{t.slug}
                            </div>
                          </div>
                        </div>
                        {activeTenant.id === t.id && (
                          <Check className="w-4 h-4 text-[#FFCD00] shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                    <div className="mt-2 pt-2 border-t border-white/15 px-3.5 text-[11px] text-slate-300 leading-tight">
                      Cada tenant cuenta con su propio <span className="font-mono text-[#FFCD00]">tenant_id</span> protegido por políticas RLS en PostgreSQL.
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Link Button to Public Portfolio in Amarillo CAT */}
            <button
              onClick={() => onSelectView('publico')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl transition whitespace-nowrap cursor-pointer shadow-md ${
                currentView === 'publico'
                  ? 'bg-white text-[#0A192F]'
                  : 'bg-[#FFCD00] hover:bg-[#E6B800] text-[#0A192F] hover:scale-102 transition-transform duration-200'
              }`}
            >
              <span>Ver Web Pública</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
