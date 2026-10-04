import { Grouped } from '../components/Grouped';
import {
  ACHIEVEMENTS, AWARD_BOXES_PER_DAY, DAILY_PLAY_GEMS, dailyStatus, DAILY_REWARDS, formatGBP, levelForXp, LEVEL_UNLOCKS, missionStatus, playGemsOf, PRESTIGE_GEMS, utcDay,
  xpForLevel, type GameState, type MissionStatus,
} from '@cfx/engine';
import { Button, Card, Meter, PageTitle, StatusPill } from '../components/ui';
import { CURRENCY_ICONS, iconUrl } from '../lib/icons';
import { useGame } from '../store';
import { ChallengeCard } from './Challenges';
import { DailyChallengeCard } from './Daily';
import { QuestsCard, TrophyCard } from './Fun';
import { FestivalCard, RadioCard, TheatreCard, TimelapseCard } from './Feel';
import { MuseumCard, TrailsCard } from './Collect';
import { GamesCards } from './Minis';
import { AwardsNightCard, TimelineCard } from './Play5';
import { DiaryCard, DocumentaryCard, EomCard, NemesisCard, NewspaperCard, PetCard, ShareSeedCard } from './Personality';
import { AuditCard, DetectiveCard, GlossaryCard, InterviewCard, JournalCard, SpotCard, SprintCard } from './Learn';
import { ChallengesCard, DynastyCard, MasteryCard, SeasonPassCard, SkillsCard } from './Progress';
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

      <Grouped id="missions" groups={[
        {
          id: 'today', label: 'Today', blurb: 'What to do right now: quests, rewards, missions and challenges.',
          items: <>
            <NewspaperCard game={game} />
            <QuestsCard />
            <BoxesCard />
      <Card fold title="Daily reward" subtitle={daily.canClaim ? `Day ${daily.day} of your streak is ready.` : `Come back tomorrow for day ${Math.min(daily.day + 1, 7)}.`}>
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

            <DailyChallengeCard game={game} />
            <WeeklyEventCard game={game} />
            <ChallengeCard game={game} />
          </>,
        },
        {
          id: 'progress', label: 'Progress', blurb: 'Your level, skills, season pass, trophies and long-term goals.',
          items: <>
      <Card fold title={`Founder level ${level}`} subtitle={next ? `Level ${next.level} unlocks ${next.label}.` : 'Every feature unlocked.'}>
        <Meter value={profile.xp - from} max={to - from} label="XP to next level" text={`${(profile.xp - from).toLocaleString('en-GB')} / ${(to - from).toLocaleString('en-GB')} XP`} />
        <p className="mt-2 text-xs text-ink-2">XP: +5 per month, +5 more if profitable, +15 per decision, +10 per upgrade, +60 per mission, +25 per achievement. Each level pays gems.</p>
        <div className="mt-3">
          <Meter value={playGemsOf(profile, utcDay()).gems} max={DAILY_PLAY_GEMS} tone="go" label="Gems from play today"
            text={`Gems from play today: ${playGemsOf(profile, utcDay()).gems} / ${DAILY_PLAY_GEMS}`} />
          <p className="mt-1 text-xs text-ink-2">Missions and level-ups pay up to {DAILY_PLAY_GEMS} gems a day; after that they still give XP. The first prestige each day pays {PRESTIGE_GEMS} gems, and awards give up to {AWARD_BOXES_PER_DAY} mystery box a day. Daily rewards, quests, puzzles, the season pass and achievements are not limited.</p>
        </div>
      </Card>

            <SeasonPassCard />
            <SkillsCard />
      <Card fold title={`Achievements (${earned}/${ACHIEVEMENTS.length})`}>
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
            <TrailsCard />
            <MasteryCard />
            <ChallengesCard sector={game.industryId} />
            <DynastyCard />
            <TitlesCard />
            <TrophyCard game={game} />
            <AlbumCard />
            <MuseumCard />
            <AwardsNightCard game={game} />
            <TimelineCard game={game} />
          </>,
        },
        {
          id: 'learn', label: 'Learn', blurb: 'Puzzles, case studies and mini-games that teach you finance.',
          items: <>
            <SpotCard />
            <DetectiveCard />
            <JournalCard />
            <SprintCard />
            <InterviewCard game={game} />
            <GamesCards game={game} />
            <AuditCard game={game} />
            <GlossaryCard game={game} />
          </>,
        },
        {
          id: 'story', label: 'Story', blurb: 'Your rival, pet, diary, radio and the fun extras.',
          items: <>
            <NemesisCard game={game} />
            <PetCard game={game} />
            <EomCard game={game} />
            <DiaryCard game={game} />
            <ShareSeedCard game={game} />
            <DocumentaryCard game={game} />
            <TheatreCard game={game} />
            <RadioCard game={game} />
            <TimelapseCard game={game} />
            <FestivalCard />
          </>,
        },
      ]} />
    </div>
  );
}
