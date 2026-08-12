// Thin wrapper around the Supabase JS client so every page shares one
// instance and one place to swap providers later (see providers/storage.js).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.APP_CONFIG;

export const configured = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);

export const supabase = configured
  ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

export function requireConfigured() {
  if (!configured) {
    throw new Error(
      "Supabase is not configured yet. Add SUPABASE_URL and SUPABASE_ANON_KEY to assets/config.js."
    );
  }
}
