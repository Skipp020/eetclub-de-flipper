import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { db } from "@/lib/supabase";

export const MEMBER_COOKIE = "flipper_lid";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 jaar

export type Member = { id: string; name: string };

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pin, salt, 32).toString("hex")}`;
}

export function checkPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, "hex");
  const b = scryptSync(pin, salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Het lid dat in deze browser is ingelogd, of null. */
export async function currentMember(): Promise<Member | null> {
  const token = cookies().get(MEMBER_COOKIE)?.value;
  if (!token) return null;
  const { data } = await db()
    .from("member_sessions")
    .select("members(id, name)")
    .eq("token_hash", sha256(token))
    .maybeSingle();
  const m = data?.members as unknown as Member | null | undefined;
  return m ?? null;
}

export async function startSession(memberId: string) {
  const token = randomBytes(32).toString("hex");
  await db().from("member_sessions").insert({ token_hash: sha256(token), member_id: memberId });
  cookies().set(MEMBER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  const token = cookies().get(MEMBER_COOKIE)?.value;
  if (token) await db().from("member_sessions").delete().eq("token_hash", sha256(token));
  cookies().delete(MEMBER_COOKIE);
}
