import { useEffect, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { formatPrice } from "../lib/format";

export function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile?.id]);

  useEffect(() => {
    if (!user) return;
    // Same payment history query the dashboard used before.
    supabase
      .from("payments")
      .select("id, amount, currency, status, created_at, courses(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPayments(data ?? []);
        setLoadingPayments(false);
      });
  }, [user?.id]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMsg(null);
    // Only name and phone — the database policy prevents changing role.
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() || null, phone: phone.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) setMsg({ ok: false, text: "Couldn't save your details. Please try again." });
    else {
      setMsg({ ok: true, text: "Details saved." });
      refreshProfile();
    }
  }

  const statusCls = (s: string) =>
    s === "captured" || s === "verified" || s === "paid"
      ? "bg-brand-50 text-brand-700"
      : s === "failed"
      ? "bg-red-50 text-red-700"
      : s === "refunded"
      ? "bg-marigold-50 text-marigold-600"
      : "bg-paper text-ink/60";

  return (
    <div className="page max-w-4xl py-10 sm:py-12">
      <h1 className="font-display text-3xl font-extrabold">Profile</h1>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold">Your details</h2>
        <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pname" className="label">Full name</label>
            <input id="pname" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" autoComplete="name" />
          </div>
          <div>
            <label htmlFor="pphone" className="label">Phone (optional)</label>
            <input id="pphone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" autoComplete="tel" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Email</label>
            <div className="flex min-h-[46px] items-center rounded-xl border border-line bg-paper px-4 text-[15px] text-ink/70">{user?.email}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save details"}</button>
            {msg && <span className={`text-sm ${msg.ok ? "text-brand-700" : "text-red-700"}`} role="status">{msg.text}</span>}
          </div>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Payment history</h2>
        {loadingPayments ? (
          <div className="mt-4 h-24 animate-pulse rounded-2xl bg-brand-50" />
        ) : payments.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-line bg-white p-6 text-center text-ink/60">
            No payments yet. <Link to="/courses" className="font-semibold text-brand-700">Browse courses</Link>
          </div>
        ) : (
          <>
            {/* Mobile: stacked list */}
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white sm:hidden">
              {payments.map((p) => (
                <li key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium">{p.courses?.title ?? "—"}</span>
                    <span className="font-semibold">{formatPrice(p.amount, p.currency)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-sm text-ink/55">
                    <span>{new Date(p.created_at).toLocaleDateString("en-IN")}</span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${statusCls(p.status)}`}>{p.status}</span>
                  </div>
                </li>
              ))}
            </ul>
            {/* Desktop: table */}
            <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-line bg-white sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-paper text-ink/55">
                  <tr>
                    <th className="px-5 py-3 font-medium">Course</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t border-line">
                      <td className="px-5 py-3.5 font-medium">{p.courses?.title ?? "—"}</td>
                      <td className="px-5 py-3.5">{formatPrice(p.amount, p.currency)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${statusCls(p.status)}`}>{p.status}</span>
                      </td>
                      <td className="px-5 py-3.5 text-ink/65">{new Date(p.created_at).toLocaleDateString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6">
        <Link to="/dashboard" className="btn-secondary">Back to dashboard</Link>
        {profile?.role === "admin" && <Link to="/admin" className="btn-secondary">Admin panel</Link>}
        <button onClick={async () => { await signOut(); navigate("/"); }} className="btn-ghost text-red-700 hover:bg-red-50 hover:text-red-700">
          Sign out
        </button>
      </div>
    </div>
  );
}
