import { db, configProblem } from "@/lib/supabase";
import type { Vote } from "@/lib/score";
import FlipperApp from "@/components/FlipperApp";
import IdentifyForm from "@/components/IdentifyForm";
import { currentMember, type Member } from "@/lib/members";

export const dynamic = "force-dynamic";

export default async function Home() {
  const problem = configProblem();
  if (problem) return <Problem title="De app is nog niet goed ingesteld" text={problem} />;

  let votes: Vote[] = [];
  let loadError: string | null = null;
  let me: Member | null = null;
  try {
    // Controle of de leden-uitbreiding (0002_members.sql) al is gedraaid.
    const { error: membersError } = await db().from("members").select("id").limit(1);
    if (membersError && /members|does not exist|schema cache/i.test(membersError.message)) {
      return (
        <Problem
          title="Database nog bijwerken"
          text="De app heeft een nieuwe tabel nodig voor leden met een pincode. Draai supabase/migrations/0002_members.sql in de SQL Editor van Supabase en herlaad deze pagina."
        />
      );
    }

    me = await currentMember();
    if (!me) {
      const { data: members } = await db().from("members").select("id, name, pin_hash").order("name");
      return (
        <IdentifyForm
          members={(members ?? []).map((m) => ({ id: m.id, name: m.name, hasPin: Boolean(m.pin_hash) }))}
        />
      );
    }

    const { data, error } = await db()
      .from("votes")
      .select("id, member_id, restaurant, datum, lid, eten, service, sfeer, prijs, hygiene, beste_gerecht, wat_kon_beter, eindreactie")
      .order("datum", { ascending: false });
    if (error) {
      console.error("Supabase-fout:", error);
      loadError =
        error.code === "42P01" || /does not exist|schema cache/i.test(error.message)
          ? "De tabel 'votes' bestaat niet in dit Supabase-project. Draai supabase/migrations/0001_init.sql in de SQL Editor van het project waarvan de URL in Vercel staat."
          : /invalid api key|jwt|unauthorized/i.test(error.message)
            ? "Supabase weigert de key. Controleer SUPABASE_SERVICE_ROLE_KEY in Vercel: gebruik de service_role-key van hetzelfde project als de URL."
            : /fetch failed|ENOTFOUND|network/i.test(error.message)
              ? "Supabase is niet bereikbaar op de ingestelde URL. Controleer SUPABASE_URL in Vercel en of het Supabase-project actief is (niet gepauzeerd)."
              : `De gegevens konden niet geladen worden (${error.message}).`;
    }
    votes = (data ?? []).map((v) => ({
      ...v,
      eten: Number(v.eten),
      service: Number(v.service),
      sfeer: Number(v.sfeer),
      prijs: Number(v.prijs),
      hygiene: Number(v.hygiene),
    }));
  } catch (e) {
    console.error("Verbinding met Supabase mislukt:", e);
    return (
      <Problem
        title="Geen verbinding met de database"
        text="Supabase is niet bereikbaar op de ingestelde URL. Controleer SUPABASE_URL in Vercel en of het Supabase-project actief is (niet gepauzeerd)."
      />
    );
  }

  return <FlipperApp votes={votes} loadError={loadError} me={me} />;
}

function Problem({ title, text }: { title: string; text: string }) {
  return (
    <main className="wrap narrow">
      <header className="masthead">
        <span className="eyebrow">Eetclub</span>
        <h1>De Flipper</h1>
      </header>
      <div className="card form">
        <h2>{title}</h2>
        <p>{text}</p>
        <p className="note">Na het aanpassen in Vercel (Settings → Environment Variables) kies je bij Deployments: Redeploy.</p>
      </div>
    </main>
  );
}
