import { Session } from '@supabase/supabase-js';
import { supabaseClient, isSupabaseConfigured } from './supabase';

export type AuthStatus = 'authenticated' | 'unauthenticated' | 'offline' | 'not-configured';

export interface AppSession {
  email: string;
  role: 'admin' | 'user';
}

const ADMIN_EMAILS_KEY = 'inmotenant_admin_emails';
const SESSION_STORAGE_KEY = 'inmotenant_local_session';

/**
 * Roles: se resuelven por lista de correos administradores configurable
 * vía VITE_ADMIN_EMAILS (separados por coma) o en runtime con
 * localStorage['inmotenant_admin_emails'].
 */
const isAdminEmail = (email: string): boolean => {
  const envAdmins = (import.meta.env.VITE_ADMIN_EMAILS as string | undefined) || '';
  const storedAdmins = (() => {
    try {
      return localStorage.getItem(ADMIN_EMAILS_KEY) || '';
    } catch {
      return '';
    }
  })();
  const list = `${envAdmins},${storedAdmins}`
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
};

const readLocalSession = (): AppSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppSession;
    return parsed && parsed.email ? parsed : null;
  } catch {
    return null;
  }
};

const writeLocalSession = (session: AppSession | null) => {
  try {
    if (session) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* almacenamiento no disponible */
  }
};

/**
 * Inicia sesión. Primero intenta Supabase Auth (si el proyecto está configurado
 * y accesible). Si la red/Supabase falla, aplica un fallback local de solo
 * lectura para que la demo siga siendo usable — siempre marcado como modo demo.
 */
export const signIn = async (
  email: string,
  password: string,
): Promise<{ ok: boolean; session: AppSession | null; mode: 'supabase' | 'demo'; error?: string }> => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return { ok: false, session: null, mode: 'demo', error: 'Ingresa correo y contraseña.' };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (!error && data.session) {
        const session: AppSession = {
          email: data.session.user.email ?? normalizedEmail,
          role: isAdminEmail(normalizedEmail) ? 'admin' : 'user',
        };
        writeLocalSession(session);
        return { ok: true, session, mode: 'supabase' };
      }
      // Credenciales inválidas: error real de auth, no de red → no hacer fallback
      if (error && error.status === 400) {
        return { ok: false, session: null, mode: 'demo', error: 'Credenciales inválidas.' };
      }
    } catch {
      /* red inaccesible → fallback demo */
    }
  }

  // Fallback demo (sin backend de auth disponible)
  const session: AppSession = {
    email: normalizedEmail,
    role: isAdminEmail(normalizedEmail) ? 'admin' : 'user',
  };
  writeLocalSession(session);
  return { ok: true, session, mode: 'demo' };
};

export const signOut = async (): Promise<void> => {
  writeLocalSession(null);
  if (isSupabaseConfigured()) {
    try {
      await supabaseClient.auth.signOut();
    } catch {
      /* offline: el logout local es suficiente */
    }
  }
};

/**
 * Restaura la sesión: prefiere la sesión real de Supabase; si no hay
 * configuración/red, usa la sesión local guardada (modo demo).
 */
export const restoreSession = async (): Promise<{
  status: AuthStatus;
  session: AppSession | null;
}> => {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabaseClient.auth.getSession();
      const s: Session | null = data.session;
      if (s?.user?.email) {
        const session: AppSession = {
          email: s.user.email,
          role: isAdminEmail(s.user.email) ? 'admin' : 'user',
        };
        writeLocalSession(session);
        return { status: 'authenticated', session };
      }
      return { status: 'unauthenticated', session: null };
    } catch {
      /* fallthrough a sesión local */
    }
  }

  const local = readLocalSession();
  if (local) return { status: 'offline', session: local };
  return { status: 'unauthenticated', session: null };
};
