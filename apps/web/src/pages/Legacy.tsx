import {
  BOOSTS, DIFFICULTIES, formatGBP, INDUSTRIES, PERKS, perkPurchase, prestigeCheck, type BoostId, type GameState, type PerkBranch,
} from '@cfx/engine';
import { Button, Card, KeyValue, Meter, PageTitle, StatusPill } from '../components/ui';
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

export function Legacy({ game }: { game: GameState }) {
  const { profile, act, buyBoost } = useGame();
  const check = prestigeCheck(game);
  const diff = DIFFICULTIES[game.difficulty];
  return (
    <div className="space-y-5">
      <PageTitle title="Prestige & Legacy" subtitle="Prestige sells your company at its valuation and turns your stake into Legacy points. You start again with cash and upgrades reset, but keep perks, gems, boosts and cosmetics." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Prestige">
          {!diff.canPrestige ? (
            <p className="text-sm text-ink-2">Hard mode runs cannot prestige. Your perks and boosts are switched off here too.</p>
          ) : (
            <>
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
      {profile.runs.length > 0 && (
        <Card title="Past companies">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-line text-xs text-muted"><th className="py-1.5 text-left font-medium">Company</th><th className="text-left font-medium">Difficulty</th><th className="text-right font-medium">Months</th><th className="text-right font-medium">Outcome</th><th className="text-right font-medium">Stake</th><th className="text-right font-medium">Legacy</th></tr></thead>
            <tbody className="tnum">
              {profile.runs.map((r, i) => (
                <tr key={i} className="border-b border-line/60">
                  <td className="py-1.5">{INDUSTRIES[r.industryId].emoji} {r.companyName}</td>
                  <td>{DIFFICULTIES[r.difficulty].name}</td>
                  <td className="text-right">{r.months}</td>
                  <td className="text-right">{r.outcome}</td>
                  <td className="text-right">{formatGBP(r.ownerStake, { compact: true })}</td>
                  <td className="text-right">{r.legacy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
