import {
  formatGBP, formatPct, grossPayroll, HEADS_PER_PROJECT, leaveChance, MAX_TRAINING_SPEND, monthlyProjectCost, monthLabel, moraleProductivity,
  moraleTarget, PAY_MORALE, PAY_MULT, PROJECTS, projectCheck, projectSlots, projectSuccessChance, PROMO_DIP, PROMO_DISCOUNTS, PROMO_MAX_MONTHS,
  promoCheck, trainingEffect, INDUSTRIES, type GameState, type PayLevel,
} from '@cfx/engine';
import { useState, type ReactNode } from 'react';
import { Button, Card, Field, KeyValue, Meter, MoneyInput, StatusPill } from '../components/ui';
import { useGame } from '../store';

/** A card that stays folded until opened, so the Business panel stays short on a phone. */
export function Fold({ id, title, subtitle, summary, children }: { id: string; title: string; subtitle: ReactNode; summary?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Card id={id} title={title} subtitle={open ? subtitle : summary ?? subtitle}
      actions={<Button variant="secondary" aria-expanded={open} aria-controls={`${id}-body`} onClick={() => setOpen(!open)}>{open ? 'Hide' : 'Open'}</Button>}>
      <div id={`${id}-body`} hidden={!open}>{open ? children : null}</div>
    </Card>
  );
}

