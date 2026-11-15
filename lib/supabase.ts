import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Server-only client met de service role key. Nooit naar de browser sturen. */
export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase-instellingen ontbreken: NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY zijn verplicht.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export const isConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.CLUB_CODE);
