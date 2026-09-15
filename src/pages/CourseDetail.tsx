import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import type { Course, Module, Lesson } from "../types";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CourseDetail() {
  const { courseSlug } = useParams();
  const { session, user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<(Module & { lessons: Lesson[] })[]>([]);
  const [owned, setOwned] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("slug", courseSlug)
        .eq("status", "published")
        .single();
      if (!courseData) return;
      setCourse(courseData as Course);

      const { data: moduleData } = await supabase
        .from("modules")
        .select("*, lessons(*)")
        .eq("course_id", courseData.id)
        .order("position");
      setModules((moduleData as any) ?? []);

      if (user) {
        const { data: enrollment } = await supabase
          .from("enrollments")
          .select("id")
          .eq("user_id", user.id)
          .eq("course_id", courseData.id)
          .eq("status", "active")
          .maybeSingle();
        setOwned(!!enrollment);
      }
    })();
  }, [courseSlug, user?.id]);

  async function handleBuyNow() {
    if (!course) return;
    if (!session) {
      navigate("/login", { state: { from: `/courses/${course.slug}` } });
      return;
    }

    setBuying(true);
    setError(null);
    setStatusMsg(null);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error("Could not load the payment SDK. Check your connection.");

      // 1. Ask OUR backend to create the order. We send only the course id —
      //    the price is looked up server-side from the database.
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ courseId: course.id }),
      });
      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error || "Could not start checkout");

      // 2. Open Razorpay Checkout using the order it created.
      const rzp = new window.Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "BS Creation",
        description: orderData.courseTitle,
        order_id: orderData.razorpayOrderId,
        prefill: { email: user?.email ?? "" },
        theme: { color: "#3a56e8" },
        handler: async (response: any) => {
          setStatusMsg("Payment received — verifying...");
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");
            setStatusMsg("Payment Successful — Course Unlocked!");
            setOwned(true);
            setTimeout(() => navigate("/dashboard"), 1200);
          } catch (e: any) {
            setStatusMsg(
              "Payment is being verified. If this takes more than a few minutes, check your dashboard or contact support."
            );
          }
        },
        modal: {
          ondismiss: () => setBuying(false),
        },
      });
      rzp.open();
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setBuying(false);
    }
  }

  if (!course) {
    return <div className="mx-auto max-w-4xl px-4 py-20 text-slate-500">Loading course…</div>;
  }

  const hasDiscount = course.discount_price != null && course.discount_price < course.price;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="grid gap-10 md:grid-cols-3">
        <div className="md:col-span-2">
          <h1 className="text-3xl font-bold text-slate-900">{course.title}</h1>
          <p className="mt-3 text-slate-600">{course.description}</p>

          <div className="mt-6 flex gap-4 text-sm text-slate-500">
            {course.instructor_name && <span>Instructor: {course.instructor_name}</span>}
            {course.duration && <span>· {course.duration}</span>}
            {course.level && <span>· {course.level}</span>}
          </div>

          <h2 className="mt-10 text-xl font-semibold text-slate-900">Course Content</h2>
          <div className="mt-4 space-y-3">
            {modules.map((m) => (
              <div key={m.id} className="rounded-xl border border-slate-200 p-4">
                <div className="font-medium text-slate-900">{m.title}</div>
                <ul className="mt-2 space-y-1 text-sm text-slate-500">
                  {(m.lessons ?? [])
                    .sort((a, b) => a.position - b.position)
                    .map((l) => (
                      <li key={l.id}>· {l.title}</li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 p-6 shadow-sm md:sticky md:top-24 md:h-fit">
          <div className="aspect-video overflow-hidden rounded-xl bg-slate-100">
            {course.thumbnail_url && (
              <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
            )}
          </div>

          <div className="mt-4">
            {hasDiscount ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {course.currency} {course.discount_price}
                </span>
                <span className="text-slate-400 line-through">{course.currency} {course.price}</span>
              </div>
            ) : (
              <span className="text-2xl font-bold text-slate-900">
                {course.currency} {course.price}
              </span>
            )}
          </div>

          {owned ? (
            <>
              <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                You Own This Course
              </p>
              <button
                onClick={() => navigate(`/learn/${course.id}`)}
                className="mt-3 w-full rounded-full bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Start Learning
              </button>
            </>
          ) : (
            <button
              onClick={handleBuyNow}
              disabled={buying}
              className="mt-4 w-full rounded-full bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {buying ? "Starting checkout…" : "Buy Now"}
            </button>
          )}

          {!session && !owned && (
            <p className="mt-2 text-center text-xs text-slate-400">You'll be asked to log in first.</p>
          )}
          {statusMsg && <p className="mt-3 text-sm text-slate-600">{statusMsg}</p>}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </aside>
      </div>
    </div>
  );
}
