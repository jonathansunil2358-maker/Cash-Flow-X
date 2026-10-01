import { finalScore, formatGBP, formatInt, formatPct, monthLabel, rebirthCheck, scenarioOf, type GameState } from '@cfx/engine';
import { useMemo } from 'react';
import { Button, Card, KeyValue, StatusPill } from '../components/ui';
import { useGame } from '../store';

export function GameOver({ game }: { game: GameState }) {
  const { endBankruptRun, nextRun, profile } = useGame();
  const rebirth = game.status === 'insolvent' ? rebirthCheck(profile, game) : null;
  const score = useMemo(() => finalScore(game), [game]);
  const scenario = scenarioOf(game.scenarioId);
  const objectives = scenario.objectives?.(game);
  const insolvent = game.status === 'insolvent';

  return (
    <Card className={`mb-5 ${insolvent ? 'border-critical/60' : 'border-good/50'}`}
      title={insolvent ? 'The company has failed' : game.status === 'prestiged' ? `Prestiged: +${game.prestigeAward} Legacy points` : 'Game complete'}
      subtitle={game.endReason}
      actions={
        insolvent ? (
          <div className="flex flex-wrap gap-2">
            {rebirth?.allowed && (
              <Button variant="primary" onClick={() => endBankruptRun(true)}>
                Rebirth{Number.isFinite(rebirth.remaining) ? ` (${rebirth.remaining} left)` : ''}
              </Button>
            )}
            <Button onClick={() => endBankruptRun(false)}>Start over</Button>
          </div>
        ) : (
          <Button variant="primary" onClick={nextRun}>{game.status === 'prestiged' ? 'Start your next company' : 'New game'}</Button>
        )
      }>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <div className="text-xs text-muted">Final score</div>
          <div className="tnum text-4xl font-bold">{formatInt(score.score)}</div>
          <p className="mt-1 text-sm text-ink-2">Your wealth ({formatGBP(score.ownerWealth)}) × health multiplier ({insolvent ? '0.50, insolvent' : (0.75 + 0.5 * score.health.score).toFixed(2)}).</p>
          <div className="mt-3">
            <KeyValue rows={[
              ['Equity value', formatGBP(score.equityValue)],
              ['Your ownership', formatPct(score.ownership)],
              ['Your stake', formatGBP(score.ownerStake)],
              ['Dividends received', formatGBP(score.ownerDividends)],
              ['Financial health', `${score.health.grade} (${Math.round(score.health.score * 100)}/100)`],
              ['£10m reached', game.wonAtMonth !== null ? monthLabel(game.wonAtMonth) : 'No'],
            ]} />
          </div>
        </div>
        <div className="space-y-4">
          {objectives && (
            <div>
              <div className="mb-2 text-sm font-semibold">Objectives</div>
              <ul className="space-y-1.5 text-sm">
                {objectives.map((o) => <li key={o.id} className="flex items-center justify-between gap-2"><span>{o.text}</span><StatusPill kind={o.met ? 'good' : 'bad'} label={o.met ? 'Met' : 'Missed'} /></li>)}
              </ul>
            </div>
          )}
          {game.server && (
            <div className="rounded-2xl border-[3px] border-outline bg-surface-2 p-3 text-sm">
              {game.server.flagged
                ? <span className="font-bold text-critical-text">This company failed verification and does not count for leaderboards.</span>
                : <span><strong>Verified by the server.</strong> Your results count on the Net worth and Prestige leaderboards automatically.</span>}
            </div>
          )}
          {insolvent && rebirth && !rebirth.allowed && <p className="text-sm text-critical-text">{rebirth.reason}</p>}
          {insolvent && <p className="text-sm text-ink-2">You keep your perks, gems and banked boosts either way.</p>}
          <p className="text-sm text-ink-2">You can keep browsing the accounts: every statement, ratio and journal is still available.</p>
        </div>
      </div>
    </Card>
  );
}
