// Gedeeld tussen middleware (Edge) en server code: alleen Web Crypto gebruiken.
export const AUTH_COOKIE = "flipper_toegang";
export const AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 jaar

/**
 * De cookie bevat een hash van de clubcode, niet de code zelf. Wijzig je
 * CLUB_CODE, dan klopt de hash niet meer en moet iedereen opnieuw inloggen.
 */
export async function tokenFor(code: string): Promise<string> {
  const data = new TextEncoder().encode(`eetclub-de-flipper:${code}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isValidToken(token: string | undefined): Promise<boolean> {
  const code = process.env.CLUB_CODE;
  if (!code || !token) return false;
  return token === (await tokenFor(code));
}
