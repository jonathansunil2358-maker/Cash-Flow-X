import {
  DIFFICULTIES, DIFFICULTY_IDS, formatGBP, CALM_ID, CAMPAIGN, campaignId, IRONMAN_ID, ORIGINS, modifierBonus, CULTURES, MODIFIER_BONUS, OPTIONAL_MODIFIERS, INDUSTRIES, INDUSTRY_IDS, LEASE_MARGIN, leasePayment, prestigeThreshold, randomSeedLabel,
  rebirthsRemaining, SCENARIOS, startingCash, type DifficultyId, type EquipmentFinance, type IndustryId,
} from '@cfx/engine';
import { challengeField, isValidChallengeCode } from '@cfx/engine';
import { useState } from 'react';
import { CURRENCY_ICONS, ICON_LABELS, ICON_ORDER, iconUrl } from '../lib/icons';
import { useAccount } from '../lib/account';
import { ONLINE } from '../lib/api';
import { deleteSlot, readPref, slotMeta, SLOTS, writePref } from '../lib/save';
import { useGame } from '../store';
import { PerkTree } from './Legacy';
import { HowItWorks, SeasonPreview } from './MenuExtras';

type Step = 'home' | 'sector' | 'identity' | 'difficulty';

const SECTOR_ICON: Record<IndustryId, string> = {
  software: 'laptop', clothing: 'tshirt', restaurant: 'burger', fitness: 'dumbbell', ecommerce: 'parcel', automotive: 'car',
};

