import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Controleert de instellingen en geeft een begrijpelijke melding als er iets mis is. */
export function configProblem(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !key && "SUPABASE_SERVICE_ROLE_KEY",
    !process.env.CLUB_CODE?.trim() && "CLUB_CODE",
  ].filter(Boolean);
  if (missing.length) return `Deze instelling(en) ontbreken in Vercel: ${missing.join(", ")}.`;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url!)) {
    return "NEXT_PUBLIC_SUPABASE_URL heeft niet de juiste vorm. Die moet er precies zo uitzien: https://<projectcode>.supabase.co (zonder iets erachter). Je vindt hem in Supabase onder Project Settings → API (of Data API).";
  }
  if (key!.startsWith("sb_publishable_") || decodeRole(key!) === "anon") {
    return "SUPABASE_SERVICE_ROLE_KEY bevat de publieke (anon/publishable) key. Gebruik de geheime key: 'service_role' of een key die begint met sb_secret_.";
  }
  return null;
}

function decodeRole(key: string): string | null {
  try {
    const payload = key.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8")).role ?? null;
  } catch {
    return null;
  }
}

/** Server-only client met de service role key. Nooit naar de browser sturen. */
export function db() {
  const problem = configProblem();
  if (problem) throw new Error(problem);
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim().replace(/\/$/, ""), process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(), {
    auth: { persistSession: false },
  });
}
