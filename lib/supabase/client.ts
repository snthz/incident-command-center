import { createBrowserClient } from "@supabase/ssr";

declare global {
  interface Window {
    __ENV?: { supabaseUrl: string; supabaseAnonKey: string };
  }
}

export function createClient() {
  const config = window.__ENV;
  if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
    throw new Error("Missing Supabase runtime config (window.__ENV)");
  }
  return createBrowserClient(config.supabaseUrl, config.supabaseAnonKey);
}

export async function createRealtimeClient() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    await supabase.realtime.setAuth(session.access_token);
  }
  return supabase;
}
