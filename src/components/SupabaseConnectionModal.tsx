import React, { useState, useEffect } from 'react';
import { 
  getStoredCredentials, 
  saveCredentials, 
  clearCredentials, 
  testSupabaseConnection, 
  seedSupabaseData 
} from '../lib/supabase';
import { SUPABASE_SQL_SCHEMA } from '../data/schemaAndCode';
import { 
  Database, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  X, 
  Key, 
  Globe, 
  ShieldCheck,
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
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

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
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

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
                  RLS Active
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Sincronización en vivo con tu proyecto Supabase para agentes de Arequipa
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
              className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
                testResult.success
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                  : 'bg-amber-950/60 border-[#FFCD00]/40 text-amber-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#FFCD00] shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-1">
                <p className="font-bold">{testResult.message}</p>
                {testResult.tablesFound && testResult.tablesFound.length > 0 && (
                  <p className="text-[11px] text-emerald-300">
                    Tablas sincronizadas: {testResult.tablesFound.join(', ')}.
                  </p>
                )}
              </div>
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
                  <span>Project API Key (Anon / Public)</span>
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
                  <span>{isTesting ? 'Probando...' : 'Conectar y Guardar'}</span>
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
                  <span>{isSeeding ? 'Sembrando...' : 'Sembrar Datos Iniciales (Seed)'}</span>
                </button>
              )}
            </div>
          </form>

          {/* Guía Rápida de Configuración en Supabase */}
          <div className="pt-4 border-t border-white/15 space-y-3">
            <h4 className="text-xs font-bold text-[#FFCD00] uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" />
              <span>Instrucciones para tu Proyecto Supabase</span>
            </h4>

            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/10">
              <li>
                Inicia sesión en <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-[#FFCD00] underline font-bold inline-flex items-center gap-1">supabase.com <ExternalLink className="w-2.5 h-2.5" /></a> y crea un nuevo proyecto.
              </li>
              <li>
                En el menú lateral, abre <strong>SQL Editor</strong>, crea una nueva consulta y pega el script completo de tablas y políticas RLS:
                <div className="pt-1.5">
                  <button
                    onClick={handleCopySql}
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFCD00] text-[#0A192F] font-bold text-[11px] shadow-xs cursor-pointer hover:bg-[#E6B800] transition"
                  >
                    {copiedSql ? <Check className="w-3 h-3 text-[#0A192F]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSql ? '¡SQL Copiado al Portapapeles!' : 'Copiar Script SQL con RLS'}</span>
                  </button>
                </div>
              </li>
              <li>
                Ejecuta el script (<kbd className="px-1.5 py-0.5 bg-black/40 rounded text-[10px] font-mono">Run</kbd>). Esto creará las tablas <code className="text-[#FFCD00] font-mono">tenants</code>, <code className="text-[#FFCD00] font-mono">properties</code>, <code className="text-[#FFCD00] font-mono">crm_leads</code> y <code className="text-[#FFCD00] font-mono">appointments</code>.
              </li>
              <li>
                Ve a <strong>Project Settings → API</strong>, copia tu <strong>Project URL</strong> y tu <strong>anon public API key</strong> y pégalas en este panel.
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/30 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>Las credenciales se almacenan de manera segura en tu entorno local.</span>
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
