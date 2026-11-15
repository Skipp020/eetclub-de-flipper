import { db, isConfigured } from "@/lib/supabase";
import type { Vote } from "@/lib/score";
import FlipperApp from "@/components/FlipperApp";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!isConfigured()) {
    return (
      <main className="wrap">
        <p className="banner">De app is nog niet ingesteld: zet NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY en CLUB_CODE in de omgevingsvariabelen.</p>
      </main>
    );
  }

  const { data, error } = await db()
    .from("votes")
    .select("id, restaurant, datum, lid, eten, service, sfeer, prijs, hygiene, beste_gerecht, wat_kon_beter, eindreactie")
    .order("datum", { ascending: false });

  const votes: Vote[] = (data ?? []).map((v) => ({
    ...v,
    eten: Number(v.eten),
    service: Number(v.service),
    sfeer: Number(v.sfeer),
    prijs: Number(v.prijs),
    hygiene: Number(v.hygiene),
  }));

  return <FlipperApp votes={votes} loadError={error ? "De gegevens konden niet geladen worden. Herlaad de pagina." : null} />;
}
