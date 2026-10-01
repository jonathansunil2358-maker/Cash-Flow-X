import { challengeField, FIXED_MONTHS, formatGBP, INDUSTRIES, isValidChallengeCode, type GameState } from '@cfx/engine';
import { useEffect, useState } from 'react';
import { EntryList, StartConfirm } from '../components/FixedBits';
import { Button, Card, KeyValue, StatusPill, TextInput } from '../components/ui';
import { useAccount } from '../lib/account';
import { api, ApiError, ONLINE, type ChallengeView } from '../lib/api';
import { readPref, writePref } from '../lib/save';
import { useGame } from '../store';

export const CHALLENGE_PREF = 'challenge';
export const challengeLink = (code: string): string => `${window.location.origin}/?challenge=${code}`;

/** Challenge a friend: one code, one company, one attempt each, a private board. */
export function ChallengeCard({ game }: { game: GameState }) {
  const { start, save, toast } = useGame();
  const signedIn = !!useAccount((s) => s.me);
  const online = ONLINE && signedIn;
  const [code, setCode] = useState(() => readPref(CHALLENGE_PREF) ?? '');
  const [view, setView] = useState<ChallengeView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'ranked' | 'practice' | null>(null);
  const [busy, setBusy] = useState(false);
  const valid = isValidChallengeCode(code.toUpperCase());
  const playing = game.scenarioId === 'challenge' && game.status === 'playing';

  const load = async (c: string) => {
    setError(null);
    try {
      setView(await api.challenge(c.toUpperCase()));
      writePref(CHALLENGE_PREF, c.toUpperCase());
    } catch (e) {
      setView(null);
      setError((e as ApiError).message);
    }
  };
  useEffect(() => { if (online && valid) void load(code); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [online, game.status, game.month]);

  const make = async () => {
    setBusy(true);
    try {
      const r = await api.createChallenge();
      setCode(r.code);
      await load(r.code);
      await share(r.code);
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const share = async (c: string) => {
    const url = challengeLink(c);
    const text = `I challenge you to Cash Flow X: same company, same luck, 24 months. Code ${c}`;
    try {
      if (navigator.share) { await navigator.share({ title: 'Cash Flow X challenge', text, url }); return; }
    } catch { /* cancelled: fall back to copying */ }
    try { await navigator.clipboard.writeText(`${text}\n${url}`); toast('success', 'Challenge link copied. Send it to a friend.'); } catch { toast('error', `Copy this link: ${url}`); }
  };

  const field = view ? view.challenge : valid ? (() => { const f = challengeField(code.toUpperCase()); return { seed: f.seed, industryId: f.industryId, companyName: f.companyName, months: f.months }; })() : null;
  const go = (practice: boolean, saveFirst: boolean) => {
    if (!field) return;
    if (saveFirst) save('3');
    setConfirm(null);
    void start({ companyName: field.companyName, industryId: field.industryId, seed: field.seed, scenarioId: 'challenge', difficulty: 'medium', equipmentFinance: 'buy', icon: 'rocket', practice, challengeCode: code.toUpperCase() });
  };
  const me = view?.me ?? null;
  const ind = field ? INDUSTRIES[field.industryId] : null;

  return (
    <Card id="card-challenge" title="Challenge a friend"
      subtitle={`Make a code and send it. Everyone with it plays the same company for ${FIXED_MONTHS} months, once, and you compare your final stakes on a private board.`}>
      <div className="space-y-3">
        {online && <Button variant="primary" disabled={busy || playing} onClick={make}>{busy ? 'Making a code…' : 'Make a challenge and share it'}</Button>}
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-xs font-black tracking-wider text-ink-2" htmlFor="challenge-code">HAVE A CODE?
            <TextInput id="challenge-code" value={code} maxLength={6} className="mt-1 w-36 uppercase" placeholder="ABC234"
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setView(null); setError(null); }} />
          </label>
          <Button disabled={!valid || !online} onClick={() => load(code)}>Look it up</Button>
        </div>
        {!online && ONLINE && <p className="text-xs text-muted">Sign in to make or join a challenge.</p>}
        {error && <p role="alert" className="text-sm font-bold text-critical-text">{error}</p>}
        {view && ind && (
          <>
            <div className="flex items-center gap-3 rounded-lg border border-line p-3">
              <span className="text-3xl" aria-hidden>{ind.emoji}</span>
              <div className="min-w-0">
                <div className="font-display text-lg leading-tight">{view.challenge.companyName}</div>
                <div className="text-xs text-ink-2">From {view.creator} · {ind.name} · code {view.code}{view.expired ? ' · expired' : ''}</div>
              </div>
              <Button className="ml-auto" onClick={() => share(view.code)}>Share</Button>
            </div>
            {playing && <p className="text-sm font-bold">You are playing it now: month {game.month} of {FIXED_MONTHS}.</p>}
            {me?.finished && <KeyValue rows={[['Your result', me.status === 'insolvent' ? 'Went bust' : formatGBP(me.score, { compact: true })], ['Your rank', me.rank ? `#${me.rank}` : '—']]} />}
            {confirm ? (
              <StartConfirm label="Start the challenge" ranked={confirm === 'ranked'} onCancel={() => setConfirm(null)} onGo={(s) => go(confirm === 'practice', s)} />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {!me && !view.expired && <Button variant="primary" disabled={playing} onClick={() => setConfirm('ranked')}>Play this challenge</Button>}
                <Button variant={!me && !view.expired ? 'secondary' : 'primary'} disabled={playing} onClick={() => setConfirm('practice')}>Practise (not ranked)</Button>
              </div>
            )}
            <div>
              <h3 className="mb-1 text-sm font-bold">Board</h3>
              {view.entries.length === 0 ? <p className="text-xs text-ink-2">Nobody has finished yet.</p> : <EntryList entries={view.entries} max={10} />}
              {me && !me.finished && <div className="mt-1"><StatusPill kind="warn" label="Your run is not finished" /></div>}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
