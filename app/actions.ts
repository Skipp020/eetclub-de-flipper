"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { AUTH_COOKIE, isValidToken } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { checkPin, currentMember, endSession, hashPin, startSession, type Member } from "@/lib/members";
import { CATEGORIES, personalScore, formatScore } from "@/lib/score";

export type ActionResult = { ok: boolean; message: string };

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

async function requireClub() {
  if (!(await isValidToken(cookies().get(AUTH_COOKIE)?.value))) {
    throw new Error("Geen toegang: vul eerst de clubcode in.");
  }
}

async function requireMember(): Promise<Member> {
  await requireClub();
  const me = await currentMember();
  if (!me) throw new Error("Kies eerst wie je bent.");
  return me;
}

const text = (v: FormDataEntryValue | null, max = 1000) => {
  const s = typeof v === "string" ? v.trim().slice(0, max) : "";
  return s.length ? s : null;
};

/* ---------------- Wie ben jij? ---------------- */

export async function identify(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireClub();
  const choice = text(form.get("member"), 64);
  const newName = text(form.get("new_name"), 40);
  const pin = String(form.get("pin") ?? "").trim();
  const pin2 = String(form.get("pin2") ?? "").trim();
  const supabase = db();

  if (!/^\d{4,8}$/.test(pin)) return { ok: false, message: "Een pincode bestaat uit 4 tot 8 cijfers." };

  // Nieuw lid
  if (choice === "__nieuw__") {
    if (!newName) return { ok: false, message: "Vul je naam in." };
    if (pin !== pin2) return { ok: false, message: "De twee pincodes zijn niet gelijk." };
    const { data: existing } = await supabase.from("members").select("id").eq("name_key", newName.toLowerCase()).maybeSingle();
    if (existing) return { ok: false, message: `${newName} staat al in de lijst. Kies die naam bovenaan.` };
    const { data, error } = await supabase.from("members").insert({ name: newName, pin_hash: hashPin(pin) }).select("id").single();
    if (error || !data) return { ok: false, message: "Aanmaken lukte niet. Probeer het zo nog eens." };
    await startSession(data.id);
    revalidatePath("/");
    return { ok: true, message: `Welkom, ${newName}!` };
  }

  const { data: m } = await supabase
    .from("members")
    .select("id, name, pin_hash, failed_attempts, locked_until")
    .eq("id", choice ?? "")
    .maybeSingle();
  if (!m) return { ok: false, message: "Kies je naam uit de lijst." };

  // Bestaand lid zonder pincode: kiest er nu een.
  if (!m.pin_hash) {
    if (pin !== pin2) return { ok: false, message: "De twee pincodes zijn niet gelijk." };
    // Alleen zetten als er nog steeds geen pincode is (voorkomt dat twee mensen tegelijk claimen).
    const { data: claimed } = await supabase
      .from("members")
      .update({ pin_hash: hashPin(pin) })
      .eq("id", m.id)
      .is("pin_hash", null)
      .select("id");
    if (!claimed?.length) return { ok: false, message: "Voor deze naam is net een pincode ingesteld. Vul die pincode in." };
    await startSession(m.id);
    revalidatePath("/");
    return { ok: true, message: `Welkom, ${m.name}!` };
  }

  if (m.locked_until && new Date(m.locked_until) > new Date()) {
    return { ok: false, message: `Te vaak een verkeerde pincode. Probeer het over ${LOCK_MINUTES} minuten opnieuw.` };
  }
  await new Promise((r) => setTimeout(r, 300));
  if (!checkPin(pin, m.pin_hash)) {
    const attempts = (m.failed_attempts ?? 0) + 1;
    const locked = attempts >= MAX_ATTEMPTS;
    await supabase
      .from("members")
      .update({
        failed_attempts: locked ? 0 : attempts,
        locked_until: locked ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
      })
      .eq("id", m.id);
    return {
      ok: false,
      message: locked
        ? `Te vaak een verkeerde pincode. Probeer het over ${LOCK_MINUTES} minuten opnieuw.`
        : "Die pincode klopt niet.",
    };
  }
  await supabase.from("members").update({ failed_attempts: 0, locked_until: null }).eq("id", m.id);
  await startSession(m.id);
  revalidatePath("/");
  return { ok: true, message: `Welkom terug, ${m.name}!` };
}

export async function switchMember() {
  await endSession();
  revalidatePath("/");
}

export async function logout() {
  await endSession();
  cookies().delete(AUTH_COOKIE);
}

/* ---------------- Stemmen ---------------- */

export async function saveVote(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const me = await requireMember();
  const supabase = db();

  const id = text(form.get("id"), 64);
  const restaurant = text(form.get("restaurant"), 120);
  const datum = text(form.get("datum"), 10);
  if (!restaurant || !datum || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    return { ok: false, message: "Vul restaurant en datum in." };
  }

  const grades = {} as Record<(typeof CATEGORIES)[number]["key"], number>;
  for (const c of CATEGORIES) {
    const n = Number(String(form.get(c.key) ?? "").replace(",", "."));
    if (!Number.isFinite(n) || n < 1 || n > 10) {
      return { ok: false, message: `Geef ${c.name} een cijfer van 1 t/m 10.` };
    }
    grades[c.key] = Math.round(n * 10) / 10;
  }

  // Aanpassen mag alleen bij je eigen stem.
  if (id) {
    const { data: old } = await supabase.from("votes").select("member_id").eq("id", id).maybeSingle();
    if (old && old.member_id !== me.id) return { ok: false, message: "Je kunt alleen je eigen stemmen aanpassen." };
  }

  // Bestaat er al een stem van iemand anders op deze naam voor dit restaurant? Dan niet overschrijven.
  const { data: clash } = await supabase
    .from("votes")
    .select("id, member_id")
    .eq("restaurant_key", restaurant.toLowerCase())
    .eq("lid_key", me.name.trim().toLowerCase())
    .maybeSingle();
  if (clash && clash.member_id !== me.id) return { ok: false, message: "Er staat al een stem op jouw naam die niet van jou is." };

  const row = {
    restaurant,
    lid: me.name,
    member_id: me.id,
    datum,
    ...grades,
    beste_gerecht: text(form.get("beste_gerecht")),
    wat_kon_beter: text(form.get("wat_kon_beter")),
    eindreactie: text(form.get("eindreactie")),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("votes")
    .upsert(row, { onConflict: "restaurant_key,lid_key" })
    .select("id")
    .single();
  if (error) return { ok: false, message: "Opslaan lukte niet. Probeer het zo nog eens." };

  // Restaurantnaam gewijzigd bij aanpassen: de oude stem opruimen.
  if (id && data && data.id !== id) await supabase.from("votes").delete().eq("id", id).eq("member_id", me.id);

  revalidatePath("/");
  return { ok: true, message: `Opgeslagen: jij geeft ${restaurant} een ${formatScore(personalScore(grades))}.` };
}

export async function deleteVote(id: string): Promise<ActionResult> {
  const me = await requireMember();
  const { data, error } = await db().from("votes").delete().eq("id", id).eq("member_id", me.id).select("id");
  if (error) return { ok: false, message: "Verwijderen lukte niet." };
  if (!data?.length) return { ok: false, message: "Je kunt alleen je eigen stemmen verwijderen." };
  revalidatePath("/");
  return { ok: true, message: "Stem verwijderd." };
}
