import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Last line of defence: if something throws while drawing the screen, show what happened and how to carry on
 * instead of leaving a blank page. Nothing here touches your saved companies.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  override componentDidCatch(error: Error, info: ErrorInfo) { console.error('Cash Flow X crashed', error, info.componentStack); }
  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const reload = () => window.location.reload();
    const reset3d = () => { try { localStorage.setItem('cfx:pref:scene3d', 'false'); } catch { /* ignore */ } window.location.reload(); };
    const resetPrefs = () => {
      try { Object.keys(localStorage).filter((k) => k.startsWith('cfx:pref:')).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
      window.location.reload();
    };
    return (
      <div role="alert" className="mx-auto mt-16 max-w-[520px] rounded-[26px] border-[3px] border-outline bg-surface p-5 shadow-[var(--edge)]">
        <h1 className="font-display text-2xl">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-2">The game hit a problem while drawing this screen. Your saved companies and account are safe. Try reloading; if it keeps happening, use one of the other buttons.</p>
        <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-surface-2 p-2 text-xs">{String(error.message).slice(0, 400)}</pre>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="cfx-btn is-go" onClick={reload}>Reload</button>
          <button type="button" className="cfx-btn is-soft" onClick={reset3d}>Turn off the 3D island and reload</button>
          <button type="button" className="cfx-btn is-soft" onClick={resetPrefs}>Reset my settings and reload</button>
        </div>
      </div>
    );
  }
}

/** For the 3D scene alone: if it cannot start (for example no WebGL), carry on without it. */
export class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch(error: Error) { console.error('3D scene failed', error); try { localStorage.setItem('cfx:pref:scene3d', 'false'); } catch { /* ignore */ } }
  override render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
