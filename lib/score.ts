export type CategoryKey = "eten" | "service" | "sfeer" | "prijs" | "hygiene";

export const CATEGORIES: {
  key: CategoryKey;
  name: string;
  short: string;
  weight: number;
  description: string;
}[] = [
  { key: "eten", name: "Eten & drinken", short: "Eten", weight: 0.35, description: "Kwaliteit, smaak, presentatie, temperatuur, portionering en dranken." },
  { key: "service", name: "Service", short: "Service", weight: 0.2, description: "Gastvrijheid, kennis, snelheid, aandacht en professionaliteit." },
  { key: "sfeer", name: "Sfeer & uitstraling", short: "Sfeer", weight: 0.2, description: "Interieur, muziek, verlichting, gezelligheid en algemene beleving." },
  { key: "prijs", name: "Prijs & kwaliteit", short: "Prijs", weight: 0.15, description: "Of prijsniveau, porties, kwaliteit en totale ervaring in verhouding staan." },
  { key: "hygiene", name: "Hygiëne & verzorging", short: "Hygiëne", weight: 0.1, description: "Restaurant, tafels, servies, toiletten en algemene verzorging." },
];

export type Vote = {
  id: string;
  member_id: string;
  restaurant: string;
  datum: string;
  lid: string;
  eten: number;
  service: number;
  sfeer: number;
  prijs: number;
  hygiene: number;
  beste_gerecht: string | null;
  wat_kon_beter: string | null;
  eindreactie: string | null;
};

/** Afronden op 1 decimaal, zoals ROUND(x;1) in Excel (met marge voor floats). */
export const round1 = (x: number) => Math.round((x + 1e-9) * 10) / 10;

/** Persoonlijke Flipper-score: gewogen gemiddelde, 1 decimaal. */
export function personalScore(v: Pick<Vote, CategoryKey>): number {
  return round1(CATEGORIES.reduce((sum, c) => sum + v[c.key] * c.weight, 0));
}

export type RestaurantRanking = {
  key: string;
  name: string;
  lastDate: string;
  votes: Vote[];
  score: number;
} & Record<CategoryKey, number>;

/** Ranglijst: gemiddelden per restaurant, gesorteerd op De Flipper-score. */
export function rank(votes: Vote[]): RestaurantRanking[] {
  const groups = new Map<string, Vote[]>();
  for (const v of votes) {
    const key = v.restaurant.trim().toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), v]);
  }
  const list = [...groups.entries()].map(([key, vs]) => {
    const avg = (f: (v: Vote) => number) => round1(vs.reduce((s, v) => s + f(v), 0) / vs.length);
    const row = {
      key,
      name: vs[0].restaurant.trim(),
      lastDate: vs.map((v) => v.datum).sort().at(-1) ?? "",
      votes: [...vs].sort((a, b) => personalScore(b) - personalScore(a)),
      score: avg(personalScore),
    } as RestaurantRanking;
    for (const c of CATEGORIES) row[c.key] = avg((v) => v[c.key]);
    return row;
  });
  return list.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "nl"));
}

export const formatScore = (x: number) => round1(x).toFixed(1).replace(".", ",");

export const scoreClass = (x: number) => (x >= 8 ? "s-good" : x >= 7 ? "s-ok" : "s-low");

const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
export function formatDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${Number(day)} ${MONTHS[Number(m) - 1]} ${y}`;
}
