import {
  BOOSTS, DIFFICULTIES, formatGBP, formatInt, formatPct, INDUSTRIES, lifetimeStats, PERKS, perkPurchase, prestigeBonus, prestigeCheck, prestigeTitle, PRESTIGE_BONUS_MAX_RANK,
  type BoostId, type GameState, type PerkBranch, type RunSummary,
} from '@cfx/engine';
import { useState } from 'react';
import { Button, Card, KeyValue, Meter, PageTitle, StatusPill } from '../components/ui';
import { shareResultCard, type ShareCard } from '../lib/shareCard';
import { useGame } from '../store';

const BRANCHES: { id: PerkBranch; name: string }[] = [
  { id: 'operations', name: 'Operations' },
  { id: 'finance', name: 'Finance' },
  { id: 'growth', name: 'Growth' },
];

/** The permanent perk tree, bought with Legacy points. Used in game and on the setup screen. */
export function PerkTree() {
  const { profile, buyPerk } = useGame();
  return (
    <Card title="Perk tree" subtitle={`${profile.legacyPoints} Legacy points to spend. Perks apply to every new company on Easy and Medium.`}>
      <div className="grid gap-4 md:grid-cols-3">
        {BRANCHES.map((b) => (
          <div key={b.id} className="space-y-2">
            <h3 className="text-sm font-semibold text-ink">{b.name}</h3>
            {PERKS.filter((p) => p.branch === b.id).map((p) => {
              const level = profile.perks[p.id] ?? 0;
              const check = perkPurchase(profile.perks, p.id, profile.legacyPoints);
              const maxed = level >= p.costs.length;
              return (
                <div key={p.id} className="rounded-lg border border-line p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-ink-2">Lv {level}/{p.costs.length}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-2">{p.description}</p>
                  <div className="mt-2">
                    {maxed ? <StatusPill kind="good" label="Maxed" /> : (
                      <Button variant={check.ok ? 'primary' : 'secondary'} disabled={!check.ok} onClick={() => buyPerk(p.id)} title={check.reason}>
                        Unlock for {check.cost} Legacy
                      </Button>
                    )}
                    {!maxed && !check.ok && <span className="ml-2 text-xs text-muted">{check.reason}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Your prestige rank, what the next prestige adds, and exactly what you keep and lose. */
function RankPanel({ rank, points }: { rank: number; points: number }) {
  const now = prestigeBonus(rank);
  const next = prestigeBonus(rank + 1);
  const capped = rank >= PRESTIGE_BONUS_MAX_RANK;
  const pct = (x: number) => `+${Math.round(x * 100)}%`;
  return (
    <div className="mb-4 space-y-3 rounded-lg border border-line p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-[10px] border-2 border-outline bg-[var(--legacy)] px-2 py-0.5 text-sm font-black text-[#3a2210]" aria-label={`Prestige rank ${rank}`}>★ {rank}</span>
        <span className="font-display text-lg">{prestigeTitle(rank)}</span>
        <span className="text-sm text-ink-2">{rank === 0 ? 'No prestige yet' : `${pct(now)} demand on every new company, for good`}</span>
      </div>
      <p className="text-sm text-ink-2">
        {capped
          ? 'You have reached the highest bonus. Prestige still earns Legacy points and gems.'
          : `Prestige now to become ${prestigeTitle(rank + 1)}: every new company starts with ${pct(next)} demand${points > 0 ? `, plus ${points} Legacy points to spend` : ''}.`}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-surface-2 p-2.5 text-sm">
          <div className="mb-1 font-bold text-ink">You keep</div>
          <ul className="list-disc space-y-0.5 pl-5 text-ink-2">
            <li>Your prestige rank and its permanent demand bonus</li>
            <li>Legacy points, perks and the perk tree</li>
            <li>Gems, banked boosts and Founder XP</li>
            <li>Achievements and your history</li>
          </ul>
        </div>
        <div className="rounded-lg bg-surface-2 p-2.5 text-sm">
          <div className="mb-1 font-bold text-ink">Resets to day one</div>
          <ul className="list-disc space-y-0.5 pl-5 text-ink-2">
            <li>Your company, cash and loans</li>
            <li>Staff, upgrades and R&amp;D projects</li>
            <li>Prices, marketing and your seasonal plans</li>
            <li>Your investors are bought out at valuation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function Legacy({ game }: { game: GameState }) {
  const { profile, act, buyBoost } = useGame();
  const [view, setView] = useState<'prestige' | 'history'>('prestige');
  const check = prestigeCheck(game);
  const diff = DIFFICULTIES[game.difficulty];
  return (
    <div className="space-y-5">
      <div className="flex gap-2" role="tablist" aria-label="Prestige or history">
        {([['prestige', 'Prestige'], ['history', 'Stats & history']] as const).map(([id, label]) => (
          <Button key={id} variant={view === id ? 'primary' : 'secondary'} role="tab" aria-selected={view === id} onClick={() => setView(id)}>{label}</Button>
        ))}
      </div>
      <PageTitle title="Prestige & Legacy" subtitle="Prestige sells your company at its valuation and turns your stake into Legacy points. You start again with cash and upgrades reset, but keep perks, gems, boosts and cosmetics." />
      {view === 'prestige' ? (
      <>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Prestige">
          {!diff.canPrestige ? (
            <p className="text-sm text-ink-2">Hard mode runs cannot prestige. Your perks and boosts are switched off here too.</p>
          ) : (
            <>
              <RankPanel rank={profile.prestigeCount} points={check.points} />
              <KeyValue rows={[
                ['Your stake (equity value × ownership)', formatGBP(check.stake)],
                ['Needed to prestige', formatGBP(check.threshold)],
                ['Legacy points if you prestige now', `${check.points} (√ of stake in £m, rounded down)`],
                ['Gems on prestige', `${check.points * 25}`],
              ]} />
              <div className="mt-3"><Meter value={check.stake / check.threshold} label="Progress to prestige" /></div>
              <Button className="mt-4" variant="primary" disabled={!check.eligible}
                onClick={() => act({ type: 'prestige' }, `Prestiged for ${check.points} Legacy points.`)}>
                {check.eligible ? `Prestige now for ${check.points} Legacy` : check.reason}
              </Button>
            </>
          )}
        </Card>
        <Card title="Gem boosts" subtitle={`You have ${profile.gems} gems. Unused boost time carries over to your next company.`}>
          <div className="space-y-2">
            {(Object.keys(BOOSTS) as BoostId[]).map((id) => {
              const b = BOOSTS[id];
              const active = game.boosts.find((x) => x.id === id);
              return (
                <div key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3 text-sm">
                  <div>
                    <div className="font-medium">{b.name} {active && <StatusPill kind="good" label={`${active.monthsRemaining} months left`} />}</div>
                    <div className="text-xs text-ink-2">{b.description}</div>
                  </div>
                  <Button variant="primary" disabled={!diff.perksApply || profile.gems < b.gems || game.status !== 'playing'} onClick={() => buyBoost(id)}>
                    {b.gems} gems
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <PerkTree />
      </>
      ) : <HistoryView />}
    </div>
  );
}

const OUTCOME: Record<RunSummary['outcome'], { label: string; tone: ShareCard['tone'] }> = {
  prestiged: { label: 'Prestiged', tone: 'good' }, retired: { label: 'Retired', tone: 'neutral' }, bankrupt: { label: 'Went bust', tone: 'bad' },
};

export function runCard(r: RunSummary): ShareCard {
  const o = OUTCOME[r.outcome];
  return {
    heading: r.companyName, sub: `${INDUSTRIES[r.industryId].name} · ${DIFFICULTIES[r.difficulty].name} · ${(r.months / 12).toFixed(1)} years`,
    badge: o.label, tone: o.tone,
    stats: [['Owner stake at the end', formatGBP(r.ownerStake, { compact: true })], ['Legacy points earned', formatInt(r.legacy)], ['Months in business', formatInt(r.months)]],
  };
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="tnum font-display text-2xl leading-tight">{value}</div>
      {sub && <div className="text-xs text-ink-2">{sub}</div>}
    </div>
  );
}

/** Lifetime stats and the history of past companies. */
function HistoryView() {
  const { profile, toast } = useGame();
  const st = lifetimeStats(profile);
  const share = async (r: RunSummary) => {
    const res = await shareResultCard(runCard(r));
    if (res === 'downloaded') toast('success', 'Picture saved. Share it anywhere.');
    else if (res === 'failed') toast('error', 'Could not make the picture on this device.');
  };
  return (
    <div className="space-y-5">
      <Card title="Lifetime" subtitle={st.companies === 0 ? 'Play your first company to start the record.' : undefined}>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <StatTile label="Companies" value={formatInt(st.companies)} sub={`${formatPct(st.survivalRate, 0)} survived`} />
          <StatTile label="Prestiges" value={formatInt(st.prestiges)} sub={`${formatInt(st.legacyEarned)} Legacy earned`} />
          <StatTile label="Years played" value={st.yearsPlayed.toFixed(1)} sub={`${formatInt(st.bankruptcies)} bankruptcies`} />
          <StatTile label="Best stake" value={formatGBP(st.bestStake, { compact: true })} sub={st.bestRun ? st.bestRun.companyName : undefined} />
          <StatTile label="Founder level" value={formatInt(st.founderLevel)} sub={`${formatInt(st.gems)} gems`} />
          <StatTile label="Achievements" value={`${st.achievementsEarned}/${st.achievementsTotal}`} sub={`${formatInt(st.missionsCompleted)} missions done`} />
        </div>
        {st.favouriteIndustry && <p className="mt-3 text-sm text-ink-2">Favourite sector: {INDUSTRIES[st.favouriteIndustry].emoji} {INDUSTRIES[st.favouriteIndustry].name}.</p>}
      </Card>
      {profile.runs.length > 0 && (
        <Card title="Past companies" subtitle="Your latest 20. Tap Share to make a picture of one.">
          <ul className="space-y-2">
            {profile.runs.map((r, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-2.5 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-ink">{INDUSTRIES[r.industryId].emoji} {r.companyName}</div>
                  <div className="text-xs text-ink-2">{DIFFICULTIES[r.difficulty].name} · {(r.months / 12).toFixed(1)} years · stake {formatGBP(r.ownerStake, { compact: true })}{r.legacy ? ` · ${r.legacy} Legacy` : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill kind={r.outcome === 'prestiged' ? 'good' : r.outcome === 'bankrupt' ? 'bad' : 'ok'} label={OUTCOME[r.outcome].label} />
                  <Button onClick={() => void share(r)} aria-label={`Share ${r.companyName}`}>Share</Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
