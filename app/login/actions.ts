"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, AUTH_MAX_AGE_SECONDS, tokenFor } from "@/lib/auth";

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  const expected = process.env.CLUB_CODE;
  if (!expected) return "De clubcode is nog niet ingesteld op de server (CLUB_CODE).";

  const code = String(form.get("code") ?? "").trim();
  // Kleine vertraging maakt raden van de code onaantrekkelijk.
  await new Promise((r) => setTimeout(r, 400));
  if (code.toLowerCase() !== expected.trim().toLowerCase()) return "Die code klopt niet. Vraag de juiste code in de groepsapp.";

  cookies().set(AUTH_COOKIE, await tokenFor(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_MAX_AGE_SECONDS,
  });
  redirect("/");
}
