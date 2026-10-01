import {
  DIFFICULTIES, DIFFICULTY_IDS, formatGBP, INDUSTRIES, INDUSTRY_IDS, LEASE_MARGIN, leasePayment, prestigeThreshold, randomSeedLabel,
  rebirthsRemaining, SCENARIOS, startingCash, type DifficultyId, type EquipmentFinance, type IndustryId,
} from '@cfx/engine';
import { useState } from 'react';
import { CURRENCY_ICONS, ICON_LABELS, ICON_ORDER, iconUrl } from '../lib/icons';
import { deleteSlot, slotMeta, SLOTS } from '../lib/save';
import { useGame } from '../store';
import { PerkTree } from './Legacy';
import { HowItWorks, SeasonPreview } from './MenuExtras';

type Step = 'home' | 'sector' | 'identity' | 'difficulty';

const SECTOR_ICON: Record<IndustryId, string> = {
  software: 'laptop', clothing: 'tshirt', restaurant: 'burger', fitness: 'dumbbell', ecommerce: 'parcel', automotive: 'car',
};

const DIFF_TAG: Record<string, string> = { Standard: 'is-good', Challenging: 'is-warn', Hard: 'is-bad' };
/** Sector badges describe how many moving parts the business has, so they don't clash with game difficulty. */
const COMPLEXITY: Record<string, string> = { Standard: 'Simple', Challenging: 'Moderate', Hard: 'Complex' };

function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black tracking-wider text-on-sky">STEP {step} OF 3</span>
        <div className="flex gap-1.5" aria-hidden>
          {[1, 2, 3].map((i) => (
            <span key={i} className={`h-2.5 rounded-full border-2 border-outline ${i === step ? 'w-7 bg-[var(--coin)]' : i < step ? 'w-2.5 bg-[var(--coin)]' : 'w-2.5 bg-surface'}`} />
          ))}
        </div>
      </div>
      <h1 className="cfx-stroked text-4xl leading-none">{title}</h1>
      {subtitle && <p className="text-sm font-bold text-on-sky">{subtitle}</p>}
    </div>
  );
}

