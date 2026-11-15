"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login } from "@/app/login/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="primary" disabled={pending}>
      {pending ? "Controleren…" : "Naar binnen"}
    </button>
  );
}

export default function LoginForm() {
  const [error, action] = useFormState(login, null);
  return (
    <form action={action} className="card form">
      <label htmlFor="code">
        Clubcode
        <input id="code" name="code" type="password" autoComplete="current-password" required autoFocus />
      </label>
      <Submit />
      {error && <p className="toast err" role="alert">{error}</p>}
    </form>
  );
}
