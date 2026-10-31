import React, { useState, useEffect } from 'react';
import { 
  getStoredCredentials, 
  saveCredentials, 
  clearCredentials, 
  testSupabaseConnection, 
  seedSupabaseData 
} from '../lib/supabase';
import { SUPABASE_SQL_SCHEMA, SUPABASE_SEED_SQL } from '../data/schemaAndCode';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  X, 
  Key, 
  Globe, 
  Server
} from 'lucide-react';

interface SupabaseConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionSuccess: () => void;
}

export const SupabaseConnectionModal: React.FC<SupabaseConnectionModalProps> = ({
  isOpen,
  onClose,
  onConnectionSuccess,
}) => {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    tablesFound?: string[];
    counts?: { tenants: number; properties: number; leads: number; appointments: number };
    hasRows?: boolean;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedSeed, setCopiedSeed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const { url, key } = getStoredCredentials();
      setSupabaseUrl(url);
      setSupabaseKey(key);
      if (url && key && !url.includes('tu-proyecto')) {
        handleTest(url, key);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async (urlToTest?: string, keyToTest?: string) => {
    setIsTesting(true);
    setTestResult(null);

    const targetUrl = urlToTest || supabaseUrl;
    const targetKey = keyToTest || supabaseKey;

    const result = await testSupabaseConnection(targetUrl, targetKey);
    setTestResult(result);
    setIsTesting(false);

    if (result.success) {
      saveCredentials(targetUrl, targetKey);
      onConnectionSuccess();
    }
  };

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseKey.trim()) return;

    saveCredentials(supabaseUrl.trim(), supabaseKey.trim());
    await handleTest(supabaseUrl.trim(), supabaseKey.trim());
  };

  const handleDisconnect = () => {
    clearCredentials();
    setSupabaseUrl('');
    setSupabaseKey('');
    setTestResult({
      success: false,
      message: 'Credenciales eliminadas. La app operará en modo memoria/demo local.',
    });
    onConnectionSuccess();
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    const res = await seedSupabaseData();
    setIsSeeding(false);
    alert(res.message);
    if (res.success) {
      onConnectionSuccess();
      handleTest();
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleCopySeed = () => {
    navigator.clipboard.writeText(SUPABASE_SEED_SQL);
    setCopiedSeed(true);
    setTimeout(() => setCopiedSeed(false), 2000);
  };

  // Extraer ID de proyecto para enlace directo al SQL Editor
  const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  const projectRef = projectRefMatch ? projectRefMatch[1] : '';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="glass-presidential text-white rounded-3xl max-w-2xl w-full border border-white/20 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-white/15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFCD00] text-[#0A192F] flex items-center justify-center shadow-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  Conexión con Supabase (PostgreSQL)
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FFCD00] text-[#0A192F] px-2 py-0.5 rounded-md">
                  Arequipa PEN
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Sincronización directa en vivo con tu base de datos Supabase
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alert Banner */}
        <div className="p-6 space-y-6">
          {testResult && (
            <div
              className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${
                testResult.success
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                  : 'bg-amber-950/60 border-[#FFCD00]/40 text-amber-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-[#FFCD00] shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-1 flex-1">
                  <p className="font-bold text-white text-sm">{testResult.message}</p>
                  {testResult.tablesFound && testResult.tablesFound.length > 0 && (
                    <p className="text-[11px] text-emerald-300">
                      Tablas accesibles en PostgreSQL: <span className="font-mono">{testResult.tablesFound.join(', ')}</span>.
                    </p>
                  )}
                </div>
              </div>

              {/* Conteo de registros en Supabase */}
              {testResult.counts && (
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/15 text-center">
                  <div className="bg-white/10 p-2 rounded-xl">
                    <span className="block text-[10px] uppercase text-slate-400 font-bold">Tenants</span>
                    <span className="text-sm font-mono font-bold text-white">{testResult.counts.tenants}</span>
                  </div>
                  <div className="bg-white/10 p-2 rounded-xl">
                    <span className="block text-[10px] uppercase text-slate-400 font-bold">Inmuebles</span>
                    <span className="text-sm font-mono font-bold text-[#FFCD00]">{testResult.counts.properties}</span>
                  </div>
                  <div className="bg-white/10 p-2 rounded-xl">
                    <span className="block text-[10px] uppercase text-slate-400 font-bold">Leads</span>
                    <span className="text-sm font-mono font-bold text-emerald-300">{testResult.counts.leads}</span>
                  </div>
                  <div className="bg-white/10 p-2 rounded-xl">
                    <span className="block text-[10px] uppercase text-slate-400 font-bold">Citas</span>
                    <span className="text-sm font-mono font-bold text-purple-300">{testResult.counts.appointments}</span>
                  </div>
                </div>
              )}

              {/* Si tiene 0 registros, recomendar sembrado SQL */}
              {testResult.success && testResult.counts && testResult.counts.properties === 0 && (
                <div className="p-4 bg-amber-500/20 border border-amber-500/30 rounded-2xl text-xs text-amber-200 space-y-3">
                  <div>
                    <span className="font-black text-sm block text-[#FFCD00]">⚡ Tablas conectadas (0 registros en PostgreSQL)</span>
                    <span className="text-slate-200">
                      Copia el script de datos de prueba para sembrar los agentes de Arequipa (Valeria Mendoza), inmuebles en Cayma y Yanahuara, prospectos y visitas guiadas con políticas RLS para lectura y escritura.
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopySeed}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FFCD00] text-[#0A192F] font-black text-xs rounded-xl hover:bg-[#E6B800] transition shadow-md cursor-pointer"
                    >
                      {copiedSeed ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>¡Script Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar SQL Datos de Prueba</span>
                        </>
                      )}
                    </button>
                    <a
                      href="https://supabase.com/dashboard/project/TU-PROJECT-REF/sql/new"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir Supabase SQL Editor</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Formulario de Credenciales */}
          <form onSubmit={handleSaveAndConnect} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#FFCD00]" />
                  <span>Project URL de Supabase</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  https://[project-ref].supabase.co
                </span>
              </label>
              <input
                type="url"
                required
                placeholder="https://xyzabcdefghijklmn.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-white/10 border border-white/20 rounded-2xl text-white font-mono placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FFCD00]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#FFCD00]" />
                  <span>Anon Public API Key</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  eyJhbGciOi...
                </span>
              </label>
              <input
                type="password"
                required
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-white/10 border border-white/20 rounded-2xl text-white font-mono placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FFCD00]"
              />
            </div>

            {/* Acciones principales de conexión */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isTesting}
                  className="px-5 py-2.5 text-xs font-black bg-[#FFCD00] hover:bg-[#E6B800] text-[#0A192F] rounded-2xl transition flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Verificando...' : 'Probar y Guardar'}</span>
                </button>

                {supabaseUrl && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-red-400 transition cursor-pointer"
                  >
                    Desconectar
                  </button>
                )}
              </div>

              {testResult?.success && (
                <button
                  type="button"
                  onClick={handleSeed}
                  disabled={isSeeding}
                  className="px-4 py-2 text-xs font-bold bg-white/15 hover:bg-white/25 text-white border border-white/25 rounded-2xl transition flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FFCD00]" />
                  <span>{isSeeding ? 'Sembrando...' : 'Poblar Datos Iniciales'}</span>
                </button>
              )}
            </div>
          </form>

          {/* Guía Rápida de Configuración en Supabase */}
          <div className="pt-4 border-t border-white/15 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#FFCD00] uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                <span>Script SQL de Activación y Sembrado</span>
              </h4>

              {projectRef && (
                <a
                  href={`https://supabase.com/dashboard/project/${projectRef}/sql/new`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#FFCD00] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Abrir SQL Editor en Supabase</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <p className="text-xs text-slate-300">
              Para asegurar permisos de lectura/escritura y precargar las propiedades de Arequipa (Cayma, Yanahuara, Cerro Colorado), copia y ejecuta este script en tu proyecto:
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySql}
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFCD00] text-[#0A192F] font-black text-xs shadow-md cursor-pointer hover:bg-[#E6B800] transition"
              >
                {copiedSql ? <Check className="w-4 h-4 text-[#0A192F]" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSql ? '¡Script SQL Copiado al Portapapeles!' : 'Copiar Script SQL Completo con Datos'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/30 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>Conectado a PostgreSQL en la nube de Supabase.</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1 text-xs font-bold text-white hover:text-[#FFCD00] cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
