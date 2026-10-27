import { AuthForm } from "@/components/auth-form";
import { Brand } from "@/components/brand";
export default function Login() {
  return (
    <main id="main" className="auth-page">
      <section className="auth-story">
        <Brand />
        <div>
          <div className="eyebrow" style={{ color: "#bdcbb9" }}>
            A little structure. A lot of possibility.
          </div>
          <h1>
            Good celebrations
            <br />
            begin with
            <br />
            <em>a clear plan.</em>
          </h1>
          <p>
            From the first idea to the last detail, make space for what matters.
          </p>
        </div>
        <small style={{ color: "#bdcbb9" }}>
          Weddings · Birthdays · Community
        </small>
      </section>
      <section className="auth-form-wrap">
        <AuthForm />
      </section>
    </main>
  );
}
