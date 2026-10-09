import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** When this value changes (e.g. the URL path), a crashed page gets another chance. */
  resetKey?: string;
}
interface State {
  error: Error | null;
}

/**
 * Safety net: if any component throws while rendering, show a friendly message
 * instead of a blank white page. Used twice:
 *  - inside Layout, around the page content, so the navbar stays usable and
 *    moving to another page clears the error;
 *  - around the whole app in App.tsx, as a last resort.
 *
 * Plain <a> links are used on purpose — the crash may have broken the router.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Shows up in the browser console (and in any error-tracking tool added later).
    console.error("Page crashed:", error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center" role="alert">
        <h1 className="font-display text-2xl font-bold text-ink">Something went wrong</h1>
        <p className="mt-3 text-ink/65">
          This page hit an unexpected problem. Your account and purchases are safe. Please reload the page, and if it
          keeps happening, contact support.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => window.location.reload()} className="btn-primary">
            Reload page
          </button>
          <a href="/" className="btn-secondary">
            Go to home
          </a>
        </div>
      </div>
    );
  }
}
