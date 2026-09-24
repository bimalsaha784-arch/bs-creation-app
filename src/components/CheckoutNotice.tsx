/** Floating status for checkout started from a course card, so it's visible wherever the card was on the page. */
export function CheckoutNotice({ error, status }: { error: string | null; status: string | null }) {
  const msg = error || status;
  if (!msg) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4" role="status" aria-live="polite">
      <p
        className={`pointer-events-auto max-w-md rounded-xl px-4 py-3 text-sm font-medium shadow-lift ${
          error ? "bg-red-700 text-white" : "bg-brand-800 text-white"
        }`}
      >
        {msg}
      </p>
    </div>
  );
}
