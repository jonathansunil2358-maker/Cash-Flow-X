import {
  ACHIEVEMENTS, dailyStatus, DAILY_REWARDS, formatGBP, levelForXp, LEVEL_UNLOCKS, missionStatus, xpForLevel, type GameState, type MissionStatus,
} from '@cfx/engine';
import { Button, Card, Meter, PageTitle, StatusPill } from '../components/ui';
import { CURRENCY_ICONS, iconUrl } from '../lib/icons';
import { useGame } from '../store';
import { ChallengeCard } from './Challenges';
import { DailyChallengeCard } from './Daily';
import { QuestsCard, TrophyCard } from './Fun';
import { TheatreCard } from './Feel';
import { MuseumCard, TrailsCard } from './Collect';
import { GamesCards } from './Minis';
import { DiaryCard, DocumentaryCard, EomCard, NemesisCard, NewspaperCard, PetCard, ShareSeedCard } from './Personality';
import { AuditCard, DetectiveCard, GlossaryCard, InterviewCard, JournalCard, SpotCard, SprintCard } from './Learn';
import { MasteryCard, SeasonPassCard, SkillsCard } from './Progress';
import { AlbumCard, BoxesCard } from './Surprise';
import { TitlesCard } from './Titles';
import { WeeklyEventCard } from './Weekly';

const today = () => new Date().toISOString().slice(0, 10);

function fmtValue(st: MissionStatus, v: number | null): string {
  if (v === null) return '—';
  switch (st.format) {
    case 'gbp': return formatGBP(v, { compact: true });
    case 'x': return `${v.toFixed(2)}x`;
    case 'days': return `${Math.round(v)} days`;
    case 'months': return `${v.toFixed(1)} months`;
    default: return Math.round(v).toLocaleString('en-GB');
  }
}

/** Founder level, daily reward, live missions and achievements. */
export function Missions({ game }: { game: GameState }) {
  const { profile, claimDaily } = useGame();
  const level = levelForXp(profile.xp);
  const from = xpForLevel(level);
  const to = xpForLevel(level + 1);
  const daily = dailyStatus(profile.daily, today());
  const missions = profile.missions.map((m) => missionStatus(m, game));
  const next = LEVEL_UNLOCKS.find((u) => u.level > level);
  const earned = ACHIEVEMENTS.filter((a) => profile.achievements[a.id]).length;

  return (
    <div className="space-y-5">
      <PageTitle title="Missions" subtitle="Earn XP and gems by running your business well. Missions change as you complete them, and each one teaches a bit of finance." />

      <NewspaperCard game={game} />
      <QuestsCard />
      <BoxesCard />
      <SeasonPassCard />
      <SkillsCard />
      <DailyChallengeCard game={game} />
      <WeeklyEventCard game={game} />
      <ChallengeCard game={game} />

      <Card title={`Founder level ${level}`} subtitle={next ? `Level ${next.level} unlocks ${next.label}.` : 'Every feature unlocked.'}>
        <Meter value={profile.xp - from} max={to - from} label="XP to next level" text={`${(profile.xp - from).toLocaleString('en-GB')} / ${(to - from).toLocaleString('en-GB')} XP`} />
        <p className="mt-2 text-xs text-ink-2">XP: +5 per month, +5 more if profitable, +15 per decision, +10 per upgrade, +60 per mission, +25 per achievement. Each level pays gems.</p>
      </Card>

      <Card title="Daily reward" subtitle={daily.canClaim ? `Day ${daily.day} of your streak is ready.` : `Come back tomorrow for day ${Math.min(daily.day + 1, 7)}.`}>
        <div className="grid grid-cols-7 gap-1.5" aria-label="Streak rewards">
          {DAILY_REWARDS.map((g, i) => {
            const done = i < daily.day - (daily.canClaim ? 1 : 0);
            const current = daily.canClaim && i === daily.day - 1;
            return (
              <div key={i} className={`flex flex-col items-center rounded-xl border-[3px] p-1.5 text-center ${current ? 'border-accent bg-surface-2' : 'border-outline'} ${done ? 'opacity-50' : ''}`}>
                <span className="text-[10px] font-black uppercase text-ink-2">Day {i + 1}</span>
                <img src={CURRENCY_ICONS.gem} alt="" className="h-6 w-6" />
                <span className="text-xs font-black">{g}</span>
              </div>
            );
          })}
        </div>
        <Button variant="go" className="mt-3" disabled={!daily.canClaim} onClick={claimDaily}>
          {daily.canClaim ? `Claim ${daily.gems} gems` : 'Claimed today'}
        </Button>
      </Card>

      <Card title="Missions">
        <div className="space-y-3">
          {missions.length === 0 && <p className="text-sm text-ink-2">New missions arrive at the end of the month.</p>}
          {missions.map((st) => (
            <div key={st.mission.id} className="rounded-2xl border-[3px] border-outline bg-surface-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="font-display text-lg leading-tight">{st.title}</div>
                <span className="flex shrink-0 items-center gap-1 text-xs font-black"><img src={CURRENCY_ICONS.gem} alt="gems" className="h-4 w-4" />{st.mission.rewardGems} · {st.mission.rewardXp} XP</span>
              </div>
              <p className="mt-1 text-xs text-ink-2">{st.hint}</p>
              <div className="mt-2">
                <Meter value={st.progress} label={st.title} tone="go" text={`${fmtValue(st, st.current)} of ${fmtValue(st, st.target)}`} />
              </div>
            </div>
          ))}
          <p className="text-xs text-ink-2">{profile.missionsCompleted} missions completed so far.</p>
        </div>
      </Card>

      <TrophyCard game={game} />

      <AlbumCard />

      <SpotCard />
      <DetectiveCard />
      <JournalCard />
      <SprintCard />
      <InterviewCard game={game} />
      <GamesCards game={game} />
      <AuditCard game={game} />
      <GlossaryCard game={game} />
      <NemesisCard game={game} />
      <PetCard game={game} />
      <EomCard game={game} />
      <DiaryCard game={game} />
      <ShareSeedCard game={game} />
      <DocumentaryCard game={game} />
      <TheatreCard game={game} />
      <TrailsCard />
      <MasteryCard />
      <MuseumCard />
      <TitlesCard />

      <Card title={`Achievements (${earned}/${ACHIEVEMENTS.length})`}>
        <div className="grid gap-2 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a) => {
            const got = profile.achievements[a.id];
            return (
              <div key={a.id} className={`flex items-center gap-3 rounded-2xl border-[3px] border-outline p-2.5 ${got ? 'bg-surface-2' : 'opacity-60'}`}>
                <img src={a.icon === 'coin' ? CURRENCY_ICONS.coin : iconUrl(a.icon)} alt="" className={`h-10 w-10 ${got ? '' : 'grayscale'}`} />
                <div className="min-w-0 text-sm">
                  <div className="font-display text-base leading-tight">{a.hidden && !got ? '???' : a.name}</div>
                  <div className="text-xs text-ink-2">{a.hidden && !got ? 'A hidden achievement. Keep playing to find it.' : a.description}</div>
                </div>
                <div className="ml-auto shrink-0">{got ? <StatusPill kind="good" label="Done" /> : <span className="text-xs font-black">+{a.gems} gems</span>}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
