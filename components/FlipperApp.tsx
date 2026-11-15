"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { saveVote, deleteVote, logout, type ActionResult } from "@/app/actions";
import {
  CATEGORIES,
  formatDate,
  formatScore,
  personalScore,
  rank,
  scoreClass,
  type CategoryKey,
  type Vote,
} from "@/lib/score";

type View = "ranglijst" | "stemmen" | "uitleg";
const VIEWS: { id: View; label: string }[] = [
  { id: "ranglijst", label: "Ranglijst" },
  { id: "stemmen", label: "Stem invoeren" },
  { id: "uitleg", label: "Uitleg" },
];

const today = () => new Date().toISOString().slice(0, 10);
const toInput = (n: number | undefined) => (n == null ? "" : String(n).replace(".", ","));
const parse = (s: string) => {
  if (!s.trim()) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

type Draft = {
  id: string;
  restaurant: string;
  datum: string;
  lid: string;
  grades: Record<CategoryKey, string>;
  beste_gerecht: string;
  wat_kon_beter: string;
  eindreactie: string;
};

const emptyGrades = () => Object.fromEntries(CATEGORIES.map((c) => [c.key, ""])) as Record<CategoryKey, string>;
const emptyDraft = (keep?: Partial<Draft>): Draft => ({
  id: "",
  restaurant: keep?.restaurant ?? "",
  datum: keep?.datum ?? today(),
  lid: "",
  grades: emptyGrades(),
  beste_gerecht: "",
  wat_kon_beter: "",
  eindreactie: "",
});
const draftFrom = (v: Vote): Draft => ({
  id: v.id,
  restaurant: v.restaurant,
  datum: v.datum,
  lid: v.lid,
  grades: Object.fromEntries(CATEGORIES.map((c) => [c.key, toInput(v[c.key])])) as Record<CategoryKey, string>,
  beste_gerecht: v.beste_gerecht ?? "",
  wat_kon_beter: v.wat_kon_beter ?? "",
  eindreactie: v.eindreactie ?? "",
});

export default function FlipperApp({ votes, loadError }: { votes: Vote[]; loadError: string | null }) {
  const [view, setView] = useState<View>("ranglijst");
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());

  useEffect(() => {
    const read = () => {
      const h = location.hash.slice(1) as View;
      setView(VIEWS.some((v) => v.id === h) ? h : "ranglijst");
    };
    read();
    addEventListener("hashchange", read);
    return () => removeEventListener("hashchange", read);
  }, []);

  const go = (v: View) => {
    location.hash = v;
    window.scrollTo({ top: 0 });
  };

  const ranking = useMemo(() => rank(votes), [votes]);
  const restaurants = ranking.map((r) => r.name);
  const members = useMemo(
    () => [...new Set(votes.map((v) => v.lid.trim()))].sort((a, b) => a.localeCompare(b, "nl")),
    [votes]
  );

  return (
    <main className="wrap">
      <header className="masthead">
        <div className="mast-row">
          <span className="eyebrow">Eetclub</span>
          <form action={logout}>
            <button type="submit" className="link">Uitloggen</button>
          </form>
        </div>
        <h1>De Flipper</h1>
        <p className="sub">Elk restaurant, elk lid, één cijfer per categorie. De Flipper-score rekent zichzelf uit.</p>
      </header>

      <nav aria-label="Onderdelen">
        {VIEWS.map((v) => (
          <a key={v.id} href={`#${v.id}`} aria-current={view === v.id ? "page" : undefined}>
            {v.label}
          </a>
        ))}
      </nav>

      {loadError && <p className="banner">{loadError}</p>}

      {view === "ranglijst" && (
        <Ranking
          ranking={ranking}
          totalVotes={votes.length}
          onEdit={(v) => {
            setDraft(draftFrom(v));
            go("stemmen");
          }}
          onFirst={() => go("stemmen")}
        />
      )}
      {view === "stemmen" && (
        <VoteForm
          key={draft.id || "nieuw"}
          initial={draft}
          restaurants={restaurants}
          members={members}
          onReset={(keep) => setDraft(emptyDraft(keep))}
        />
      )}
      {view === "uitleg" && <Explanation />}
    </main>
  );
}

/* ---------------- Ranglijst ---------------- */

