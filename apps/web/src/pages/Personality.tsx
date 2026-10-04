import {
  buildingNames, canNameEom, documentaryOf, nemesisOf, nemesisTaunt, diaryOf, diaryShareText, eomOf, formatGBP, festivalOn, headlineOf, HATS, PETS, petMood, petOf, rosterOf, UPGRADES, wardrobeOf, yearOf, type GameState,
} from '@cfx/engine';
import { useState } from 'react';
import { Button, Card, Field, TextInput } from '../components/ui';
import { useGame } from '../store';

/** A made-up newspaper whose front page is about your real company this month. */
export function NewspaperCard({ game }: { game: GameState }) {
  const f = headlineOf(game);
  return (
    <Card id="card-news" title={f.paper} subtitle="This month's front page.">
      <div className={`rounded-lg border-2 p-3 ${f.mood === 'good' ? 'border-[var(--go)]' : f.mood === 'bad' ? 'border-[var(--danger)]' : 'border-line'}`}>
        <div className="font-display text-xl leading-tight">{f.headline}</div>
        <p className="mt-1 text-sm text-ink-2">{f.sub}</p>
      </div>
    </Card>
  );
}

/** Adopt a pet who reacts to how the company is doing. */
export function PetCard({ game }: { game: GameState }) {
  const { profile, adoptPet: adopt } = useGame();
  const pet = petOf(profile);
  const [kind, setKind] = useState(PETS[0].id);
  const [name, setName] = useState('');
  if (pet) {
    const def = PETS.find((p) => p.id === pet.kind)!;
    const m = petMood(game);
    return (
      <Card id="card-pet" title={`${pet.name} the ${def.name.toLowerCase()}`} subtitle="Your company mascot. They live on the island and watch how you are doing.">
        <p className="text-sm"><span className="text-3xl" aria-hidden>{def.emoji}</span> <b>{pet.name}</b> {m.text} {m.face}</p>
      </Card>
    );
  }
  return (
    <Card id="card-pet" title="Adopt a mascot" subtitle="A pet who lives on your island and reacts to how the company is doing.">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Pet">
          <select aria-label="Pet" value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm">
            {PETS.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name} ({p.gems} gems)</option>)}
          </select>
        </Field>
        <Field label="Name"><TextInput aria-label="Pet name" value={name} maxLength={16} onChange={(e) => setName(e.target.value)} className="w-36" /></Field>
        <Button variant="gem" disabled={profile.gems < PETS.find((p) => p.id === kind)!.gems} onClick={() => adopt(kind, name)}>Adopt</Button>
      </div>
      <p className="mt-2 text-xs text-ink-2">You have {profile.gems} gems.</p>
    </Card>
  );
}

/** Pick someone to celebrate this month. */
export function EomCard({ game }: { game: GameState }) {
  const { profile, nameEom } = useGame();
  const team = rosterOf(game);
  const past = eomOf(profile);
  const can = canNameEom(profile, game.month);
  const [who, setWho] = useState('');
  if (!team.length) return null;
  return (
    <Card id="card-eom" title="Employee of the month" subtitle="Pick someone to celebrate. It is only a bit of fun, but people like to be noticed.">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Who">
          <select aria-label="Who" value={who || team[0].id} onChange={(e) => setWho(e.target.value)} className="rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm">
            {team.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.title})</option>)}
          </select>
        </Field>
        <Button variant="primary" disabled={!can} onClick={() => nameEom(who || team[0].id)}>{can ? 'Name them' : 'Done this month'}</Button>
      </div>
      {past.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-ink-2">{[...past].reverse().slice(0, 4).map((e) => <li key={e.month}>{e.note}</li>)}</ul>}
    </Card>
  );
}

