import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const getProjectUrlFromJwt = (key) => {
  try {
    const payload = key?.split('.')?.[1];
    if (!payload) return '';

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '=',
    );
    const { ref } = JSON.parse(window.atob(paddedPayload));

    return ref ? `https://${ref}.supabase.co` : '';
  } catch {
    return '';
  }
};

const supabaseUrl = rawSupabaseUrl?.startsWith('http')
  ? rawSupabaseUrl
  : getProjectUrlFromJwt(supabaseAnonKey);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const getAuthRedirectUrl = () => {
  const configuredUrl = import.meta.env.VITE_AUTH_REDIRECT_URL;
  return configuredUrl || window.location.origin;
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;
