# Eetclub De Flipper

Online ranglijst voor Eetclub De Flipper. Leden geven na elk etentje een
cijfer van 1 t/m 10 voor vijf categorieën; de app berekent de persoonlijke
Flipper-score en de gezamenlijke ranglijst. Gebaseerd op de Excel
`Eetclub_De_Flipper_beoordeling.xlsx`.

## Weging

| Categorie            | Weging |
|----------------------|--------|
| Eten & drinken       | 35%    |
| Service              | 20%    |
| Sfeer & uitstraling  | 20%    |
| Prijs & kwaliteit    | 15%    |
| Hygiëne & verzorging | 10%    |

- Persoonlijke score = gewogen gemiddelde, afgerond op 1 decimaal.
- De Flipper-score van een restaurant = gemiddelde van de persoonlijke scores.
- Ieder lid heeft één stem per restaurant; opnieuw invullen vervangt de oude stem.

## Toegang

Geen accounts: leden vullen één keer een gedeelde **clubcode** in
(`CLUB_CODE`). De browser onthoudt dat een jaar lang. Wijzig je de code,
dan moet iedereen de nieuwe code invullen. De database is alleen via de
server bereikbaar (Row Level Security staat aan, zonder publieke policies).

## Stack

- Next.js (App Router) + TypeScript
- Supabase (Postgres) als database
- Deploy op Vercel

## Online zetten

1. **Supabase**: maak een (gratis) project aan op supabase.com. Open de
   SQL Editor, plak de inhoud van `supabase/migrations/0001_init.sql` en
   klik Run. Dit maakt de tabel aan en zet de stemmen uit de Excel erin.
2. **Sleutels**: Supabase → Project Settings → API. Noteer de Project URL
   en de `service_role` key.
3. **Vercel**: Add New → Project → importeer deze repository. Zet bij
   Environment Variables:
   - `SUPABASE_URL` = de Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = de service_role key
   - `CLUB_CODE` = de code die de leden gaan gebruiken
4. Deploy. Je krijgt een adres als `eetclub-de-flipper.vercel.app`; onder
   Settings → Domains kun je een eigen domein koppelen.

## Lokaal draaien

```bash
cp .env.example .env.local   # en vul de waarden in
npm install
npm run dev
```
