"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { identify, logout } from "@/app/actions";

type M = { id: string; name: string; hasPin: boolean };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="primary" disabled={pending}>
      {pending ? "Even geduld…" : label}
    </button>
  );
}

export default function IdentifyForm({ members }: { members: M[] }) {
  const [choice, setChoice] = useState("");
  const [result, action] = useFormState(identify, null);
  const chosen = members.find((m) => m.id === choice);
  const isNew = choice === "__nieuw__";
  const setsPin = isNew || (chosen && !chosen.hasPin);

  return (
    <main className="wrap narrow">
      <header className="masthead">
        <div className="mast-row">
          <span className="eyebrow">Eetclub</span>
          <form action={logout}><button type="submit" className="link">Uitloggen</button></form>
        </div>
        <h1>Wie ben jij?</h1>
        <p className="sub">Kies je naam en vul je pincode in. Zo kun alleen jij je eigen stemmen aanpassen. Deze browser onthoudt je daarna.</p>
      </header>

      <form action={action} className="card form">
        <label htmlFor="member">
          Naam
          <select id="member" name="member" required value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="" disabled>Kies je naam…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
            <option value="__nieuw__">Ik sta er niet bij (nieuw lid)</option>
          </select>
        </label>

        {isNew && (
          <label htmlFor="new_name">
            Je naam
            <input id="new_name" name="new_name" autoComplete="given-name" required maxLength={40} />
          </label>
        )}

        {choice && (
          <>
            {setsPin && (
              <p className="banner">
                {isNew ? "Kies een pincode van 4 tot 8 cijfers." : `${chosen!.name} heeft nog geen pincode. Kies er nu een van 4 tot 8 cijfers.`}{" "}
                Onthoud hem goed: je hebt hem nodig op een andere telefoon of computer.
              </p>
            )}
            <label htmlFor="pin">
              {setsPin ? "Nieuwe pincode" : "Pincode"}
              <input id="pin" name="pin" type="password" inputMode="numeric" pattern="\d{4,8}" autoComplete={setsPin ? "new-password" : "current-password"} required />
            </label>
            {setsPin && (
              <label htmlFor="pin2">
                Herhaal pincode
                <input id="pin2" name="pin2" type="password" inputMode="numeric" pattern="\d{4,8}" autoComplete="new-password" required />
              </label>
            )}
            <Submit label={setsPin ? "Pincode instellen" : "Inloggen"} />
          </>
        )}
        {result && <p className={`toast ${result.ok ? "" : "err"}`} role="status">{result.message}</p>}
      </form>
      <p className="note">Pincode vergeten? Vraag de beheerder om hem te wissen; daarna kies je een nieuwe.</p>
    </main>
  );
}
