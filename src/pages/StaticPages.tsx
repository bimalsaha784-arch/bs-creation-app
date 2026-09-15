import type { ReactNode } from "react";

function StaticPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
      <div className="mt-6 space-y-4 text-slate-600">{children}</div>
    </div>
  );
}

export function About() {
  return (
    <StaticPage title="About BS Creation">
      <p>
        BS Creation is an online education platform focused on practical, structured courses.
        We're a small team building courses we'd want to take ourselves — clear, focused, and
        built around real skills rather than vague promises.
      </p>
      <p>Replace this placeholder copy with your own story before launch.</p>
    </StaticPage>
  );
}

export function Contact() {
  return (
    <StaticPage title="Contact Us">
      <p>Have a question about a course or your account? Reach us at:</p>
      <p className="font-medium text-slate-900">support@bscreation.example</p>
      <p>Replace this with your real support email and, if useful, a contact form.</p>
    </StaticPage>
  );
}

export function FAQ() {
  const faqs = [
    { q: "How do I access a course after purchase?", a: "Go to your Dashboard and click Start Learning on the course card." },
    { q: "Can I get a refund?", a: "See our Refund Policy page for the current policy." },
    { q: "Do I need an account to browse courses?", a: "No — browsing is open to everyone. You'll need an account to purchase or start learning." },
  ];
  return (
    <StaticPage title="Frequently Asked Questions">
      {faqs.map((f) => (
        <div key={f.q}>
          <div className="font-medium text-slate-900">{f.q}</div>
          <div className="text-slate-600">{f.a}</div>
        </div>
      ))}
    </StaticPage>
  );
}

export function PrivacyPolicy() {
  return (
    <StaticPage title="Privacy Policy">
      <p>
        This is placeholder content. Before launch, replace this page with a privacy policy that
        accurately reflects what BS Creation collects (account info, payment metadata via Razorpay,
        course progress) and how it is stored and used. Do not publish claims of legal compliance
        certifications you have not verified.
      </p>
    </StaticPage>
  );
}

export function Terms() {
  return (
    <StaticPage title="Terms of Service">
      <p>
        This is placeholder content. Replace with your actual terms covering account use, course
        licensing (courses are for personal, non-transferable use), and acceptable use of the
        platform.
      </p>
    </StaticPage>
  );
}

export function RefundPolicy() {
  return (
    <StaticPage title="Refund Policy">
      <p>
        This is placeholder content. Define your actual refund window and conditions here (for
        example: "Refunds may be requested within 7 days of purchase provided less than 20% of the
        course has been completed"). Whatever you decide, make sure the enrollment `status`
        transition to `refunded` in the admin panel matches this policy.
      </p>
    </StaticPage>
  );
}