/** The next six months of demand for this sector, as a strip of bars. */
function SeasonStrip({ game }: { game: GameState }) {
  const curve = INDUSTRIES[game.industryId].seasonality;
  const months = Array.from({ length: 6 }, (_, i) => ({ label: monthLabel(game.month + i).slice(0, 3), factor: curve[(game.month + i) % 12] ?? 1 }));
  return (
    <ul className="flex items-end gap-2" aria-label="Seasonal demand for the next six months">
      {months.map((m, i) => (
        <li key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="tnum text-[11px] font-bold text-ink-2">{m.factor >= 1 ? '+' : ''}{Math.round((m.factor - 1) * 100)}%</span>
          <div className="w-full rounded-md border-2 border-outline" role="presentation"
            style={{ height: `${24 + Math.max(0, m.factor - 0.85) * 160}px`, background: m.factor >= 1.03 ? 'var(--go)' : m.factor <= 0.97 ? 'var(--danger)' : 'var(--coin)' }} />
          <span className="text-[11px] font-bold">{m.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function PromotionsCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const [pct, setPct] = useState<number>(20);
  const [months, setMonths] = useState(2);
  const check = promoCheck(game);
  const playing = game.status === 'playing';
  const peak = INDUSTRIES[game.industryId].seasonality;
  const next = game.promo
    ? `${game.promo.discountPct}% off, ${game.promo.monthsLeft} month${game.promo.monthsLeft === 1 ? '' : 's'} left`
    : game.promoCooldown > 0 ? `Cooling down: ${game.promoCooldown} more month${game.promoCooldown === 1 ? '' : 's'}` : 'No promotion running';
  return (
    <Fold id="card-promo" title="Promotions & season" summary={`${next}. Demand has seasons: open to plan around them.`}
      subtitle="Demand rises and falls through the year. A promotion cuts your price for a few months: customers respond to the lower price, you earn less on each sale, and the month after is quiet.">
      <div className="space-y-4">
        <p className="text-sm font-bold" role="status">{next}.</p>
        <SeasonStrip game={game} />
        <p className="text-xs text-ink-2">
          Best month for your sector: {monthLabel(peak.indexOf(Math.max(...peak))).slice(0, 3)}. Quietest: {monthLabel(peak.indexOf(Math.min(...peak))).slice(0, 3)}.
          A promotion is cheapest to run when demand is already weak, and wasted when everyone is buying anyway.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Discount">
            <div className="flex gap-1.5" role="group" aria-label="Discount">
              {PROMO_DISCOUNTS.map((d) => (
                <Button key={d} variant={pct === d ? 'primary' : 'secondary'} aria-pressed={pct === d} onClick={() => setPct(d)}>{d}%</Button>
              ))}
            </div>
          </Field>
          <Field label="Months">
            <div className="flex gap-1.5" role="group" aria-label="Months">
              {Array.from({ length: PROMO_MAX_MONTHS }, (_, i) => i + 1).map((m) => (
                <Button key={m} variant={months === m ? 'primary' : 'secondary'} aria-pressed={months === m} onClick={() => setMonths(m)}>{m}</Button>
              ))}
            </div>
          </Field>
        </div>
        <KeyValue rows={[
          ['Set-up cost', formatGBP(check.fee)],
          ['Price while it runs', `${formatGBP(Math.round(game.price * (1 - pct / 100)), { pence: true })} (usually ${formatGBP(game.price, { pence: true })})`],
          ['Afterwards', months >= 2 ? `Demand dips ${Math.round((1 - PROMO_DIP) * 100)}% for a month, then a 3-month rest.` : 'A 3-month rest before the next one.'],
        ]} />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" disabled={!playing || !check.allowed}
            onClick={() => act({ type: 'startPromo', discountPct: pct, months }, `Promotion started: ${pct}% off for ${months} month${months === 1 ? '' : 's'}.`)}>
            Start promotion
          </Button>
          {!check.allowed && <span className="text-xs text-muted">{check.reason}</span>}
        </div>
      </div>
    </Fold>
  );
}

const PAY_LABEL: Record<PayLevel, string> = { below: 'Below market', market: 'Market', above: 'Above market' };

export function MoraleCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const [training, setTraining] = useState(game.trainingSpend);
  const playing = game.status === 'playing';
  const target = moraleTarget(game);
  const leave = leaveChance(game.morale);
  const prod = moraleProductivity(game.morale);
  const mood = game.morale >= 70 ? 'Buzzing' : game.morale >= 55 ? 'Steady' : game.morale >= 40 ? 'Restless' : 'Unhappy';
  return (
    <Fold id="card-morale" title="Team morale & pay" summary={`Morale ${Math.round(game.morale)}/100 (${mood}). Pay: ${PAY_LABEL[game.pay].toLowerCase()}. Open to set pay and training.`}
      subtitle="Happy teams get more done and stay. Pay and training raise morale; money worries lower it. Low morale slows your team and people start to leave.">
      <div className="space-y-4">
        <Meter value={game.morale} max={100} label="Team morale" tone={game.morale >= 55 ? 'go' : game.morale >= 40 ? 'coin' : 'danger'} text={`${mood}: ${Math.round(game.morale)}`} />
        <KeyValue rows={[
          ['Productivity', `×${prod.toFixed(2)} on capacity and R&D`],
          ['Morale is heading towards', `${Math.round(target)}`],
          ['Chance each person leaves a month', leave > 0 ? formatPct(leave, 1) : 'None'],
        ]} />
        {game.ledger.balances.cash < 0 && <p className="text-xs font-bold text-critical-text">Money worries: the team can see you are overdrawn, and morale is pulled down.</p>}

        <Field label="Pay level" hint={`Wage bill now ${formatGBP(grossPayroll(game))} a month before on-costs.`}>
          <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Pay level">
            {(Object.keys(PAY_MULT) as PayLevel[]).map((p) => (
              <Button key={p} variant={game.pay === p ? 'primary' : 'secondary'} aria-pressed={game.pay === p} disabled={!playing}
                onClick={() => act({ type: 'setPay', level: p }, `Pay set to ${PAY_LABEL[p].toLowerCase()}.`)}>
                <span className="block text-center leading-tight">{PAY_LABEL[p]}<br /><span className="text-[11px] font-bold opacity-80">{PAY_MULT[p] === 1 ? '±0%' : `${PAY_MULT[p] > 1 ? '+' : ''}${Math.round((PAY_MULT[p] - 1) * 100)}% cost`} · morale {PAY_MORALE[p] >= 0 ? '+' : ''}{PAY_MORALE[p]}</span></span>
              </Button>
            ))}
          </div>
        </Field>

        <Field label="Training budget (£ a month)" hint={`Lifts morale by up to 12 points. Now +${trainingEffect(game).toFixed(1)}. About 10% of the wage bill gets the full effect.`}>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-36"><MoneyInput value={training} step={100} max={Math.round(MAX_TRAINING_SPEND / 100)} onChange={setTraining} aria-label="Monthly training budget" /></div>
            <Button variant="primary" disabled={!playing || training === game.trainingSpend}
              onClick={() => act({ type: 'setTraining', amount: Math.min(MAX_TRAINING_SPEND, training) }, training > 0 ? `Training budget set to ${formatGBP(training)} a month.` : 'Training stopped.')}>
              Set budget
            </Button>
          </div>
        </Field>
      </div>
    </Fold>
  );
}

export function ProjectsCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const playing = game.status === 'playing';
  const slots = projectSlots(game);
  const chance = projectSuccessChance(game);
  return (
    <Fold id="card-projects" title="R&D projects"
      summary={`${game.projects.length} running · ${slots} slot${slots === 1 ? '' : 's'} (${HEADS_PER_PROJECT} R&D staff each) · ${game.projectsDone.length} done.`}
      subtitle={`Point your R&D team at a named project. It costs money every month, needs ${HEADS_PER_PROJECT} R&D staff for each project running at once, and can fail (about ${formatPct(chance, 0)} chance of success now; a happy team and a strong product help).`}>
      <ul className="space-y-3">
        {PROJECTS.map((p) => {
          const active = game.projects.find((x) => x.id === p.id);
          const done = game.projectsDone.includes(p.id);
          const check = projectCheck(game, p.id);
          return (
            <li key={p.id} className="rounded-lg border border-line p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-ink">{p.name}</div>
                  <div className="text-xs text-ink-2">{p.description}</div>
                  <div className="mt-1 text-xs text-muted">{p.months} months · {formatGBP(p.cost)} in total ({formatGBP(monthlyProjectCost(p))} a month)</div>
                </div>
                {done && <StatusPill kind="good" label="Complete" />}
                {active && <StatusPill kind="ok" label={`${active.monthsLeft} months left`} />}
              </div>
              {!done && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {active ? (
                    <Button variant="danger" disabled={!playing} onClick={() => act({ type: 'cancelProject', projectId: p.id }, `${p.name} cancelled.`)}>Cancel (no refund)</Button>
                  ) : (
                    <Button variant="primary" disabled={!playing || !check.allowed} onClick={() => act({ type: 'startProject', projectId: p.id }, `${p.name} started.`)}>Start project</Button>
                  )}
                  {!active && !check.allowed && <span className="text-xs text-muted">{check.reason}</span>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Fold>
  );
}

export function RivalsCard({ game }: { game: GameState }) {
  const cutting = game.competitors.filter((c) => c.cutMonths > 0);
  return (
    <Fold id="card-rivals" title="Rivals"
      summary={cutting.length ? `${cutting[0].name} is cutting prices. Open for details.` : `${game.competitors.length} rivals, none cutting prices right now.`}
      subtitle="Rivals watch you. If your share jumps, the strongest one may cut prices for a few months, and now and then one launches a better product.">
      <ul className="space-y-2 text-sm">
        {game.competitors.map((c) => {
          const gap = c.normalPrice > 0 ? c.price / c.normalPrice - 1 : 0;
          return (
            <li key={c.name} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-2.5">
              <div>
                <div className="font-medium text-ink">{c.name}</div>
                <div className="text-xs text-ink-2">Quality {Math.round(c.quality)} · price {formatGBP(c.price, { pence: true })}</div>
              </div>
              {c.cutMonths > 0
                ? <StatusPill kind="warn" label={`Cutting ${formatPct(-gap, 0)} · ${c.cutMonths} more month${c.cutMonths === 1 ? '' : 's'}`} />
                : <StatusPill kind="good" label="Normal prices" />}
            </li>
          );
        })}
      </ul>
    </Fold>
  );
}
