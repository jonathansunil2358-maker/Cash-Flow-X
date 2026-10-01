import { useEffect, useRef, useState } from 'react';
import { useAccount } from '../lib/account';
import { DEV_AUTH, GOOGLE_CLIENT_ID } from '../lib/api';
import { CURRENCY_ICONS } from '../lib/icons';

interface GoogleId {
  accounts: {
    id: {
      initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    };
  };
}
declare global {
  interface Window {
    google?: GoogleId;
  }
}

/** Load Google Identity Services once. */
function loadGis(): Promise<GoogleId> {
  if (window.google) return Promise.resolve(window.google);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => (window.google ? resolve(window.google) : reject(new Error('Google sign-in failed to load.')));
    s.onerror = () => reject(new Error('Google sign-in failed to load. Check your connection or ad blocker.'));
    document.head.appendChild(s);
  });
}

export function SignIn() {
  const { status, error, signInWithGoogle, signInDev } = useAccount();
  const button = useRef<HTMLDivElement>(null);
  const [gisError, setGisError] = useState<string | null>(null);
  const [devName, setDevName] = useState('');

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !button.current) return;
    let live = true;
    loadGis()
      .then((g) => {
        if (!live || !button.current) return;
        g.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (r) => void signInWithGoogle(r.credential) });
        g.accounts.id.renderButton(button.current, { theme: 'filled_blue', size: 'large', shape: 'pill', text: 'continue_with', width: 280 });
      })
      .catch((e: Error) => live && setGisError(e.message));
    return () => { live = false; };
  }, [signInWithGoogle]);

  return (
    <div className="mx-auto flex min-h-screen max-w-[520px] flex-col justify-center gap-5 px-4 py-10">
      <div className="flex items-center gap-2">
        <img src="/icon.svg" alt="" className="h-12 w-12" />
        <span className="font-display text-3xl text-on-sky">Cash Flow X</span>
      </div>
      <h1 className="cfx-stroked text-5xl leading-[0.95]">Build it. Grow it. Don't run out of cash.</h1>
      <section className="cfx-panel !pt-8">
        <div className="cfx-panel__ribbon">Sign in to play</div>
        <p className="text-sm font-bold">Your account keeps your Legacy points, perks and prestiges safe, lets you join a holding company, and puts your verified results on the leaderboards.</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          <li className="flex items-center gap-2"><img src={CURRENCY_ICONS.legacy} alt="" className="h-6 w-6" />Prestige progress follows you between devices</li>
          <li className="flex items-center gap-2"><img src={CURRENCY_ICONS.gem} alt="" className="h-6 w-6" />Weekly goals and season rewards</li>
          <li className="flex items-center gap-2"><img src={CURRENCY_ICONS.coin} alt="" className="h-6 w-6" />Invest in your friends' companies</li>
        </ul>
        <div className="mt-5 flex min-h-[44px] justify-center">
          {status === 'loading' ? <span className="font-display text-lg">Signing you in…</span> : GOOGLE_CLIENT_ID ? <div ref={button} /> : null}
        </div>
        {!GOOGLE_CLIENT_ID && !DEV_AUTH && <p className="mt-2 text-center text-sm font-bold text-critical-text">Google sign-in isn't configured for this build (VITE_GOOGLE_CLIENT_ID).</p>}
        {(error || gisError) && <p role="alert" className="mt-3 text-center text-sm font-bold text-critical-text">{error ?? gisError}</p>}
        <p className="mt-3 text-center text-xs text-ink-2">We only store your Google account ID and first name. No email, no contacts.</p>
      </section>
      {DEV_AUTH && (
        <form className="cfx-panel !p-3.5" onSubmit={(e) => { e.preventDefault(); if (devName.trim()) void signInDev(devName.trim()); }}>
          <div className="font-display text-lg">Developer sign-in</div>
          <p className="text-xs text-ink-2">Local testing only (the server has DEV_AUTH=true). Each name is its own account.</p>
          <div className="mt-2 flex gap-2">
            <input aria-label="Player name" value={devName} maxLength={24} onChange={(e) => setDevName(e.target.value)} placeholder="Player name"
              className="min-w-0 flex-1 rounded-2xl border-[3px] border-outline bg-surface-2 px-3 py-2 font-extrabold text-ink" />
            <button type="submit" className="cfx-btn is-sm">Sign in</button>
          </div>
        </form>
      )}
    </div>
  );
}