export function Onboarding({ theme, cycleTheme }: { theme: string; cycleTheme: () => void }) {
  const { start, load, profile, preset } = useGame();
  const [step, setStep] = useState<Step>(preset ? 'sector' : 'home');
  const [scenarioId, setScenarioId] = useState('standard');
  const [industry, setIndustry] = useState<IndustryId>('software');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('rocket');
  const [difficulty, setDifficulty] = useState<DifficultyId>(preset?.difficulty ?? 'medium');
  const [finance, setFinance] = useState<EquipmentFinance>('lease');
  const [seed, setSeed] = useState(randomSeedLabel);
  const [, refresh] = useState(0);
  const caseStudy = SCENARIOS[scenarioId].kind === 'case-study';
  const ind = INDUSTRIES[caseStudy ? SCENARIOS[scenarioId].industryId! : industry];
  const capex = caseStudy ? null : ind.startingCapex;
  const saves = SLOTS.map(slotMeta).filter((m) => m !== null);
  const perkCount = Object.values(profile.perks).reduce((a, n) => a + n, 0);
  const defaultName = caseStudy ? 'Loom & Loop Ltd' : `${ind.name.split(' ')[0]} Co Ltd`;

  const [busy, setBusy] = useState(false);
  const begin = async () => {
    if (busy) return;
    setBusy(true);
    await start({
    companyName: name.trim() || defaultName, industryId: ind.id, seed: seed.trim() || randomSeedLabel(), scenarioId,
    difficulty, equipmentFinance: finance, icon,
    });
    setBusy(false);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-[520px] flex-col gap-4 px-4 pb-8" style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
      {step === 'home' && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/icon.svg" alt="" className="h-11 w-11" />
              <span className="font-display text-2xl text-on-sky">Cash Flow X</span>
            </div>
            <button type="button" className="cfx-btn is-soft is-sm" onClick={cycleTheme}>Theme: {theme}</button>
          </div>
          <h1 className="cfx-stroked text-5xl leading-[0.95]">Build it. Grow it. Don't run out of cash.</h1>
          <p className="text-sm font-bold text-on-sky">A business tycoon game with real accounts underneath. Every sale, hire and loan posts double-entry journals, and your statements always balance.</p>

          <div className="flex flex-col gap-3">
            {saves.find((m) => m!.slot === 'autosave') && (
              <button type="button" className="cfx-btn is-go is-lg w-full" onClick={() => load('autosave')}>
                Continue {saves.find((m) => m!.slot === 'autosave')!.companyName}
              </button>
            )}
            <button type="button" className="cfx-btn is-lg w-full" onClick={() => { setScenarioId('standard'); setStep('sector'); }}>New company</button>
            <button type="button" className="cfx-btn is-soft w-full" onClick={() => { setScenarioId('profitable-but-broke'); setIcon('tshirt'); setStep('identity'); }}>
              Case study: Profitable but broke
            </button>
          </div>

          <section className="cfx-panel !pt-7">
            <div className="cfx-panel__ribbon is-legacy">Your legacy</div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div><img src={CURRENCY_ICONS.legacy} alt="" className="mx-auto h-8 w-8" /><div className="font-black">{profile.legacyPoints}</div><div className="text-[11px] text-ink-2">Legacy points</div></div>
              <div><img src={CURRENCY_ICONS.gem} alt="" className="mx-auto h-8 w-8" /><div className="font-black">{profile.gems}</div><div className="text-[11px] text-ink-2">Gems</div></div>
              <div><img src={CURRENCY_ICONS.xp} alt="" className="mx-auto h-8 w-8" /><div className="font-black">{profile.prestigeCount}</div><div className="text-[11px] text-ink-2">Prestiges</div></div>
            </div>
            <p className="mt-2 text-center text-xs text-ink-2">{perkCount} perk levels · next prestige at a {formatGBP(prestigeThreshold(profile.prestigeCount), { compact: true })} stake</p>
          </section>
          {(profile.legacyPoints > 0 || perkCount > 0) && <PerkTree />}
          <SeasonPreview />
          {profile.prestigeCount === 0 && <HowItWorks />}

          {saves.filter((m) => m!.slot !== 'autosave').length > 0 && (
            <section className="cfx-panel !pt-7">
              <div className="cfx-panel__ribbon">Saved games</div>
              <div className="space-y-2">
                {saves.filter((m) => m!.slot !== 'autosave').map((m) => (
                  <div key={m!.slot} className="flex items-center gap-2 rounded-2xl border-[3px] border-outline bg-surface-2 p-2">
                    <div className="min-w-0 flex-1 text-sm"><div className="truncate font-black">{m!.companyName}</div><div className="text-xs text-ink-2">Slot {m!.slot} · {m!.label}</div></div>
                    <button type="button" className="cfx-btn is-sm" onClick={() => load(m!.slot)}>Load</button>
                    <button type="button" className="cfx-btn is-sm is-soft" onClick={() => { deleteSlot(m!.slot); refresh((x) => x + 1); }}>Delete</button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {step === 'sector' && (
        <>
          {preset?.reason === 'rebirth' && <div className="cfx-toast !max-w-none"><img src={iconUrl('shield')} alt="" /><span>Rebirth: your perks, gems and boosts are safe. Pick any sector and go again on {DIFFICULTIES[difficulty].name}.</span></div>}
          {preset?.reason === 'prestige' && <div className="cfx-toast !max-w-none"><img src={CURRENCY_ICONS.legacy} alt="" /><span>Prestige {profile.prestigeCount}! You have {profile.legacyPoints} Legacy points to spend on perks (main menu).</span></div>}
          <StepHeader step={1} title="What will you build?" subtitle="Each sector has real economics: margins, stock, credit terms and how fast cash comes in. The badge shows how complex it is to run." />
          <div role="radiogroup" aria-label="Sector" className="grid grid-cols-2 gap-3">
            {INDUSTRY_IDS.map((id) => {
              const i = INDUSTRIES[id];
              return (
                <button key={id} type="button" role="radio" aria-checked={industry === id} aria-pressed={industry === id} className="cfx-tile !p-2.5" onClick={() => setIndustry(id)}>
                  <span className="flex items-center justify-between">
                    <img src={iconUrl(SECTOR_ICON[id])} alt="" className="h-12 w-12" />
                    <span className={`cfx-tag ${DIFF_TAG[i.difficulty]} !px-1.5 !py-0.5`} title="How many moving parts the business has">{COMPLEXITY[i.difficulty]}</span>
                  </span>
                  <span className="cfx-tile__name">{i.name.replace(' (SaaS)', '').replace(' (EV conversions)', '')}</span>
                  <span className="cfx-tile__meta">{i.tagline}</span>
                </button>
              );
            })}
          </div>
          <section className="cfx-panel !p-3.5">
            <div className="font-display text-lg">{ind.emoji} How {ind.name.split(' ')[0].toLowerCase()} makes money</div>
            <p className="mt-1 text-sm text-ink-2">{ind.description}</p>
          </section>
          <div className="mt-auto flex gap-2">
            {!preset && <button type="button" className="cfx-btn is-soft" onClick={() => setStep('home')}>Back</button>}
            <button type="button" className="cfx-btn is-lg flex-1" onClick={() => { setIcon(SECTOR_ICON[industry] === 'laptop' ? 'rocket' : SECTOR_ICON[industry]); setStep('identity'); }}>Next: name it</button>
          </div>
        </>
      )}

      {step === 'identity' && (
        <>
          <StepHeader step={2} title="Make it yours" subtitle={caseStudy ? SCENARIOS[scenarioId].summary : undefined} />
          <div className="cfx-hud !flex-nowrap !p-2.5">
            <img src={iconUrl(icon)} alt="" className="h-12 w-12" />
            <div className="min-w-0"><div className="cfx-hud__name !text-[22px]">{name.trim() || defaultName}</div><div className="cfx-hud__date">{ind.name} · this is how others will see you</div></div>
          </div>
          <section className="cfx-panel !p-3.5">
            <label htmlFor="biz-name" className="block">
              <span className="mb-1 block text-xs font-black tracking-wider text-ink-2">BUSINESS NAME</span>
              <input id="biz-name" value={name} maxLength={24} placeholder={defaultName} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border-[3px] border-outline bg-surface-2 px-3 py-2.5 text-lg font-extrabold text-ink outline-none focus:border-accent" />
            </label>
            <div className="mb-1 mt-3 text-xs font-black tracking-wider text-ink-2">ICON</div>
            <div role="radiogroup" aria-label="Business icon" className="grid grid-cols-6 gap-2">
              {ICON_ORDER.map((id) => (
                <button key={id} type="button" role="radio" aria-checked={icon === id} aria-pressed={icon === id} aria-label={ICON_LABELS[id]}
                  className="cfx-tile !grid aspect-square place-items-center !p-1" onClick={() => setIcon(id)}>
                  <img src={iconUrl(id)} alt="" className="w-full max-w-[44px]" />
                </button>
              ))}
            </div>
          </section>
          <div className="mt-auto flex gap-2">
            <button type="button" className="cfx-btn is-soft" onClick={() => setStep(caseStudy ? 'home' : 'sector')}>Back</button>
            {caseStudy
              ? <button type="button" className="cfx-btn is-go is-lg flex-1" onClick={begin} disabled={busy}>Take the job</button>
              : <button type="button" className="cfx-btn is-lg flex-1" onClick={() => setStep('difficulty')}>Next: difficulty</button>}
          </div>
        </>
      )}

      {step === 'difficulty' && (
        <>
          <StepHeader step={3} title="How brave are you?" subtitle="Difficulty sets your starting cash, how often luck is on your side, and whether you get second chances." />
          <div role="radiogroup" aria-label="Difficulty" className="flex flex-col gap-3">
            {DIFFICULTY_IDS.map((id) => {
              const d = DIFFICULTIES[id];
              const locked = preset?.lockDifficulty && id !== difficulty;
              const left = rebirthsRemaining(profile, id);
              const hard = id === 'hard';
              return (
                <button key={id} type="button" role="radio" aria-checked={difficulty === id} aria-pressed={difficulty === id} disabled={locked}
                  className={`cfx-tile ${locked ? 'opacity-40' : ''}`} style={hard ? { background: '#3a2210', color: '#fff1db' } : undefined} onClick={() => setDifficulty(id)}>
                  <span className="flex items-center justify-between">
                    <span className="cfx-tile__name !text-2xl">{hard ? '☠ ' : ''}{d.name}</span>
                    <span className="tnum text-xl font-black">{formatGBP(startingCash(id, profile.perks))}</span>
                  </span>
                  <span className="cfx-odds" aria-label={`${Math.round(d.positiveShare * 100)}% good events, ${Math.round((1 - d.positiveShare) * 100)}% bad events`}>
                    <i className="is-good" style={{ width: `${d.positiveShare * 100}%` }} /><i className="is-bad" style={{ width: `${(1 - d.positiveShare) * 100}%` }} />
                  </span>
                  <span className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[13px] font-extrabold">
                    <span>▲ {Math.round(d.positiveShare * 100)}% good · ▼ {Math.round((1 - d.positiveShare) * 100)}% bad</span>
                    <span>{d.rebirths === Infinity ? '✓ Unlimited rebirths' : d.rebirths === 0 ? '✕ One life' : `✓ ${left} of ${d.rebirths} rebirths left`}</span>
                    <span>{d.canPrestige ? '✓ Can prestige' : '✕ No prestige'}</span>
                    <span>{d.perksApply ? '✓ Perks and boosts on' : '✕ Cosmetics only'}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {capex && (
            <section className="cfx-panel !p-3.5" aria-label="Start-up equipment">
              <div className="font-display text-lg">{capex.label}: {formatGBP(capex.amount)}</div>
              <div role="radiogroup" className="mt-2 grid grid-cols-2 gap-2">
                {(['lease', 'buy'] as const).map((f) => (
                  <button key={f} type="button" role="radio" aria-checked={finance === f} aria-pressed={finance === f} className="cfx-tile !p-2.5 text-left" onClick={() => setFinance(f)}>
                    <span className="cfx-tile__name !text-lg">{f === 'lease' ? 'Lease it' : 'Buy it'}</span>
                    <span className="cfx-tile__meta">{f === 'lease'
                      ? `~${formatGBP(leasePayment(capex.amount, 0.04 + LEASE_MARGIN, capex.lifeMonths))}/month for ${capex.lifeMonths} months. Keeps your cash (IFRS 16 lease).`
                      : `Pay ${formatGBP(capex.amount)} now; depreciated over ${Math.round(capex.lifeMonths / 12)} years.`}</span>
                  </button>
                ))}
              </div>
              {finance === 'buy' && capex.amount > startingCash(difficulty, profile.perks) * 0.6 && (
                <p className="mt-2 text-sm font-extrabold text-critical-text">✕ That leaves very little cash to trade with.</p>
              )}
            </section>
          )}

          <details className="rounded-2xl border-[3px] border-outline bg-surface p-3 text-sm">
            <summary className="cursor-pointer font-black">Seed (optional)</summary>
            <p className="mt-1 text-xs text-ink-2">Same seed + same decisions = same game. Share it to challenge a friend.</p>
            <div className="mt-2 flex gap-2">
              <input aria-label="Seed" value={seed} maxLength={32} onChange={(e) => setSeed(e.target.value.toUpperCase())}
                className="w-full rounded-2xl border-[3px] border-outline bg-surface-2 px-3 py-2 font-mono font-bold text-ink" />
              <button type="button" className="cfx-btn is-soft is-sm" aria-label="Random seed" onClick={() => setSeed(randomSeedLabel())}>↻</button>
            </div>
          </details>

          <div className="mt-auto flex gap-2">
            <button type="button" className="cfx-btn is-soft" onClick={() => setStep('identity')}>Back</button>
            <button type="button" className="cfx-btn is-go is-lg flex-1" onClick={begin} disabled={busy}>{busy ? 'Registering…' : 'Open for business'}</button>
          </div>
        </>
      )}
    </div>
  );
}
