/**
 * Shown when a request fails (bad network, Supabase hiccup). It replaces the
 * "empty" message on purpose: "You don't own any course yet" must never appear
 * just because the internet blinked.
 */
export function LoadError({
  message = "We couldn't load this right now. Please check your internet connection and try again.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center sm:p-8" role="alert">
      <p className="mx-auto max-w-md text-[15px] text-red-800">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-4">
          Try again
        </button>
      )}
    </div>
  );
}
