import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="wrap narrow">
      <header className="masthead">
        <span className="eyebrow">Eetclub</span>
        <h1>De Flipper</h1>
        <p className="sub">Vul de clubcode in om de ranglijst te zien en te stemmen. Je browser onthoudt hem daarna.</p>
      </header>
      <LoginForm />
    </main>
  );
}