function Ranking({
  ranking,
  totalVotes,
  onEdit,
  onFirst,
}: {
  ranking: ReturnType<typeof rank>;
  totalVotes: number;
  onEdit: (v: Vote) => void;
  onFirst: () => void;
}) {
  if (!ranking.length) {
    return (
      <section>
        <h2>Ranglijst</h2>
        <div className="empty">
          <strong>Nog geen restaurants beoordeeld</strong>
          <span className="note">Voer na het eerste etentje de eerste stem in. Het restaurant verschijnt dan hier.</span>
          <button type="button" className="primary" onClick={onFirst}>Eerste stem invoeren</button>
        </div>
      </section>
    );
  }
  return (
    <section>
      <div className="vhead">
        <h2>Ranglijst</h2>
        <span className="note">
          {ranking.length} {ranking.length === 1 ? "restaurant" : "restaurants"} · {totalVotes} stemmen
        </span>
      </div>
      <ol className="rank">
        {ranking.map((r, i) => (
          <li key={r.key}>
            <details>
              <summary>
                <span className="pos">{i + 1}</span>
                <span className="rname">
                  <h3>{r.name}</h3>
                  <span className="meta">
                    {formatDate(r.lastDate)} · {r.votes.length} {r.votes.length === 1 ? "stem" : "stemmen"}
                  </span>
                </span>
                <span className={`score ${scoreClass(r.score)}`} title="De Flipper-score">{formatScore(r.score)}</span>
              </summary>
              <div className="cats">
                {CATEGORIES.map((c) => (
                  <div className="cat" key={c.key}>
                    <span>{c.short}</span>
                    <b>{formatScore(r[c.key])}</b>
                    <div className="bar"><i style={{ width: `${r[c.key] * 10}%` }} /></div>
                  </div>
                ))}
              </div>
              <div className="detail">
                {r.votes.map((v) => (
                  <VoteCard key={v.id} vote={v} onEdit={() => onEdit(v)} />
                ))}
              </div>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}

function VoteCard({ vote: v, onEdit }: { vote: Vote; onEdit: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const p = personalScore(v);

  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 4000);
    return () => clearTimeout(t);
  }, [confirm]);

  return (
    <div className="vote">
      <div className="vhead">
        <strong>{v.lid}</strong>
        <span className={`score mini ${scoreClass(p)}`}>{formatScore(p)}</span>
      </div>
      <div className="vnums">{CATEGORIES.map((c) => `${c.short} ${formatScore(v[c.key])}`).join(" · ")}</div>
      {(v.beste_gerecht || v.wat_kon_beter || v.eindreactie) && (
        <dl className="vtext">
          {v.beste_gerecht && (<><dt>Beste gerecht</dt><dd>{v.beste_gerecht}</dd></>)}
          {v.wat_kon_beter && (<><dt>Kon beter</dt><dd>{v.wat_kon_beter}</dd></>)}
          {v.eindreactie && (<><dt>Eindreactie</dt><dd>{v.eindreactie}</dd></>)}
        </dl>
      )}
      <div className="vactions">
        <button type="button" className="small" onClick={onEdit}>Aanpassen</button>
        <button
          type="button"
          className="small danger"
          disabled={pending}
          onClick={() => {
            if (!confirm) return setConfirm(true);
            start(async () => {
              const res = await deleteVote(v.id);
              if (!res.ok) setErr(res.message);
            });
          }}
        >
          {pending ? "Verwijderen…" : confirm ? "Zeker weten?" : "Verwijderen"}
        </button>
        {err && <span className="toast err">{err}</span>}
      </div>
    </div>
  );
}

/* ---------------- Stem invoeren ---------------- */

function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="primary" disabled={pending}>
      {pending ? "Opslaan…" : editing ? "Wijziging opslaan" : "Stem opslaan"}
    </button>
  );
}

