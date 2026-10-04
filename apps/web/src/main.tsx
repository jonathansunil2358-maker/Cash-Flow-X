import { ErrorBoundary } from './components/ErrorBoundary';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { applyAccess } from './lib/access';
applyAccess();
import { isValidChallengeCode } from '@cfx/engine';
import { writePref } from './lib/save';

// A challenge link (/?challenge=CODE) is remembered before sign-in, then offered once the player is in.
try {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('challenge')?.toUpperCase();
  if (code && isValidChallengeCode(code)) writePref('challenge', code);
  if (url.searchParams.has('challenge')) {
    url.searchParams.delete('challenge');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
} catch {
  /* a malformed URL just means no deep link */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Installable PWA (production builds only, so the dev server is never cached).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline support is optional */
    });
  });
}
