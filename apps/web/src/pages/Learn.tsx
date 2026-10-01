import {
  answeredToday, auditOf, detectiveOf, formatGBP, learnOf, spotTheMistake, termOf, termSeen, TERMS, utcDay, type GameState,
} from '@cfx/engine';
import { useMemo, useState } from 'react';
import { Button, Card } from '../components/ui';
import { useGame } from '../store';
import { Fold } from './Strategy';

function Choice({ label, state, onPick, disabled }: { label: string; state: 'idle' | 'right' | 'wrong'; onPick: () => void; disabled: boolean }) {
  return (
    <Button variant={state === 'right' ? 'go' : state === 'wrong' ? 'secondary' : 'secondary'} disabled={disabled} aria-pressed={state !== 'idle'} onClick={onPick}
      className={`!justify-start !text-left ${state === 'wrong' ? 'opacity-60 line-through' : ''}`}>
      {state === 'right' ? '✓ ' : state === 'wrong' ? '✗ ' : ''}{label}
    </Button>
  );
}

/** A trial balance with one mistake in it. Which account is wrong? */
export function SpotCard() {
  const { profile, answerPuzzle } = useGame();
  const day = utcDay();
  const puzzle = useMemo(() => spotTheMistake(day), [day]);
  const prior = answeredToday(profile, 'spot', day);
  const [picked, setPicked] = useState<string | null>(null);
  const done = prior.done || picked !== null;
  const pick = (id: string) => { if (done) return; setPicked(id); answerPuzzle('spot', day, id === puzzle.answer); };
  return (
    <Card id="card-spot" title="Spot the mistake" subtitle={puzzle.intro}>
      <table className="w-full text-sm" aria-label="Trial balance">
        <thead><tr className="text-left text-xs text-ink-2"><th scope="col">Account</th><th scope="col" className="text-right">Debit</th><th scope="col" className="text-right">Credit</th></tr></thead>
        <tbody>
          {puzzle.lines.map((l) => (
            <tr key={l.id} className="border-t border-line">
              <td className="py-1">{l.name}</td>
              <td className="tnum text-right">{l.debit ? formatGBP(l.debit) : ''}</td>
              <td className="tnum text-right">{l.credit ? formatGBP(l.credit) : ''}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-line font-black"><td className="py-1">Total</td><td className="tnum text-right">{formatGBP(puzzle.debitTotal)}</td><td className="tnum text-right">{formatGBP(puzzle.creditTotal)}</td></tr>
        </tbody>
      </table>
      <div className="mt-3 grid gap-2 sm:grid-cols-2" role="group" aria-label="Which account is wrong?">
        {puzzle.options.map((o) => (
          <Choice key={o.id} label={o.name} disabled={done} onPick={() => pick(o.id)}
            state={!done ? 'idle' : o.id === puzzle.answer ? 'right' : o.id === picked ? 'wrong' : 'idle'} />
        ))}
      </div>
      {done && (
        <p role="status" className="mt-3 rounded-lg border border-line p-2.5 text-sm">
          <b>{(picked ? picked === puzzle.answer : prior.right) ? 'Right! ' : 'Not quite. '}</b>{puzzle.explain}
          {prior.done && !picked && <span className="block text-xs text-ink-2">You already answered today. A new puzzle arrives tomorrow.</span>}
        </p>
      )}
    </Card>
  );
}

/** A few ratios and a story. What is really wrong with the business? */
export function DetectiveCard() {
  const { profile, answerPuzzle } = useGame();
  const day = utcDay();
  const puzzle = useMemo(() => detectiveOf(day), [day]);
  const prior = answeredToday(profile, 'detective', day);
  const [picked, setPicked] = useState<string | null>(null);
  const done = prior.done || picked !== null;
  const pick = (id: string) => { if (done) return; setPicked(id); answerPuzzle('detective', day, id === puzzle.case.answer); };
  return (
    <Card id="card-detective" title="Ratio detective" subtitle={puzzle.case.story}>
      <table className="w-full text-sm" aria-label="Ratios">
        <thead><tr className="text-left text-xs text-ink-2"><th scope="col">Ratio</th><th scope="col" className="text-right">This business</th><th scope="col" className="text-right">Normal</th></tr></thead>
        <tbody>
          {puzzle.case.clues.map((c) => (
            <tr key={c.label} className="border-t border-line"><td className="py-1">{c.label}</td><td className="tnum text-right font-bold">{c.value}</td><td className="tnum text-right text-ink-2">{c.normal}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 grid gap-2" role="group" aria-label="What is the problem?">
        {puzzle.options.map((o) => (
          <Choice key={o.id} label={o.name} disabled={done} onPick={() => pick(o.id)}
            state={!done ? 'idle' : o.id === puzzle.case.answer ? 'right' : o.id === picked ? 'wrong' : 'idle'} />
        ))}
      </div>
      {done && (
        <p role="status" className="mt-3 rounded-lg border border-line p-2.5 text-sm">
          <b>{(picked ? picked === puzzle.case.answer : prior.right) ? 'Right! ' : 'Not quite. '}</b>{puzzle.case.explain}
        </p>
      )}
    </Card>
  );
}

/** What the auditors would say about your books today, and how past audits went. */
export function AuditCard({ game }: { game: GameState }) {
  const findings = auditOf(game);
  const past = game.audits ?? [];
  return (
    <Fold id="card-audit" title="Audit day"
      summary={findings.length ? `If the auditors came today they would raise ${findings.length} point${findings.length === 1 ? '' : 's'}. Open for details.` : 'If the auditors came today your books would be clean.'}
      subtitle="Every new year the auditors check your books. A clean audit lifts your reputation by 3; each point they raise lowers it by 1 (up to 3). This is what they would say today.">
      {findings.length === 0 ? <p className="text-sm text-good-text font-bold">Nothing to report. Keep it up.</p> : (
        <ul className="space-y-2">
          {findings.map((f) => (
            <li key={f.id} className="rounded-lg border border-line p-2.5 text-sm">
              <div className="font-bold">{f.title}</div>
              <div className="text-xs text-ink-2">{f.detail}</div>
              <div className="mt-1 text-xs">Fix: {f.fix}</div>
            </li>
          ))}
        </ul>
      )}
      {past.length > 0 && <p className="mt-3 text-xs text-ink-2">Past audits: {past.map((a) => `${a.year} ${a.clean ? 'clean' : `${a.findings.length} point${a.findings.length === 1 ? '' : 's'}`}`).join(' · ')}</p>}
    </Fold>
  );
}

/** Every term you have met, with an example from your own company. */
export function GlossaryCard({ game }: { game: GameState }) {
  const profile = useGame((s) => s.profile);
  const met = TERMS.filter((t) => termSeen(profile, t.id));
  return (
    <Fold id="card-glossary" title="Glossary" summary={`${met.length} of ${TERMS.length} terms met. Tap the ⓘ next to a word in the game to add it.`}
      subtitle="Words you have come across, in plain English, with an example from your own company.">
      <ul className="space-y-2">
        {TERMS.map((t) => {
          const seen = termSeen(profile, t.id);
          return (
            <li key={t.id} className="rounded-lg border border-line p-2.5 text-sm">
              <div className="font-bold">{seen ? t.name : '???'}</div>
              {seen ? (
                <>
                  <div className="text-xs text-ink-2">{t.plain}</div>
                  <div className="mt-1 text-xs">{t.example(game)}</div>
                </>
              ) : <div className="text-xs text-muted">Not met yet.</div>}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-ink-2">Puzzles solved so far: {learnOf(profile).solved ?? 0}</p>
    </Fold>
  );
}

/** A small "what is this?" button. The first time you open a word it joins your glossary. */
export function TermTip({ term, game }: { term: string; game: GameState }) {
  const { profile, seeTerm } = useGame();
  const [open, setOpen] = useState(false);
  const t = termOf(term);
  if (!t) return null;
  const seen = termSeen(profile, term);
  return (
    <span className="relative inline-block align-middle">
      <button type="button" className={`cfx-info${seen ? '' : ' is-new'}`} aria-label={`Explain ${t.name}`} aria-expanded={open}
        onClick={() => { setOpen(!open); if (!seen) seeTerm(term); }}>ⓘ</button>
      {open && (
        <span role="note" className="absolute left-0 top-full z-20 mt-1 block w-60 rounded-lg border-2 border-outline bg-surface p-2 text-left text-xs font-medium normal-case shadow-[var(--edge-sm)]">
          <b className="block">{t.name}</b>
          {t.plain}
          <span className="mt-1 block text-ink-2">{t.example(game)}</span>
        </span>
      )}
    </span>
  );
}