function VoteForm({
  initial,
  restaurants,
  members,
  onReset,
}: {
  initial: Draft;
  restaurants: string[];
  members: string[];
  onReset: (keep?: Partial<Draft>) => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [result, action] = useFormState<ActionResult | null, FormData>(saveVote, null);
  const lastResult = useRef<ActionResult | null>(null);
  const editing = Boolean(d.id);

  // Na succesvol opslaan: formulier leeg, restaurant en datum blijven staan
  // zodat het volgende lid meteen kan invullen.
  useEffect(() => {
    if (result && result !== lastResult.current) {
      lastResult.current = result;
      if (result.ok) setD((cur) => ({ ...emptyDraft({ restaurant: cur.restaurant, datum: cur.datum }) }));
    }
  }, [result]);

  const nums = Object.fromEntries(CATEGORIES.map((c) => [c.key, parse(d.grades[c.key])])) as Record<CategoryKey, number | null>;
  const complete = CATEGORIES.every((c) => nums[c.key] != null && nums[c.key]! >= 1 && nums[c.key]! <= 10);
  const live = complete ? personalScore(nums as Record<CategoryKey, number>) : null;

  const step = (k: CategoryKey, delta: number) => {
    const cur = nums[k];
    const next = cur == null ? 7 : Math.min(10, Math.max(1, Math.round((cur + delta) * 2) / 2));
    setD({ ...d, grades: { ...d.grades, [k]: toInput(next) } });
  };

  return (
    <section>
      <h2>{editing ? `Stem aanpassen: ${initial.lid} bij ${initial.restaurant}` : "Stem invoeren"}</h2>
      <form action={action} className="card form">
        <input type="hidden" name="id" value={d.id} />
        <div className="row">
          <label htmlFor="f-rest">
            Restaurant
            <input id="f-rest" name="restaurant" list="restList" required autoComplete="off" placeholder="Bijv. Weinlokal Stern"
              value={d.restaurant} onChange={(e) => setD({ ...d, restaurant: e.target.value })} />
          </label>
          <label htmlFor="f-date">
            Datum
            <input id="f-date" name="datum" type="date" required value={d.datum} onChange={(e) => setD({ ...d, datum: e.target.value })} />
          </label>
          <label htmlFor="f-lid">
            Lid
            <input id="f-lid" name="lid" list="lidList" required autoComplete="off" placeholder="Je naam"
              value={d.lid} onChange={(e) => setD({ ...d, lid: e.target.value })} />
          </label>
        </div>
        <datalist id="restList">{restaurants.map((r) => <option key={r} value={r} />)}</datalist>
        <datalist id="lidList">{members.map((m) => <option key={m} value={m} />)}</datalist>

        <div className="grades">
          {CATEGORIES.map((c) => (
            <div className="grade" key={c.key}>
              <div className="gl">
                <b>{c.name} <span className="note">· {Math.round(c.weight * 100)}%</span></b>
                <small>{c.description}</small>
              </div>
              <div className="stepper">
                <button type="button" aria-label={`${c.name} omlaag`} onClick={() => step(c.key, -0.5)}>−</button>
                <input id={`g-${c.key}`} name={c.key} inputMode="decimal" aria-label={`${c.name} cijfer`} placeholder="–"
                  value={d.grades[c.key]} onChange={(e) => setD({ ...d, grades: { ...d.grades, [c.key]: e.target.value } })} />
                <button type="button" aria-label={`${c.name} omhoog`} onClick={() => step(c.key, 0.5)}>+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="live">
          <div>
            <strong>Persoonlijke Flipper-score</strong>
            <div className="note">Gewogen gemiddelde, 1 decimaal</div>
          </div>
          <span className={`score ${live == null ? "s-ok" : scoreClass(live)}`}>{live == null ? "–" : formatScore(live)}</span>
        </div>

        <label htmlFor="f-best">
          Beste gerecht
          <input id="f-best" name="beste_gerecht" autoComplete="off" value={d.beste_gerecht} onChange={(e) => setD({ ...d, beste_gerecht: e.target.value })} />
        </label>
        <label htmlFor="f-beter">
          Wat kon beter?
          <textarea id="f-beter" name="wat_kon_beter" value={d.wat_kon_beter} onChange={(e) => setD({ ...d, wat_kon_beter: e.target.value })} />
        </label>
        <label htmlFor="f-eind">
          Eindreactie
          <textarea id="f-eind" name="eindreactie" value={d.eindreactie} onChange={(e) => setD({ ...d, eindreactie: e.target.value })} />
        </label>

        <div className="btns">
          <SaveButton editing={editing} />
          <button type="button" onClick={() => { setD(emptyDraft()); onReset(); }}>Leegmaken</button>
        </div>
        {result && <p className={`toast ${result.ok ? "" : "err"}`} role="status">{result.message}</p>}
      </form>
    </section>
  );
}

/* ---------------- Uitleg ---------------- */

function Explanation() {
  return (
    <section>
      <h2>Zo werkt het</h2>
      <ol className="steps">
        <li>Na het restaurant voert ieder lid één stem in via <a href="#stemmen">Stem invoeren</a>.</li>
        <li>Geef voor elk van de vijf categorieën een cijfer van 1 t/m 10 (halve en tiende punten mogen).</li>
        <li>De persoonlijke Flipper-score wordt automatisch berekend.</li>
        <li>Een nieuw restaurant verschijnt vanzelf in de ranglijst bij de eerste stem.</li>
        <li>De gezamenlijke gemiddelden en De Flipper-score worden direct bijgewerkt.</li>
        <li>De ranglijst staat altijd gesorteerd op De Flipper-score, van hoog naar laag.</li>
      </ol>
      <div className="tbl">
        <table>
          <thead>
            <tr><th>Categorie</th><th>Weging</th><th>Waar kijk je naar?</th></tr>
          </thead>
          <tbody>
            {CATEGORIES.map((c) => (
              <tr key={c.key}><td>{c.name}</td><td className="w">{Math.round(c.weight * 100)}%</td><td>{c.description}</td></tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td><strong>Totaal</strong></td><td className="w">100%</td><td>Gewogen eindscore van 1,0 tot 10,0.</td></tr>
          </tfoot>
        </table>
      </div>
      <p className="note">
        De Flipper-score van een restaurant is het gemiddelde van de persoonlijke scores. Ieder lid heeft één stem per
        restaurant: vul je opnieuw in, dan vervangt dat je vorige stem.
      </p>
    </section>
  );
}
