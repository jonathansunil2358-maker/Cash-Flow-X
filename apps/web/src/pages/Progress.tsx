import {
  challengesDone, challengesFor, CHALLENGE_GEMS, claimableGenerations, dynastyOf, INHERITANCE_GEMS,
  formatGBP, INDUSTRIES, INDUSTRY_IDS, MASTERY_STEPS, masteryOf, MAX_VENTURES, passOf, passTier, PASS_POINTS_PER_TIER, PASS_REWARDS, PASS_TIERS, reputationTier,
  SKILLS, skillPoints, skillsOf, VENTURES, ventureCheck, VENTURE_CASH_SHARE, type GameState, type VentureKind,
} from '@cfx/engine';
import { useState } from 'react';
import { Button, Card, Field, KeyValue, Meter, MoneyInput } from '../components/ui';
import { useGame } from '../store';
import { Fold } from './Strategy';

/** Spend a point per founder level on conveniences (none of them changes the simulation). */
export function SkillsCard() {
  const { profile, learnSkill } = useGame();
  const points = skillPoints(profile);
  const known = skillsOf(profile);
  return (
    <Card fold id="card-skills" title="Founder skills" subtitle="Each founder level above 1 gives a skill point. Skills are conveniences only: they never change how your company performs."
      actions={<span className="tnum rounded-[10px] border-2 border-outline bg-surface-2 px-2 py-1 text-xs font-black" aria-label={`${points} skill points`}>⭐ {points}</span>}>
      <ul className="grid gap-2">
        {SKILLS.map((s) => {
          const has = known.includes(s.id);
          return (
            <li key={s.id} className="flex items-center gap-3 rounded-lg border border-line p-2.5">
              <div className="min-w-0 flex-1">
                <div className="font-bold">{s.name}</div>
                <div className="text-xs text-ink-2">{s.blurb}</div>
              </div>
              {has ? <span className="text-xs font-black text-good-text">Learned</span> : <Button disabled={points < 1} onClick={() => learnSkill(s.id)}>Learn (1 point)</Button>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** A monthly track that fills as you play. */
export function SeasonPassCard() {
  const { profile, claimPass } = useGame();
  const pass = passOf(profile);
  const tier = passTier(pass);
  const waiting = tier - pass.claimed.length;
  return (
    <Card fold id="card-pass" title={`Season pass: ${pass.season}`} subtitle={`One point for every month you run and five for each mission. Every ${PASS_POINTS_PER_TIER} points opens a tier. It resets each calendar month.`}>
      <Meter value={Math.min(pass.points, PASS_TIERS * PASS_POINTS_PER_TIER)} max={PASS_TIERS * PASS_POINTS_PER_TIER} label="Season progress" text={`Tier ${tier} of ${PASS_TIERS} · ${pass.points} points`} />
      <ol className="mt-3 grid grid-cols-5 gap-1.5 text-center text-xs" aria-label="Season pass rewards">
        {PASS_REWARDS.map((r, i) => {
          const got = pass.claimed.includes(i);
          const open = i < tier && !got;
          return (
            <li key={i} className={`rounded-lg border p-1.5 ${got ? 'border-line opacity-60' : open ? 'border-[var(--coin)] ring-2 ring-[var(--coin)]' : 'border-line'}`}>
              <div className="font-black">{i + 1}</div>
              <div aria-hidden>{r.kind === 'gems' ? '💎' : '🎁'}</div>
              <div>{r.kind === 'gems' ? r.amount : 'Box'}</div>
            </li>
          );
        })}
      </ol>
      <Button className="mt-3" variant="gem" disabled={waiting < 1} onClick={claimPass}>{waiting < 1 ? 'Nothing to claim yet' : `Claim next reward (${waiting} waiting)`}</Button>
    </Card>
  );
}

/** Badges for each sector you have finished companies in. */
export function MasteryCard() {
  const profile = useGame((s) => s.profile);
  return (
    <Card fold id="card-mastery" title="Sector mastery" subtitle={`Finish companies of at least a year in a sector: ${MASTERY_STEPS.map((m) => `${m.name} at ${m.runs}`).join(', ')}.`}>
      <ul className="grid grid-cols-2 gap-2">
        {INDUSTRY_IDS.map((id) => {
          const m = masteryOf(profile, id);
          const ind = INDUSTRIES[id];
          return (
            <li key={id} className="rounded-lg border border-line p-2 text-sm">
              <div className="font-bold"><span aria-hidden>{ind.emoji}</span> {ind.name}</div>
              <div className="text-xs text-ink-2">{m.tierName ? `${m.tierName} · ` : ''}{m.finished} finished{m.next ? ` · ${m.next - m.finished} to the next badge` : ' · top badge'}</div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** The reputation tier, and how far to the next. */
export function ReputationTier({ game }: { game: GameState }) {
  const t = reputationTier(game.reputation);
  return <span>{t.name}{t.next ? ` · ${Math.max(0, Math.ceil(t.next.at - game.reputation))} to ${t.next.name}` : ''}</span>;
}

/** Side ventures: a stake in something risky that settles in months. */
export function VentureCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const [kind, setKind] = useState<VentureKind>('growth');
  const [amount, setAmount] = useState(5_000_00);
  const check = ventureCheck(game, kind, amount);
  const held = game.ventures ?? [];
  return (
    <Fold id="card-venture" title="Side ventures" summary={held.length ? `${held.length} running. Open for details.` : 'Back a risky bet inside your company. Open to start one.'} subtitle={`Back a side venture with up to ${Math.round(VENTURE_CASH_SHARE * 100)}% of your cash, at most ${MAX_VENTURES} at a time. It is a bet inside your company, not a second company: you find out how it went when it settles.`}>
      <div className="space-y-3">
        {held.length > 0 && (
          <KeyValue rows={held.map((v) => [VENTURES.find((d) => d.id === v.kind)!.name, `${formatGBP(v.stake, { compact: true })} until month ${v.end + 1}`] as [string, string])} />
        )}
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Venture">
            <select value={kind} onChange={(e) => setKind(e.target.value as VentureKind)} className="rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm" aria-label="Venture">
              {VENTURES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Field>
          <Field label="Stake"><MoneyInput value={amount} onChange={setAmount} step={1000} /></Field>
          <Button variant="primary" disabled={game.status !== 'playing' || !check.ok} onClick={() => act({ type: 'startVenture', kind, amount }, 'Venture started.')}>Back it</Button>
        </div>
        <p className="text-xs text-ink-2">{VENTURES.find((v) => v.id === kind)!.blurb}</p>
        {!check.ok && <p className="text-xs text-muted">{check.reason}</p>}
      </div>
    </Fold>
  );
}

/** Your finished companies as a family tree, five to a generation. */
export function DynastyCard() {
  const { profile, claimInheritance } = useGame();
  const gens = dynastyOf(profile);
  const claim = claimableGenerations(profile);
  return (
    <Card fold id="card-dynasty" title="Your dynasty" subtitle={`Every five finished companies complete a generation, and each pays an inheritance of ${INHERITANCE_GEMS} gems.`}>
      {gens.length === 0 ? <p className="text-sm text-ink-2">Finish a company and your family tree starts here.</p> : (
        <ol className="space-y-3">
          {gens.map((g) => (
            <li key={g.n} className="rounded-lg border border-line p-2">
              <div className="text-sm font-bold">Generation {g.n} · best stake {formatGBP(g.best, { compact: true })}</div>
              <ul className="mt-1 flex flex-wrap gap-1.5 text-xs">
                {g.companies.map((c, i) => <li key={i} className="rounded-full border border-line px-2 py-0.5" title={`${c.sector}, ${c.months} months`}><span aria-hidden>{c.emoji}</span> {c.name}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-3"><Button disabled={claim < 1} onClick={claimInheritance}>{claim > 0 ? `Claim inheritance (${claim})` : 'No inheritance waiting'}</Button></div>
    </Card>
  );
}

/** Hand-picked perfect-run goals for the sector you are playing. */
export function ChallengesCard({ sector }: { sector: Parameters<typeof challengesFor>[0] }) {
  const profile = useGame((s) => s.profile);
  const done = new Set(challengesDone(profile));
  return (
    <Card fold id="card-mastery-challenges" title="Mastery challenges" subtitle={`Meet one of these in any company and earn ${CHALLENGE_GEMS} gems, once each.`}>
      <ul className="space-y-1.5 text-sm">
        {challengesFor(sector).map((c) => (
          <li key={c.id} className="flex gap-2"><span aria-hidden>{done.has(c.id) ? '✅' : '⬜'}</span><span><b>{c.name}</b>: {c.text}</span></li>
        ))}
      </ul>
    </Card>
  );
}
