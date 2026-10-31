import React from 'react';
import { AlertTriangle, Database, WifiOff } from 'lucide-react';
import { DataLoadSource } from '../lib/supabase';

interface Props {
  source: DataLoadSource;
}

/**
 * Banner explícito del origen de datos (Fases 2.1 y 6.1): nunca muestra mock
 * datos sin avisar. Sustituye al anterior fallback silencioso a mockData.
 */
export const DataSourceBanner: React.FC<Props> = ({ source }) => {
  if (source === 'supabase') {
    return (
      <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-4 py-1.5 text-[11px] font-semibold flex items-center justify-center gap-2">
        <Database className="w-3.5 h-3.5" />
        Conectado a Supabase · datos reales en vivo
      </div>
    );
  }
  if (source === 'empty-db') {
    return (
      <div className="bg-amber-50 border-b border-amber-300 text-amber-900 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 text-center">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        Modo demo: la base de datos está vacía — se muestran datos de ejemplo no persistibles.
      </div>
    );
  }
  if (source === 'error') {
    return (
      <div className="bg-red-50 border-b border-red-300 text-red-900 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 text-center">
        <WifiOff className="w-4 h-4 shrink-0" />
        Error de conexión con Supabase. Revisa tu red o las credenciales de entorno y recarga.
      </div>
    );
  }
  return (
    <div className="bg-sky-50 border-b border-sky-300 text-sky-900 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 text-center">
      <Database className="w-4 h-4 shrink-0" />
      Supabase no configurado: define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local.
      Vista previa con datos de demostración.
    </div>
  );
};
