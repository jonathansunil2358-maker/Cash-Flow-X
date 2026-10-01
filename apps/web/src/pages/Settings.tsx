import { Button, Card, PageTitle } from '../components/ui';
import { useState } from 'react';
import { useAccount } from '../lib/account';
import { api, ONLINE } from '../lib/api';
import { musicMood } from '@cfx/engine';
import { isMusicOn, playMusic, setMusicOn, stopMusic } from '../lib/music';
import { isDayNightOn, isWeatherOn, setDayNightOn, setWeatherOn } from '../lib/weather';
import { isHapticsOn, isSoundOn, playSound, setHapticsOn, setSoundOn } from '../lib/sfx';
import { useGame } from '../store';
import { NamesCard, WardrobeCard } from './Personality';
import { DecorCard, LogoCard, ShopCard } from './Shop';

export function Settings({ theme, cycleTheme }: { theme: string; cycleTheme: () => void }) {
  const { save, quit, undo, undoStack, pauseOnPanels, setPauseOnPanels, scene3d, setScene3d, setTourOpen, openSheet, game, refreshAccount, toast } = useGame();
  const { me, signOut } = useAccount();
  const [name, setName] = useState(me?.user.name ?? '');
  const [sound, setSound] = useState(isSoundOn());
  const [buzz, setBuzz] = useState(isHapticsOn());
  const [music, setMusic] = useState(isMusicOn());
  const [weather, setWeather] = useState(isWeatherOn());
  const [dayNight, setDayNight] = useState(isDayNightOn());
  return (
    <div className="space-y-5">
      <PageTitle title="Settings" />
      <Card title="Save game" subtitle="Your game also autosaves after every month and decision.">
        <div className="flex flex-wrap gap-2">
          {(['1', '2', '3'] as const).map((slot) => <Button key={slot} onClick={() => save(slot)}>Save to slot {slot}</Button>)}
        </div>
      </Card>
      <Card title="Play">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            <span className="block font-extrabold">Pause time while a panel is open</span>
            <span className="block text-xs text-ink-2">{pauseOnPanels
              ? 'On: the clock stops while you use Upgrades, Team, the Books, this menu or any other panel.'
              : 'Off: time keeps running while you browse panels, so events can arrive mid-decision.'}</span>
          </span>
          <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={pauseOnPanels} onChange={(e) => setPauseOnPanels(e.target.checked)} />
        </label>
        <label className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span>
            <span className="block font-extrabold">3D business scene</span>
            <span className="block text-xs text-ink-2">Turn off on older phones to save battery. The game plays the same.</span>
          </span>
          <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={scene3d} onChange={(e) => setScene3d(e.target.checked)} />
        </label>
        <label className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span>
            <span className="block font-extrabold">Sound effects</span>
            <span className="block text-xs text-ink-2">Short sounds for sales, decisions, events and celebrations. Made on the fly: nothing to download.</span>
          </span>
          <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={sound} aria-label="Sound effects"
            onChange={(e) => { setSoundOn(e.target.checked); setSound(e.target.checked); if (e.target.checked) playSound('success'); }} />
        </label>
        <label className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span>
            <span className="block font-extrabold">Vibration</span>
            <span className="block text-xs text-ink-2">A small buzz on phones that support it.</span>
          </span>
          <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={buzz} aria-label="Vibration"
            onChange={(e) => { setHapticsOn(e.target.checked); setBuzz(e.target.checked); if (e.target.checked) playSound('click'); }} />
        </label>
        <label className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span>
            <span className="block font-extrabold">Background music</span>
            <span className="block text-xs text-ink-2">A gentle tune made on the fly that gets brighter when you are in profit and tenser when cash is short. Off by default.</span>
          </span>
          <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={music} aria-label="Background music"
            onChange={(e) => { setMusicOn(e.target.checked); setMusic(e.target.checked); if (e.target.checked && game) playMusic(musicMood(game)); else stopMusic(); }} />
        </label>
        <label className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span>
            <span className="block font-extrabold">Weather on the island</span>
            <span className="block text-xs text-ink-2">Rain, snow and dusk that follow the seasons. Purely for looks.</span>
          </span>
          <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={weather} aria-label="Weather on the island"
            onChange={(e) => { setWeatherOn(e.target.checked); setWeather(e.target.checked); }} />
        </label>
        <label className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span>
            <span className="block font-extrabold">Island follows your clock</span>
            <span className="block text-xs text-ink-2">The island gets dark in the evening and bright in the morning, whatever theme you picked.</span>
          </span>
          <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={dayNight} aria-label="Island follows your clock"
            onChange={(e) => { setDayNightOn(e.target.checked); setDayNight(e.target.checked); }} />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={undo} disabled={!undoStack.length || game?.status !== 'playing'}>Undo last decision</Button>
          <Button onClick={cycleTheme}>Theme: {theme}</Button>
          {game && <Button onClick={() => setTourOpen(true)}>Replay tutorial</Button>}
          {ONLINE && <Button onClick={() => openSheet('social')}>Holding company & leaderboards</Button>}
        </div>
      </Card>
      <ShopCard />
      <DecorCard />
      {game && <LogoCard icon={game.icon} />}
      <WardrobeCard />
      {game && <NamesCard game={game} />}
      {me && (
        <Card title="Account" subtitle={game?.server ? (game.server.flagged ? `This company failed verification: ${game.server.flagged}` : `This company is verified up to ${game.server.syncedMonth} months in.`) : undefined}>
          <label className="block text-xs font-black tracking-wider text-ink-2" htmlFor="player-name">PLAYER NAME (SHOWN ON LEADERBOARDS)</label>
          <div className="mt-1 flex gap-2">
            <input id="player-name" value={name} maxLength={24} onChange={(e) => setName(e.target.value)}
              className="min-w-0 flex-1 rounded-2xl border-[3px] border-outline bg-surface-2 px-3 py-2 font-extrabold text-ink" />
            <Button disabled={!name.trim() || name === me.user.name}
              onClick={async () => { try { await api.updateMe({ name }); await refreshAccount(); toast('success', 'Name updated.'); } catch (e) { toast('error', (e as Error).message); } }}>Save</Button>
          </div>
          <Button variant="danger" className="mt-3" onClick={() => { quit(); void signOut(); }}>Sign out</Button>
        </Card>
      )}
      <Card title="Leave">
        <Button variant="danger" onClick={quit}>Main menu</Button>
      </Card>
    </div>
  );
}
