import { AuthForm } from "@/components/auth-form";
export default function Reset() {
  return (
    <main id="main" className="auth-form-wrap" style={{ minHeight: "100vh" }}>
      <AuthForm recovery />
    </main>
  );
}