/** The case studies on the start screen: a name for the company and an icon for each. */
const CASE_STUDIES = [
  { id: 'profitable-but-broke', icon: 'tshirt', name: 'Loom & Loop Ltd' },
  { id: 'cash-crunch', icon: 'burger', name: 'Saltwater Kitchen Ltd' },
  { id: 'growth-trap', icon: 'parcel', name: 'Parcel & Post Ltd' },
  { id: 'price-war', icon: 'laptop', name: 'Ledgerly Ltd' },
  { id: 'turnaround', icon: 'dumbbell', name: 'Iron Works Gym Ltd' },
];
const CASE_NAMES: Record<string, string> = Object.fromEntries(CASE_STUDIES.map((c) => [c.id, c.name]));

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
  const [industry, setIndustry] = useState<IndustryId>(() => {
    try { const q = new URLSearchParams(window.location.search).get('sector'); return q && q in INDUSTRIES ? (q as IndustryId) : 'software'; } catch { return 'software'; }
  });
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('rocket');
  const [difficulty, setDifficulty] = useState<DifficultyId>(preset?.difficulty ?? 'medium');
  const [finance, setFinance] = useState<EquipmentFinance>('lease');
  const [mods, setMods] = useState<string[]>([]);
  const [culture, setCulture] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const [seed, setSeed] = useState(() => {
    try { const q = new URLSearchParams(window.location.search).get('seed'); return q && /^[A-Za-z0-9-]{1,32}$/.test(q) ? q.toUpperCase() : randomSeedLabel(); } catch { return randomSeedLabel(); }
  });
  const [, refresh] = useState(0);
  const signedIn = !!useAccount((s) => s.me);
  const [pending, setPending] = useState(() => { const c = readPref('challenge')?.toUpperCase() ?? ''; return isValidChallengeCode(c) ? c : ''; });
  const caseStudy = SCENARIOS[scenarioId].kind === 'case-study';
  const ind = INDUSTRIES[caseStudy ? SCENARIOS[scenarioId].industryId! : industry];
  const capex = caseStudy ? null : ind.startingCapex;
  const saves = SLOTS.map(slotMeta).filter((m) => m !== null);
  const perkCount = Object.values(profile.perks).reduce((a, n) => a + n, 0);
  const defaultName = caseStudy ? CASE_NAMES[scenarioId] ?? CAMPAIGN.find((c) => campaignId(c.n) === scenarioId)?.name ?? 'Loom & Loop Ltd' : `${ind.name.split(' ')[0]} Co Ltd`;

  const [busy, setBusy] = useState(false);
  const begin = async () => {
    if (busy) return;
    setBusy(true);
    await start({
    companyName: name.trim() || defaultName, industryId: ind.id, seed: seed.trim() || randomSeedLabel(), scenarioId,
    difficulty, equipmentFinance: finance, icon, modifiers: difficulty === 'hard' || caseStudy ? [] : [...mods, ...(culture ? [culture] : []), ...(origin ? [origin] : [])],
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

          {pending && ONLINE && signedIn && (
            <section className="cfx-panel !pt-7" aria-label="A friend's challenge">
              <div className="cfx-panel__ribbon">A friend challenged you</div>
              <p className="text-sm font-bold">Same company, same luck, 24 months: whoever ends with the biggest stake wins. Code {pending}.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" className="cfx-btn is-go flex-1" disabled={busy} onClick={async () => {
                  const f = challengeField(pending);
                  setBusy(true);
                  await start({ companyName: f.companyName, industryId: f.industryId, seed: f.seed, scenarioId: 'challenge', difficulty: 'medium', equipmentFinance: 'buy', icon: 'rocket', challengeCode: pending });
                  setBusy(false);
                }}>Play the challenge</button>
                <button type="button" className="cfx-btn is-soft" onClick={() => { writePref('challenge', ''); setPending(''); }}>Not now</button>
              </div>
            </section>
          )}

          <div className="flex flex-col gap-3">
            {saves.find((m) => m!.slot === 'autosave') && (
              <button type="button" className="cfx-btn is-go is-lg w-full" onClick={() => load('autosave')}>
                Continue {saves.find((m) => m!.slot === 'autosave')!.companyName}
              </button>
            )}
            <button type="button" className="cfx-btn is-lg w-full" onClick={() => { setScenarioId('standard'); setStep('sector'); }}>New company</button>
            <button type="button" className="cfx-btn is-soft w-full" onClick={() => { setScenarioId('speedrun'); setStep('sector'); }}>
              Speedrun: a £1m company, fast{profile.speedBest ? ` (your best: ${profile.speedBest} months)` : ''}
            </button>
            <section className="cfx-panel !p-3" aria-label="Story campaign">
              <div className="font-display text-lg">Story campaign</div>
              <p className="text-xs text-ink-2">Ten chapters, from a market stall to a skyline. Clear a chapter to unlock the next.</p>
              <div className="mt-2 grid gap-2">
                {CAMPAIGN.map((c) => {
                  const done = (profile.campaign ?? []).includes(c.n);
                  const locked = c.n > 1 && !(profile.campaign ?? []).includes(c.n - 1);
                  return (
                    <button key={c.n} type="button" disabled={locked} className="cfx-btn is-soft w-full !justify-between" aria-label={`Chapter ${c.n}: ${c.title}${done ? ' (complete)' : locked ? ' (locked)' : ''}`}
                      onClick={() => { setScenarioId(campaignId(c.n)); setIcon(c.n % 2 ? 'rocket' : 'star'); setStep('identity'); }}>
                      <span>{c.n}. {c.title}</span><span aria-hidden>{done ? '✓' : locked ? '🔒' : '▶'}</span>
                    </button>
                  );
                })}
              </div>
            </section>
            {CASE_STUDIES.map((c) => (
              <button key={c.id} type="button" className="cfx-btn is-soft w-full" onClick={() => { setScenarioId(c.id); setIcon(c.icon); setStep('identity'); }}>
                {SCENARIOS[c.id].name}
              </button>
            ))}
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

          {difficulty !== 'hard' && !caseStudy && (
            <section className="cfx-panel !p-3.5" aria-label="Extra challenges">
              <div className="font-display text-lg">Extra challenges</div>
              <p className="text-xs text-ink-2">Optional. Each one makes the game harder and adds +{Math.round(MODIFIER_BONUS * 100)}% to your final score and Legacy points.</p>
              <div className="mt-2 grid gap-2">
                {OPTIONAL_MODIFIERS.map((m) => {
                  const on = mods.includes(m.id);
                  return (
                    <button key={m.id} type="button" role="checkbox" aria-checked={on} className={`cfx-tile !p-2.5 text-left ${on ? 'ring-4 ring-[var(--coin)]' : ''}`}
                      onClick={() => setMods(on ? mods.filter((x) => x !== m.id) : [...mods.filter((x) => !(m.id === 'chaos-mayhem' && x === CALM_ID)), m.id])}>
                      <span className="cfx-tile__name !text-lg">{on ? '✓ ' : ''}{m.name}</span>
                      <span className="cfx-tile__meta">{m.blurb}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 grid gap-2">
                <button type="button" role="checkbox" aria-checked={mods.includes(CALM_ID)} className={`cfx-tile !p-2.5 text-left ${mods.includes(CALM_ID) ? 'ring-4 ring-[var(--coin)]' : ''}`}
                  onClick={() => setMods(mods.includes(CALM_ID) ? mods.filter((x) => x !== CALM_ID) : [...mods.filter((x) => x !== 'chaos-mayhem'), CALM_ID])}>
                  <span className="cfx-tile__name !text-lg">{mods.includes(CALM_ID) ? '✓ ' : ''}Calm seas</span>
                  <span className="cfx-tile__meta">Events strike 40% less often. A gentler game, but your score and Legacy are 10% lower.</span>
                </button>
                <button type="button" role="checkbox" aria-checked={mods.includes(IRONMAN_ID)} className={`cfx-tile !p-2.5 text-left ${mods.includes(IRONMAN_ID) ? 'ring-4 ring-[var(--coin)]' : ''}`}
                  onClick={() => setMods(mods.includes(IRONMAN_ID) ? mods.filter((x) => x !== IRONMAN_ID) : [...mods, IRONMAN_ID])}>
                  <span className="cfx-tile__name !text-lg">{mods.includes(IRONMAN_ID) ? '✓ ' : ''}Ironman</span>
                  <span className="cfx-tile__meta">No undo and no rebirths: one life. A badge of honour, with no score bonus.</span>
                </button>
              </div>
              {modifierBonus(mods) !== 1 && <p className="mt-2 text-sm font-extrabold">Score and Legacy {modifierBonus(mods) > 1 ? 'bonus' : 'change'}: {modifierBonus(mods) > 1 ? '+' : ''}{Math.round((modifierBonus(mods) - 1) * 100)}%</p>}
              <div className="mt-4 font-display text-lg">Founder backstory</div>
              <p className="text-xs text-ink-2">Optional. Who you were before. A small edge and a small cost, no bonus.</p>
              <div className="mt-2 grid gap-2" role="radiogroup" aria-label="Founder backstory">
                {ORIGINS.map((o) => {
                  const on = origin === o.id;
                  return (
                    <button key={o.id} type="button" role="radio" aria-checked={on} className={`cfx-tile !p-2.5 text-left ${on ? 'ring-4 ring-[var(--coin)]' : ''}`} onClick={() => setOrigin(on ? null : o.id)}>
                      <span className="cfx-tile__name !text-lg">{on ? '✓ ' : ''}{o.name}</span>
                      <span className="cfx-tile__meta">{o.blurb}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 font-display text-lg">Company culture</div>
              <p className="text-xs text-ink-2">Optional. A small trade-off that gives your company a personality. It pays no bonus.</p>
              <div className="mt-2 grid gap-2" role="radiogroup" aria-label="Company culture">
                {CULTURES.map((c) => {
                  const on = culture === c.id;
                  return (
                    <button key={c.id} type="button" role="radio" aria-checked={on} className={`cfx-tile !p-2.5 text-left ${on ? 'ring-4 ring-[var(--coin)]' : ''}`}
                      onClick={() => setCulture(on ? null : c.id)}>
                      <span className="cfx-tile__name !text-lg">{on ? '✓ ' : ''}{c.name}</span>
                      <span className="cfx-tile__meta">{c.blurb}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

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
