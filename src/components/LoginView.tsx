import React, { useState } from 'react';
import { signIn } from '../lib/auth';

interface LoginViewProps {
  onLoggedIn: (session: { email: string; role: 'admin' | 'user' }, mode: 'supabase' | 'demo') => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoggedIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn(email, password);
      if (res.ok && res.session) {
        onLoggedIn(res.session, res.mode);
      } else {
        setError(res.error ?? 'No se pudo iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A192F] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white/5 backdrop-blur-md border border-white/15 p-8 shadow-2xl"
      >
        <div className="mb-6 text-center">
          <span className="text-2xl font-black tracking-tight text-white">InmoTenant</span>
          <span className="ml-2 text-[10px] font-black uppercase tracking-wider bg-[#FFCD00] text-[#0A192F] px-2 py-0.5 rounded-md">
            CANVAS
          </span>
          <p className="text-sm text-slate-300 mt-2">Backoffice multi-tenant · Arequipa, Perú</p>
        </div>

        <label className="block text-xs font-semibold text-slate-200 mb-1" htmlFor="login-email">
          Correo electrónico
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FFCD00]"
          placeholder="tu@correo.pe"
        />

        <label className="block text-xs font-semibold text-slate-200 mb-1" htmlFor="login-password">
          Contraseña
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FFCD00]"
          placeholder="••••••••"
        />

        {error && (
          <p role="alert" className="mb-4 text-xs font-medium text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-[#FFCD00] text-[#0A192F] font-bold hover:brightness-110 transition disabled:opacity-60 cursor-pointer"
        >
          {loading ? 'Verificando…' : 'Iniciar sesión'}
        </button>

        <p className="mt-4 text-[11px] text-slate-400 text-center leading-relaxed">
          La autenticación usa Supabase Auth si el proyecto está configurado
          (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Sin conexión, la sesión
          se marca como <strong>modo demo</strong>.
        </p>
      </form>
    </div>
  );
};