/** A line or two about the year, saved and shareable. */
export function DiaryCard({ game }: { game: GameState }) {
  const { profile, writeDiary, toast } = useGame();
  const [note, setNote] = useState('');
  const year = yearOf(game.month);
  const entries = diaryOf(profile);
  const last = game.history.at(-1);
  const facts = last ? `${game.staff.ops + game.staff.rnd + game.staff.sales} staff, cash ${formatGBP(game.ledger.balances.cash, { compact: true })}` : 'just starting';
  const share = async (t: string) => { try { await navigator.clipboard.writeText(t); toast('success', 'Copied. Paste it anywhere.'); } catch { toast('error', 'Could not copy.'); } };
  return (
    <Card id="card-diary" title="Founder diary" subtitle="A line or two about this year, in your own words. Saved on this device.">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={`Year ${year}`}><TextInput aria-label="Diary entry" value={note} maxLength={240} onChange={(e) => setNote(e.target.value)} className="w-64 max-w-full" placeholder="What was this year like?" /></Field>
        <Button variant="primary" disabled={!note.trim()} onClick={() => { writeDiary({ year, company: game.companyName, note, facts }); setNote(''); }}>Save</Button>
      </div>
      {entries.length > 0 && (
        <ul className="mt-3 space-y-2 text-sm">
          {[...entries].reverse().slice(0, 5).map((e) => (
            <li key={`${e.company}${e.year}`} className="rounded-lg border border-line p-2">
              <b>{e.company}, year {e.year}</b>: {e.note}
              <div className="flex items-center justify-between text-xs text-ink-2"><span>{e.facts}</span><Button variant="ghost" onClick={() => share(diaryShareText(e))}>Copy</Button></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Give each of your buildings a name. They show on the island. */
export function NamesCard({ game }: { game: GameState }) {
  const { profile, setBuildingName } = useGame();
  const names = buildingNames(profile);
  const ups = UPGRADES[game.industryId];
  return (
    <Card id="card-names" title="Name your buildings" subtitle="Names show on the island next to each building.">
      <div className="grid gap-2 sm:grid-cols-2">
        {ups.map((u) => (
          <label key={u.id} className="block text-xs font-black tracking-wider text-ink-2">{u.name}
            <TextInput aria-label={`Name for ${u.name}`} value={names[u.id] ?? ''} maxLength={24} placeholder={u.name} className="mt-1 w-full"
              onChange={(e) => setBuildingName(u.id, e.target.value)} />
          </label>
        ))}
      </div>
    </Card>
  );
}

/** Hats for the little workers on the island. */
export function WardrobeCard() {
  const { profile, buyHat, wearHat } = useGame();
  const w = wardrobeOf(profile);
  return (
    <Card id="card-wardrobe" title="Team wardrobe" subtitle="Hats for the little workers on your island. Buy one and everybody wears it.">
      <div className="grid gap-2 sm:grid-cols-2">
        {HATS.filter((h) => !h.festival || w.owned.includes(h.id) || festivalOn()?.id === h.festival).map((h) => {
          const owned = w.owned.includes(h.id);
          const on = w.equipped === h.id;
          return (
            <div key={h.id} className="flex items-center gap-3 rounded-lg border border-line p-2.5">
              <span className="text-2xl" aria-hidden>{h.emoji}</span>
              <div className="min-w-0 flex-1 font-bold">{h.name}</div>
              {owned
                ? <Button aria-pressed={on} onClick={() => wearHat(on ? null : h.id)}>{on ? 'Wearing' : 'Wear'}</Button>
                : <Button variant="gem" disabled={profile.gems < h.gems} onClick={() => buyHat(h.id)}>{h.gems} gems</Button>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** Share this company's seed so a friend can play the very same company and compare. */
export function ShareSeedCard({ game }: { game: GameState }) {
  const toast = useGame((s) => s.toast);
  const link = `${window.location.origin}/?seed=${encodeURIComponent(game.seedLabel)}&sector=${game.industryId}`;
  const text = `Play the same company as me in Cash Flow X: seed ${game.seedLabel}. Same luck, same rivals. Can you beat my ${formatGBP(game.history.at(-1)?.valuation?.equityValue ?? 0, { compact: true })}?`;
  const share = async () => {
    try { if (navigator.share) { await navigator.share({ title: 'Cash Flow X', text, url: link }); return; } } catch { /* cancelled: copy instead */ }
    try { await navigator.clipboard.writeText(`${text}\n${link}`); toast('success', 'Link copied. Send it to a friend.'); } catch { toast('error', `Copy this link: ${link}`); }
  };
  return (
    <Card id="card-seed" title="Share this company" subtitle="A friend who opens your link starts a new company with the same seed: same economy, same rivals, same luck. Then compare how you each did.">
      <div className="flex flex-wrap items-center gap-3">
        <code className="rounded border border-line px-2 py-1 text-sm" aria-label="Seed">{game.seedLabel}</code>
        <Button variant="primary" onClick={share}>Share the seed</Button>
      </div>
    </Card>
  );
}

/** The rival who remembers how you left your last company. */
export function NemesisCard({ game }: { game: GameState }) {
  const profile = useGame((s) => s.profile);
  const n = nemesisOf(profile);
  if (!n) return null;
  const current = game.history.at(-1)?.valuation?.equityValue ?? 0;
  const t = nemesisTaunt(n, current);
  return (
    <Card id="card-nemesis" title={`Your nemesis: ${n.name}`} subtitle="The strongest rival of the last company you finished. They have not forgotten.">
      <p className="text-sm">{t.text}</p>
      <p className="mt-1 text-xs text-ink-2">{t.beaten ? 'You are ahead of your old self.' : 'Beat your old stake to silence them.'}</p>
    </Card>
  );
}

/** A narrated recap of the company so far, in scenes. */
export function DocumentaryCard({ game }: { game: GameState }) {
  const d = documentaryOf(game);
  const toast = useGame((s) => s.toast);
  const copy = async () => { try { await navigator.clipboard.writeText(`${d.title}\n\n${d.scenes.map((x) => `${x.heading}: ${x.text}`).join('\n')}`); toast('success', 'Copied. Paste it anywhere.'); } catch { toast('error', 'Could not copy.'); } };
  return (
    <Card id="card-documentary" title={d.title} subtitle="Your company's story so far, read from its real history.">
      <ol className="space-y-2 text-sm">{d.scenes.map((x) => <li key={x.heading}><b>{x.heading}.</b> {x.text}</li>)}</ol>
      <Button className="mt-3" onClick={copy}>Copy the script</Button>
    </Card>
  );
}
