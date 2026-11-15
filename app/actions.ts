"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { AUTH_COOKIE, isValidToken } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { CATEGORIES, personalScore, formatScore } from "@/lib/score";

export type ActionResult = { ok: boolean; message: string };

async function requireAccess() {
  if (!(await isValidToken(cookies().get(AUTH_COOKIE)?.value))) {
    throw new Error("Geen toegang: vul eerst de clubcode in.");
  }
}

const text = (v: FormDataEntryValue | null, max = 1000) => {
  const s = typeof v === "string" ? v.trim().slice(0, max) : "";
  return s.length ? s : null;
};

export async function saveVote(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAccess();

  const id = text(form.get("id"), 64);
  const restaurant = text(form.get("restaurant"), 120);
  const lid = text(form.get("lid"), 60);
  const datum = text(form.get("datum"), 10);
  if (!restaurant || !lid || !datum || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    return { ok: false, message: "Vul restaurant, datum en lid in." };
  }

  const grades = {} as Record<(typeof CATEGORIES)[number]["key"], number>;
  for (const c of CATEGORIES) {
    const n = Number(String(form.get(c.key) ?? "").replace(",", "."));
    if (!Number.isFinite(n) || n < 1 || n > 10) {
      return { ok: false, message: `Geef ${c.name} een cijfer van 1 t/m 10.` };
    }
    grades[c.key] = Math.round(n * 10) / 10;
  }

  const row = {
    restaurant,
    lid,
    datum,
    ...grades,
    beste_gerecht: text(form.get("beste_gerecht")),
    wat_kon_beter: text(form.get("wat_kon_beter")),
    eindreactie: text(form.get("eindreactie")),
    updated_at: new Date().toISOString(),
  };

  const supabase = db();
  const { data, error } = await supabase
    .from("votes")
    .upsert(row, { onConflict: "restaurant_key,lid_key" })
    .select("id")
    .single();

  if (error) return { ok: false, message: "Opslaan lukte niet. Probeer het zo nog eens." };

  // Bij aanpassen met een andere naam of ander restaurant: de oude stem opruimen.
  if (id && data && data.id !== id) await supabase.from("votes").delete().eq("id", id);

  revalidatePath("/");
  return { ok: true, message: `Opgeslagen: ${lid} geeft ${restaurant} een ${formatScore(personalScore(grades))}.` };
}

export async function deleteVote(id: string): Promise<ActionResult> {
  await requireAccess();
  const { error } = await db().from("votes").delete().eq("id", id);
  if (error) return { ok: false, message: "Verwijderen lukte niet." };
  revalidatePath("/");
  return { ok: true, message: "Stem verwijderd." };
}

export async function logout() {
  cookies().delete(AUTH_COOKIE);
}
