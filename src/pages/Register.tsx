import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { AuthShell, GoogleButton, OrDivider } from "../components/AuthShell";

export function Register() {
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      navigate("/dashboard");
    } else {
      setNotice("Check your email to confirm your account, then log in.");
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Free to sign up. You only pay for the courses you choose.">
      <GoogleButton onClick={signInWithGoogle} />
      <OrDivider />
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label htmlFor="name" className="label">Full name</label>
          <input id="name" required autoComplete="name" value={fullName}
            onChange={(e) => setFullName(e.target.value)} className="input" />
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" required autoComplete="email" inputMode="email" value={email}
            onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" type="password" required minLength={8} autoComplete="new-password" value={password}
            onChange={(e) => setPassword(e.target.value)} className="input" placeholder="At least 8 characters" />
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
        {notice && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800" role="status">{notice}</p>}
        <button type="submit" disabled={loading} className="btn-primary h-12 w-full text-base">
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink/60">
        Already have an account? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
