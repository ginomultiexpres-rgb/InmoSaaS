import React, { useState } from 'react';
import { 
  SUPABASE_SQL_SCHEMA, 
  NEXTJS_FOLDER_STRUCTURE, 
  CODE_DASHBOARD_PAGE, 
  CODE_PUBLIC_AGENT_PAGE 
} from '../data/schemaAndCode';
import { Database, FolderTree, LayoutDashboard, Globe, Copy, Check, Terminal, ShieldCheck } from 'lucide-react';

export const DeveloperDocsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sql' | 'structure' | 'dashboard' | 'public_page' | 'multi_tenant_guide'>('sql');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header en Glass Presidential */}
      <div className="glass-presidential text-white rounded-3xl border border-white/20 p-7 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#0A192F] bg-[#FFCD00] px-2.5 py-0.5 rounded-md shadow-xs">
              Arquitectura de Producción
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-300">Arequipa, Perú (PEN S/.)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1.5">
            Esquema Supabase SQL & Código Next.js 15 (App Router)
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Documentación técnica y código fuente listo para copiar a tu repositorio con aislamiento multi-tenant y Row Level Security (RLS).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFCD00]/20 text-[#FFCD00] border border-[#FFCD00]/40 rounded-xl text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-[#FFCD00]" />
            <span>RLS PostgreSQL Habilitado</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200/80 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('sql')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'sql'
              ? 'border-[#FFCD00] text-[#0A192F] bg-white rounded-t-xl shadow-xs'
              : 'border-transparent text-slate-600 hover:text-[#0A192F] hover:border-slate-300'
          }`}
        >
          <Database className="w-4 h-4 text-[#0A192F]" />
          <span>1. Esquema SQL Supabase con RLS</span>
        </button>

        <button
          onClick={() => setActiveTab('structure')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'structure'
              ? 'border-[#FFCD00] text-[#0A192F] bg-white rounded-t-xl shadow-xs'
              : 'border-transparent text-slate-600 hover:text-[#0A192F] hover:border-slate-300'
          }`}
        >
          <FolderTree className="w-4 h-4 text-[#0A192F]" />
          <span>2. Estructura Next.js App Router</span>
        </button>

        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'border-[#FFCD00] text-[#0A192F] bg-white rounded-t-xl shadow-xs'
              : 'border-transparent text-slate-600 hover:text-[#0A192F] hover:border-slate-300'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-[#0A192F]" />
          <span>3. Código Dashboard (shadcn/ui)</span>
        </button>

        <button
          onClick={() => setActiveTab('public_page')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'public_page'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>4. app/p/[slug]/page.tsx</span>
        </button>

        <button
          onClick={() => setActiveTab('multi_tenant_guide')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'multi_tenant_guide'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>5. Conexión Supabase SSR & Auth</span>
        </button>
      </div>

      {/* Tab Content 1: SQL Schema */}
      {activeTab === 'sql' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                SQL DDL Completo: Tablas, Índices, Triggers y Políticas RLS
              </h3>
              <p className="text-[11px] text-slate-500">
                Pega este script directamente en el <strong>SQL Editor</strong> de tu proyecto Supabase.
              </p>
            </div>
            <button
              onClick={() => handleCopy(SUPABASE_SQL_SCHEMA, 'sql')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black bg-[#FFCD00] hover:bg-[#E6B800] text-[#0A192F] rounded-xl transition shadow-md cursor-pointer"
            >
              {copiedKey === 'sql' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar SQL</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 overflow-x-auto">
            <pre className="text-xs font-mono text-slate-800 leading-relaxed bg-slate-950 text-slate-100 p-5 rounded-xl overflow-x-auto">
              <code>{SUPABASE_SQL_SCHEMA}</code>
            </pre>
          </div>

          <div className="p-4 bg-blue-50/50 border-t border-slate-100 text-xs text-slate-600 space-y-1">
            <h4 className="font-semibold text-slate-900">Garantías del diseño de datos:</h4>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              <li>Todas las tablas tienen clave foránea <code className="bg-white px-1 py-0.2 rounded font-mono">tenant_id</code> con eliminación en cascada.</li>
              <li>La función <code className="bg-white px-1 py-0.2 rounded font-mono">current_tenant_id()</code> consulta el tenant del usuario conectado en <code className="bg-white px-1 py-0.2 rounded font-mono">auth.uid()</code> sin exponer datos a otros tenants.</li>
              <li>Los visitantes anónimos solo pueden ver propiedades con <code className="bg-white px-1 py-0.2 rounded font-mono">status = 'activa'</code> y registrar leads en la landing pública.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab Content 2: Folder Structure */}
      {activeTab === 'structure' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Estructura de Carpetas Recomendada (Next.js 15 App Router)
              </h3>
              <p className="text-[11px] text-slate-500">
                Organización limpia con Route Groups para separar el portal privado de agentes del sitio público <code className="font-mono">/p/[slug]</code>.
              </p>
            </div>
            <button
              onClick={() => handleCopy(NEXTJS_FOLDER_STRUCTURE, 'structure')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg transition shadow-2xs cursor-pointer"
            >
              {copiedKey === 'structure' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Árbol</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 overflow-x-auto">
            <pre className="text-xs font-mono text-slate-800 leading-relaxed bg-slate-900 text-slate-100 p-5 rounded-xl overflow-x-auto">
              <code>{NEXTJS_FOLDER_STRUCTURE}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Tab Content 3: Dashboard Code */}
      {activeTab === 'dashboard' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                app/(dashboard)/page.tsx · Componente Principal con shadcn/ui
              </h3>
              <p className="text-[11px] text-slate-500">
                Server Component de Next.js que consulta Supabase directamente con tipado seguro y renderiza las métricas y citas.
              </p>
            </div>
            <button
              onClick={() => handleCopy(CODE_DASHBOARD_PAGE, 'dashboard_code')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg transition shadow-2xs cursor-pointer"
            >
              {copiedKey === 'dashboard_code' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Componente</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 overflow-x-auto">
            <pre className="text-xs font-mono text-slate-800 leading-relaxed bg-slate-950 text-slate-100 p-5 rounded-xl overflow-x-auto max-h-[600px]">
              <code>{CODE_DASHBOARD_PAGE}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Tab Content 4: Public Page Code */}
      {activeTab === 'public_page' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                app/p/[slug]/page.tsx · Landing Pública del Agente
              </h3>
              <p className="text-[11px] text-slate-500">
                Genera la página pública a partir del slug del agente con metadatos dinámicos SEO (OpenGraph) y catálogo de inmuebles en Soles (PEN).
              </p>
            </div>
            <button
              onClick={() => handleCopy(CODE_PUBLIC_AGENT_PAGE, 'public_page_code')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg transition shadow-2xs cursor-pointer"
            >
              {copiedKey === 'public_page_code' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Código</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 overflow-x-auto">
            <pre className="text-xs font-mono text-slate-800 leading-relaxed bg-slate-950 text-slate-100 p-5 rounded-xl overflow-x-auto max-h-[600px]">
              <code>{CODE_PUBLIC_AGENT_PAGE}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Tab Content 5: Multi-Tenant Supabase Guide */}
      {activeTab === 'multi_tenant_guide' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Configuración de Clientes Supabase SSR para Multi-Tenancy
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Cómo configurar los clientes oficiales de <code className="font-mono">@supabase/ssr</code> en Next.js App Router para soportar aislamiento automático por cookies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700">lib/supabase/server.ts (Server Components & Actions)</span>
              <pre className="text-[11px] font-mono bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto">
{`import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {}
        },
      },
    }
  );
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700">lib/supabase/client.ts (Client Components)</span>
              <pre className="text-[11px] font-mono bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto">
{`import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}`}
              </pre>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
            <h4 className="font-bold text-slate-900">Variables de Entorno necesarias (.env.local):</h4>
            <pre className="font-mono bg-white p-3 rounded border border-slate-200 text-[11px]">
{`NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
NEXT_PUBLIC_APP_URL="https://inmotenant.pe"`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
