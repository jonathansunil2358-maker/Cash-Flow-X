import { FIXED_MONTHS, formatGBP, INDUSTRIES, isoWeek, msUntilNextWeek, weeklyChallenge, type GameState } from '@cfx/engine';
import { useEffect, useState } from 'react';
import { countdown, EntryList, StartConfirm } from '../components/FixedBits';
import { WatchWinner } from './Community';
import { Button, Card, KeyValue, StatusPill } from '../components/ui';
import { useAccount } from '../lib/account';
import { api, ONLINE, type WeeklyBoard } from '../lib/api';
import { CURRENCY_ICONS } from '../lib/icons';
import { useGame } from '../store';

/** This week's shared company with a twist in the economy: ranked once, practise as often as you like. */
export function WeeklyEventCard({ game }: { game: GameState }) {
  const { start, save, toast, addGems } = useGame();
  const signedIn = !!useAccount((s) => s.me);
  const [week, setWeek] = useState(() => isoWeek());
  const [left, setLeft] = useState(() => msUntilNextWeek());
  const [board, setBoard] = useState<WeeklyBoard | null>(null);
  const [confirm, setConfirm] = useState<'ranked' | 'practice' | null>(null);
  const [claimed, setClaimed] = useState(false);
  const ch = weeklyChallenge(week);
  const ind = INDUSTRIES[ch.industryId];
  const playing = game.scenarioId === 'weekly' && game.status === 'playing';
  const online = ONLINE && signedIn;

  useEffect(() => {
    const t = setInterval(() => { setLeft(msUntilNextWeek()); if (isoWeek() !== week) setWeek(isoWeek()); }, 1000);
    return () => clearInterval(t);
  }, [week]);

  useEffect(() => {
    if (!online) return;
    let live = true;
    api.weekly(week).then((b) => { if (live) setBoard(b); }).catch(() => { if (live) setBoard(null); });
    return () => { live = false; };
  }, [online, week, game.status, game.month, claimed]);

  const go = (practice: boolean, saveFirst: boolean) => {
    if (saveFirst) save('3');
    setConfirm(null);
    void start({ companyName: ch.companyName, industryId: ch.industryId, seed: ch.seed, scenarioId: 'weekly', difficulty: 'medium', equipmentFinance: 'buy', icon: 'rocket', practice });
  };
  const claim = async () => {
    try {
      const r = await api.claimWeeklyEvent();
      addGems(r.gems, 'weekly event reward');
      setClaimed(true);
    } catch (e) {
      toast('error', (e as Error).message);
    }
  };

  const me = board?.me ?? null;
  const reward = board?.reward ?? null;
  return (
    <Card fold id="card-weekly" title="Weekly event"
      subtitle={`A shared company with a twist that lasts the whole game. ${FIXED_MONTHS} months, no perks or boosts. Top ten earn gems next week.`}
      actions={<span className="tnum rounded-[10px] border-2 border-outline bg-surface-2 px-2 py-1 text-xs font-black" aria-label="Time left this week">{countdown(left)}</span>}>
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-lg border border-line p-3">
          <span className="text-3xl" aria-hidden>{ind.emoji}</span>
          <div className="min-w-0">
            <div className="font-display text-lg leading-tight">{ch.companyName}</div>
            <div className="text-xs text-ink-2">{ind.name} · {FIXED_MONTHS} months · week {week.split('-W')[1]}</div>
          </div>
        </div>
        <div className="rounded-lg border-2 border-outline bg-surface-2 p-3 text-sm">
          <div className="font-display text-base leading-tight">Twist: {ch.twist.name}</div>
          <div className="text-xs text-ink-2">{ch.twist.blurb}</div>
        </div>
        {playing && <p className="text-sm font-bold">You are playing it now: month {game.month} of {FIXED_MONTHS}.</p>}
        {me?.finished && <KeyValue rows={[['Your result', me.status === 'insolvent' ? 'Went bust' : formatGBP(me.score, { compact: true })], ['Your rank this week', me.rank ? `#${me.rank}` : '—']]} />}
        {me && !me.finished && !playing && <p className="text-xs text-ink-2">You started this week's ranked run but did not finish it. There is one ranked attempt a week; practise below.</p>}
        {reward && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-outline p-2.5">
            <img src={CURRENCY_ICONS.gem} alt="" className="h-6 w-6" />
            <span className="text-sm font-bold">Last week you finished #{reward.rank}: {reward.gems} gems.</span>
            <Button variant="go" disabled={reward.claimed || claimed} onClick={claim}>{reward.claimed || claimed ? 'Claimed' : 'Claim'}</Button>
          </div>
        )}
        {confirm ? (
          <StartConfirm label="Start the weekly event" ranked={confirm === 'ranked' && online} onCancel={() => setConfirm(null)} onGo={(saveFirst) => go(confirm === 'practice', saveFirst)} />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {online && <WatchWinner kind="weekly" keyId={week} />}
            {online && !me && <Button variant="primary" disabled={playing} onClick={() => setConfirm('ranked')}>Play this week's event</Button>}
            <Button variant={online && !me ? 'secondary' : 'primary'} disabled={playing} onClick={() => setConfirm('practice')}>{online ? 'Practise (not ranked)' : "Play this week's event"}</Button>
            {!online && ONLINE && <span className="text-xs text-muted">Sign in to be on the weekly board.</span>}
          </div>
        )}
        {online && board && (
          <div>
            <h3 className="mb-1 text-sm font-bold">This week's board</h3>
            {board.entries.length === 0 ? <p className="text-xs text-ink-2">Nobody has finished yet. Be first.</p> : <EntryList entries={board.entries} />}
            {me && !me.finished && <div className="mt-1"><StatusPill kind="warn" label="Your run is not finished" /></div>}
          </div>
        )}
      </div>
    </Card>
  );
}
