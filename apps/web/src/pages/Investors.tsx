import { activeHolders, formatGBP, formatPct, investmentAllowed, ownership, type GameState } from '@cfx/engine';
import { Button, Card, KeyValue, StatusPill } from '../components/ui';
import { useAccount } from '../lib/account';
import { useGame } from '../store';

/** Holding company investors in this company: offers to answer, buy-outs owed, current shareholders. */
export function Investors({ game }: { game: GameState }) {
  const me = useAccount((s) => s.me);
  const { acceptOffer, declineOffer, act } = useGame();
  if (!me) return <p className="text-sm text-ink-2">Sign in and join a holding company to take on investors.</p>;
  const offers = me.investments.offers.filter((o) => o.runId === game.server?.runId);
  const holders = activeHolders(game);
  const owed = holders.filter((h) => me.investments.buyoutRequests.includes(h.id));
  const playing = game.status === 'playing';
  return (
    <div className="space-y-4">
      <Card title="Offers" subtitle="Members of your holding company can offer to buy new shares at your latest verified valuation. The cash goes into your company; you own a little less.">
        {offers.length === 0 && <p className="text-sm text-ink-2">No offers right now.</p>}
        <div className="space-y-2">
          {offers.map((o) => {
            const check = investmentAllowed(game, o.amount, o.preMoney);
            const after = ownership(game) * (o.preMoney / (o.preMoney + o.amount));
            return (
              <div key={o.id} className="rounded-2xl border-[3px] border-outline bg-surface-2 p-3 text-sm">
                <div className="font-display text-lg">{o.investorName} offers {formatGBP(o.amount)}</div>
                <p className="text-ink-2">At a {formatGBP(o.preMoney)} pre-money valuation. Your ownership would go from {formatPct(ownership(game))} to about {formatPct(after)}.</p>
                {!check.ok && <p className="font-bold text-critical-text">{check.reason}</p>}
                <div className="mt-2 flex gap-2">
                  <Button variant="go" disabled={!playing || !check.ok || !!game.pendingEvent} onClick={() => acceptOffer(o)}>Accept</Button>
                  <Button onClick={() => declineOffer(o.id)}>Decline</Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {owed.length > 0 && (
        <Card title="Buy-outs owed" subtitle="These investors left your holding company (or you left theirs). Buy their shares back at your current valuation.">
          <Button variant="primary" disabled={!playing || !!game.pendingEvent} onClick={() => act({ type: 'buyOutInvestors', holderIds: owed.map((h) => h.id) }, 'Investors bought out.')}>
            Buy out {owed.length} investor{owed.length > 1 ? 's' : ''}
          </Button>
        </Card>
      )}

      <Card title="Shareholders">
        <KeyValue rows={[
          ['You', formatPct(ownership(game))],
          ...holders.map((h): [string, string] => [h.investorName, formatPct(h.shares / game.shares.total)]),
          ['Others (angels, staff)', formatPct(Math.max(0, 1 - ownership(game) - holders.reduce((a, h) => a + h.shares, 0) / game.shares.total))],
        ]} />
        {holders.length > 0 && (
          <p className="mt-2 text-xs text-ink-2">Investors receive their share of any dividend. If you prestige, they are bought out at valuation first.</p>
        )}
        {game.outsideHolders.some((h) => h.status === 'bought-out') && (
          <div className="mt-2 flex flex-wrap gap-1">
            {game.outsideHolders.filter((h) => h.status === 'bought-out').map((h) => <StatusPill key={h.id} kind="ok" label={`${h.investorName}: bought out ${formatGBP(h.buyout, { compact: true })}`} />)}
          </div>
        )}
      </Card>
    </div>
  );
}
