import { dailyChallenge, DAILY_MONTHS, formatGBP, INDUSTRIES, msUntilNextDaily, utcDay, type GameState } from '@cfx/engine';
import { useEffect, useState } from 'react';
import { EntryList } from '../components/FixedBits';
import { WatchWinner } from './Community';
import { Button, Card, KeyValue, StatusPill } from '../components/ui';
import { useAccount } from '../lib/account';
import { api, ONLINE, type DailyBoard } from '../lib/api';
import { useGame } from '../store';

function countdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/** Today's shared company: play it ranked once, or practise as often as you like. */
export function DailyChallengeCard({ game }: { game: GameState }) {
  const { start, save } = useGame();
  const signedIn = !!useAccount((s) => s.me);
  const [day, setDay] = useState(() => utcDay());
  const [left, setLeft] = useState(() => msUntilNextDaily());
  const [board, setBoard] = useState<DailyBoard | null>(null);
  const [confirm, setConfirm] = useState<'ranked' | 'practice' | null>(null);
  const ch = dailyChallenge(day);
  const ind = INDUSTRIES[ch.industryId];
  const playingDaily = game.scenarioId === 'daily' && game.status === 'playing';
  const online = ONLINE && signedIn;

  // Tick the countdown, and roll over to the next challenge at UTC midnight.
  useEffect(() => {
    const t = setInterval(() => {
      const ms = msUntilNextDaily();
      setLeft(ms);
      if (utcDay() !== day) setDay(utcDay());
    }, 1000);
    return () => clearInterval(t);
  }, [day]);

  useEffect(() => {
    if (!online) return;
    let live = true;
    api.daily(day).then((b) => { if (live) setBoard(b); }).catch(() => { if (live) setBoard(null); });
    return () => { live = false; };
  }, [online, day, game.status, game.month]);

  const go = (practice: boolean, saveFirst: boolean) => {
    if (saveFirst) save('3');
    setConfirm(null);
    void start({ companyName: ch.companyName, industryId: ch.industryId, seed: ch.seed, scenarioId: 'daily', difficulty: 'medium', equipmentFinance: 'buy', icon: 'rocket', practice });
  };

  const me = board?.me ?? null;
  const rankedUsed = !!me;
  return (
    <Card fold id="card-daily" title="Daily challenge"
      subtitle={`Everyone plays the same company for ${DAILY_MONTHS} months. No perks, boosts or prestige: just you against the day. Your final stake is your score.`}
      actions={<span className="tnum rounded-[10px] border-2 border-outline bg-surface-2 px-2 py-1 text-xs font-black" aria-label="Time left today">{countdown(left)}</span>}>
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-lg border border-line p-3">
          <span className="text-3xl" aria-hidden>{ind.emoji}</span>
          <div className="min-w-0">
            <div className="font-display text-lg leading-tight">{ch.companyName}</div>
            <div className="text-xs text-ink-2">{ind.name} · {DAILY_MONTHS} months · seed {ch.seed.replace('DAILY-', '')}</div>
          </div>
        </div>

        {playingDaily && <p className="text-sm font-bold">You are playing it now: month {game.month} of {DAILY_MONTHS}.</p>}
        {me?.finished && (
          <KeyValue rows={[
            ['Your result', me.status === 'insolvent' ? 'Went bust' : formatGBP(me.score, { compact: true })],
            ['Your rank today', me.rank ? `#${me.rank}` : '—'],
          ]} />
        )}
        {me && !me.finished && !playingDaily && <p className="text-xs text-ink-2">You started today's ranked run but did not finish it. There is one ranked attempt a day; practise below.</p>}

        {confirm ? (
          <div className="space-y-2 rounded-lg border-2 border-outline p-3" role="alertdialog" aria-label="Start the daily challenge">
            <p className="text-sm font-bold">This starts a new company and replaces the one you are running.</p>
            <p className="text-xs text-ink-2">{confirm === 'ranked' && online ? 'Your current online company stops being verified. ' : ''}Save it to slot 3 first if you want to come back to it.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => go(confirm === 'practice', true)}>Save to slot 3, then play</Button>
              <Button onClick={() => go(confirm === 'practice', false)}>Play without saving</Button>
              <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {online && <WatchWinner kind="daily" keyId={day} />}
            {online && !rankedUsed && <Button variant="primary" disabled={playingDaily} onClick={() => setConfirm('ranked')}>Play today's challenge</Button>}
            <Button variant={online && !rankedUsed ? 'secondary' : 'primary'} disabled={playingDaily} onClick={() => setConfirm('practice')}>
              {online ? 'Practise (not ranked)' : 'Play today\'s challenge'}
            </Button>
            {!online && ONLINE && <span className="text-xs text-muted">Sign in to be on the daily board.</span>}
          </div>
        )}

        {online && board && (
          <div>
            <h3 className="mb-1 text-sm font-bold">Today's board</h3>
            {board.entries.length === 0 ? <p className="text-xs text-ink-2">Nobody has finished yet. Be first.</p> : (
              <EntryList entries={board.entries} />
            )}
            {me && !me.finished && <div className="mt-1"><StatusPill kind="warn" label="Your run is not finished" /></div>}
          </div>
        )}
      </div>
    </Card>
  );
}
