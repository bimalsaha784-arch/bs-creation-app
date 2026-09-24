import type { ReactNode } from "react";
import { BRAND } from "../config/brand";
import { IconChevronDown } from "../components/Icons";

function StaticPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <section className="border-b border-line bg-white">
        <div className="page max-w-3xl py-10 sm:py-14">
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{title}</h1>
        </div>
      </section>
      <div className="page max-w-3xl space-y-4 py-10 text-[16px] leading-relaxed text-ink/75">{children}</div>
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
      <p><a href={`mailto:${BRAND.supportEmail}`} className="text-lg font-semibold text-brand-700 hover:underline">{BRAND.supportEmail}</a></p>
      <p>Replace this with your real support email and, if useful, a contact form.</p>
    </StaticPage>
  );
}

export function FAQ() {
  const faqs = [
    { q: "How do I access a course after purchase?", a: "Go to your Dashboard. Every course you've bought is listed under My courses — tap Continue learning or Access course." },
    { q: "Can I buy more than one course?", a: "Yes. Buy as many as you like from the same account. Each new course is added to My courses, and the courses you already own stay unlocked." },
    { q: "Where can I find other courses after buying one?", a: "Your Dashboard has an Explore more courses section showing every course you don't own yet. You can also open Courses from the menu at any time." },
    { q: "Can I get a refund?", a: "See our Refund Policy page for the current policy." },
    { q: "Do I need an account to browse courses?", a: "No — browsing is open to everyone. You'll need an account to purchase or start learning." },
  ];
  return (
    <StaticPage title="Frequently asked questions">
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
        {faqs.map((f) => (
          <details key={f.q} className="group">
            <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {f.q}
              <IconChevronDown width={18} height={18} className="shrink-0 text-ink/50 transition-transform group-open:rotate-180" />
            </summary>
            <p className="px-5 pb-5 text-ink/70">{f.a}</p>
          </details>
        ))}
      </div>
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
