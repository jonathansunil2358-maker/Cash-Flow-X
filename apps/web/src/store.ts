import { playSound } from './lib/sfx';
import {
  ActionError, advanceMonth, applyAction, INDUSTRIES, applyBankruptcy, applyPrestige, applyRetirement, buyPerk as buyPerkOnProfile, claimDaily as claimDailyReward,
  levelForXp, missionStatus, newAchievements, newGame, newProfile, offlineMonthsFor, plSummary, rebirthCheck, refillMissions, runOffline,
  hearTip as hearTipOn, addCard as addCardOn, takeForGift as takeForGiftOn, collectCards, cardDef, recordMini as recordMiniOn, rememberNemesis, campaignChapter, scenarioOf,
  adoptPet as adoptPetOn, nameEom as nameEomOn, setBuildingName as setBuildingNameOn, writeDiary as writeDiaryOn, buyHat as buyHatOn, wearHat as wearHatOn, buyLand as buyLandOn, claimTrail as claimTrailOn, buyTrack as buyTrackOn, selectTrack as selectTrackOn, IRONMAN_ID, recordSprint as recordSprintOn, recordInterview as recordInterviewOn, addBoxes, addPassPoints, grantAwardBoxes, payPlayGems, payPrestigeGems, recordAnswer, seeTerm as seeTermOn, type PuzzleKind, newMilestones, claimPass as claimPassTier, learnSkill as learnSkillOn, planSlotsOf, deletePlan, savePlan, awardPrestige, buyDecor as buyDecorItem, setLogo as setLogoOnProfile, toggleDecor as toggleDecorItem, yearReview, type Logo, type YearReview, claimAlbumPage, grantSticker, openBox as openBoxReward, claimQuest as claimQuestReward, recordQuest, utcDay, type QuestEvent, buySkin, compactForServer, ownerStakeOf, equipSkin, isFixedScenario, isTitleId, RULES_VERSION, spendGemsOnBoost, stateChecksum, XP_REWARDS, type Action, type BoostId, type DifficultyId, type GameState, type NewGameOptions, type OfflineSummary,
  type BoxOpening, type Profile, type Rng,
  claimInheritance as claimInheritanceOn, newlyMet, CHALLENGE_GEMS,
} from '@cfx/engine';
import { create } from 'zustand';
import { useAccount } from './lib/account';
import { startingMarketing } from './lib/coach';
import { api, ApiError, ONLINE, type Me } from './lib/api';
import { consumeUpgrade, loadGame, loadProfile, readPref, saveGame, saveProfile, writePref, type SlotId } from './lib/save';

/** Panels opened from the dock and HUD. */
export type Sheet = 'team' | 'upgrades' | 'finance' | 'missions' | 'books' | 'legacy' | 'social' | 'settings';
export type BooksTab = 'overview' | 'statements' | 'analysis' | 'forecast' | 'valuation' | 'market' | 'ledger';
export type Speed = 0 | 1 | 2 | 4;

/** Real milliseconds per game month at x1. */
export const MONTH_MS = 10_000;

export interface Toast {
  id: number;
  kind: 'error' | 'success' | 'info' | 'good' | 'bad';
  text: string;
  icon?: string;
}

export interface Celebration {
  id: number;
  kind: 'achievement' | 'level' | 'mission' | 'milestone';
  title: string;
  text: string;
  gems: number;
}

export interface Pop {
  id: number;
  text: string;
  good: boolean;
}

export interface SetupPreset {
  reason: 'rebirth' | 'prestige' | 'new';
  difficulty?: DifficultyId;
  lockDifficulty?: boolean;
}

interface Store {
  game: GameState | null;
  profile: Profile;
  undoStack: GameState[];
  sheet: Sheet | null;
  booksTab: BooksTab;
  speed: Speed;
  /** 0-1 progress through the current month (real-time clock). */
  monthProgress: number;
  pauseOnPanels: boolean;
  /** Render the 3D scene (off = a light 2D view for low-end devices). */
  scene3d: boolean;
  toasts: Toast[];
  celebrations: Celebration[];
  pops: Pop[];
  offline: OfflineSummary | null;
  preset: SetupPreset | null;
  /** The sector walkthrough is showing (the clock stops while it is open). */
  tourOpen: boolean;
  setTourOpen: (open: boolean) => void;
  /** `practice` plays the daily challenge without registering it for the board. */
  start: (opts: Omit<NewGameOptions, 'perks' | 'boosts' | 'prestigeLevel'> & { practice?: boolean; challengeCode?: string }) => Promise<void>;
  /** Send new decisions to the server for verification (online runs). */
  syncNow: () => Promise<void>;
  /** Carry an online company that was started on an older version over to the server (once). */
  carryOver: () => Promise<void>;
  /** Reload the account and merge server-owned progress into the profile. */
  refreshAccount: () => Promise<void>;
  acceptOffer: (offer: Me['investments']['offers'][number]) => void;
  declineOffer: (id: string) => Promise<void>;
  addGems: (gems: number, reason: string) => void;
  act: (action: Action, success?: string) => boolean;
  undo: () => void;
  closeMonth: () => void;
  tickClock: (elapsedMs: number) => void;
  setSpeed: (s: Speed) => void;
  setPauseOnPanels: (v: boolean) => void;
  setScene3d: (v: boolean) => void;
  catchUp: (awayMs: number) => void;
  dismissOffline: () => void;
  load: (slot: SlotId) => boolean;
  save: (slot: SlotId) => boolean;
  quit: () => void;
  endBankruptRun: (rebirth: boolean) => void;
  nextRun: () => void;
  /** A company sold under the old prestige rules carries on instead (one rank higher). */
  resumeSold: () => void;
  buyPerk: (perkId: string) => Promise<void>;
  buyBoost: (boostId: BoostId) => void;
  claimDaily: () => void;
  /** Cosmetics and founder titles (never affect a score). */
  review: YearReview | null;
  dismissReview: () => void;
  buyDecor: (id: string) => void;
  toggleDecor: (id: string) => void;
  setLogo: (logo: Partial<Logo>) => void;
  savePlanAction: (plan: unknown) => void;
  deletePlanAction: (id: string) => void;
  claimQuest: (id: string) => void;
  learnSkill: (id: string) => void;
  adoptPet: (kind: string, name: string) => void;
  buyLand: (id: string) => void;
  claimTrail: (id: string) => void;
  buyTrack: (id: string) => void;
  selectTrack: (id: string) => void;
  nameEom: (personId: string) => void;
  setBuildingName: (id: string, name: string) => void;
  writeDiary: (entry: { year: number; company: string; note: string; facts: string }) => void;
  buyHat: (id: string) => void;
  wearHat: (id: string | null) => void;
  answerPuzzle: (kind: PuzzleKind, day: string, right: boolean) => void;
  seeTerm: (id: string) => void;
  finishSprint: (day: string, points: number, gems: number) => void;
  hearTip: (id: string) => void;
  addCardGift: (id: string) => void;
  claimInheritance: () => void;
  takeSpareCard: (id: string) => boolean;
  finishMini: (kind: 'negotiate' | 'pitch' | 'stocktake' | 'tetris', day: string, points: number) => void;
  finishInterview: (key: string, right: number, gems: number) => void;
  claimPass: () => void;
  openBox: () => BoxOpening<Profile> | null;
  claimAlbumPage: (pageId: string) => void;
  buySkin: (id: string) => void;
  equipSkin: (id: string) => void;
  setTitle: (id: string | null) => void;
  /** Open a panel; `scrollTo` is the id of a card inside it to bring into view. */
  openSheet: (s: Sheet | null, tab?: BooksTab, scrollTo?: string) => void;
  /** The upgrade picked by tapping its building or plot on the island. */
  sceneFocus: string | null;
  setSceneFocus: (id: string | null) => void;
  setBooksTab: (t: BooksTab) => void;
  toast: (kind: Toast['kind'], text: string, icon?: string) => void;
  dismissToast: (id: number) => void;
  dismissCelebration: () => void;
}

/** Achievements that also give a sticker for the album. */
const ACHIEVEMENT_STICKER: Record<string, string> = {
  first_profit: 'general-0', board_first: 'general-1', storm_survivor: 'general-2', award_first: 'general-3', big_bet_win: 'general-4', rumour_hound: 'general-5',
};

/** Which daily quest an action counts towards. */
const QUEST_OF_ACTION: Partial<Record<Action['type'], QuestEvent>> = {
  resolveEvent: 'decision', buyUpgrade: 'upgrade', hire: 'hire', startPromo: 'promo', startProject: 'project', setPrice: 'price',
};

let nextId = 1;
let syncing = false;
let carrying = false;
const UPGRADE_NOTICE = 'Your company was upgraded: seasons, promotions, morale and pay, R&D projects, rivals that react and a prestige rank are now in play. See the Business panel.';
/** Sync online runs at least once per in-game year. */
const SYNC_EVERY_MONTHS = 12;
const mathRng: Rng = { next: () => Math.random() };
const today = () => new Date().toISOString().slice(0, 10);

/** Fields of the profile the server owns (earned only through verified runs). */
const SERVER_FIELDS = ['legacyPoints', 'legacyEarned', 'prestigeCount', 'perks'] as const;

let backupTimer: ReturnType<typeof setTimeout> | undefined;
/** Back up the client-owned part of the profile (gems, XP, achievements…) to the account. */
function scheduleBackup(p: Profile) {
  if (!ONLINE || useAccount.getState().status !== 'ready') return;
  clearTimeout(backupTimer);
  backupTimer = setTimeout(() => {
    const savedAt = new Date().toISOString();
    writePref('profileSavedAt', savedAt);
    const client: Record<string, unknown> = { ...p, savedAt };
    for (const f of SERVER_FIELDS) delete client[f];
    api.updateMe({ client }).catch(() => { /* retried on the next change */ });
  }, 4000);
}

const persistProfile = (p: Profile) => {
  saveProfile(p);
  scheduleBackup(p);
  return p;
};

/**
 * Combine the local profile with the account: server-owned fields always win; the client-owned
 * part comes from whichever copy was saved last (so progress follows you between devices).
 */
export function mergeProfile(local: Profile, me: Me): Profile {
  const server = me.user.client as Partial<Profile> & { savedAt?: string };
  const localSavedAt = readPref('profileSavedAt') ?? '';
  const base = server.savedAt && server.savedAt > localSavedAt ? { ...local, ...server, version: local.version } : local;
  return {
    ...(base as Profile), legacyPoints: me.user.legacyPoints, legacyEarned: me.user.legacyEarned,
    prestigeCount: me.user.prestigeCount, perks: me.user.perks,
  };
}

/**
 * Award XP, achievements, missions and level-ups after the game state changes. Pure with respect
 * to the game: only the profile and UI queues change.
 */
const PLAY_LIMIT_NOTE = "Today's gems from play are used up, so this one pays XP only. More tomorrow.";

function progressAfter(
  profile: Profile, before: GameState, after: GameState, extraXp: number,
): { profile: Profile; celebrations: Celebration[] } {
  const celebrations: Celebration[] = [];
  let p = { ...profile };
  let xp = extraXp;
  const closed = after.month - before.month;
  if (closed > 0 && after.history.length) {
    xp += XP_REWARDS.monthClosed * closed;
    if (plSummary(after.history[after.history.length - 1].period.pl).profit > 0) xp += XP_REWARDS.profitableMonth;
  }
  // Repeatable play (missions, level-ups, award boxes) pays gems up to a daily allowance.
  const day = utcDay();
  const newAwards = (after.awards?.length ?? 0) - (before.awards?.length ?? 0);
  if (newAwards > 0) p = grantAwardBoxes(p, day, newAwards).profile;
  if (closed > 0) p = addPassPoints(p, closed);
  if (closed > 0) {
    const got = collectCards(p, after);
    p = got.profile;
    for (const id of got.gained) celebrations.push({ id: nextId++, kind: 'milestone', title: `New card: ${cardDef(id)!.name}`, text: cardDef(id)!.text, gems: 0 });
  }
  // A company just ended: remember its strongest rival as your nemesis, and mark a campaign chapter done if you cleared it.
  if (before.status === 'playing' && after.status !== 'playing') {
    p = rememberNemesis(p, after, ownerStakeOf(after));
    const ch = campaignChapter(after.scenarioId);
    if (ch && after.status === 'finished' && scenarioOf(after.scenarioId).objectives!(after).every((o) => o.met) && !(p.campaign ?? []).includes(ch.n)) {
      p = { ...p, campaign: [...(p.campaign ?? []), ch.n], gems: p.gems + 25 };
      celebrations.push({ id: nextId++, kind: 'milestone', title: `Chapter ${ch.n} complete: ${ch.title}`, text: ch.n === 10 ? 'You finished the story. What a journey.' : 'The next chapter is unlocked on the start screen.', gems: 25 });
    }
  }
  // Mastery challenges: hand-picked perfect-run goals pay once, ever.
  if (closed > 0) {
    for (const c of newlyMet(after, p)) {
      p = { ...p, mchallenges: [...(p.mchallenges ?? []), c.id], gems: p.gems + CHALLENGE_GEMS };
      celebrations.push({ id: nextId++, kind: 'milestone', title: `Challenge met: ${c.name}`, text: c.text, gems: CHALLENGE_GEMS });
    }
  }
  // Speedrun: remember the best time on this device.
  if (after.speedrunMonth !== undefined && before.speedrunMonth === undefined) {
    const better = !p.speedBest || after.speedrunMonth < p.speedBest;
    if (better) p = { ...p, speedBest: after.speedrunMonth };
    celebrations.push({ id: nextId++, kind: 'milestone', title: `A £1m company in ${after.speedrunMonth} months!`, text: better ? 'A new personal best.' : `Your best is ${p.speedBest} months.`, gems: 0 });
  }
  if (closed > 0 || extraXp > 0) {
    for (const a of newAchievements(after, p.achievements)) {
      p = { ...p, achievements: { ...p.achievements, [a.id]: today() }, gems: p.gems + a.gems };
      const sticker = ACHIEVEMENT_STICKER[a.id];
      if (sticker) p = grantSticker(p, sticker);
      xp += 25;
      celebrations.push({ id: nextId++, kind: 'achievement', title: a.name, text: a.description, gems: a.gems });
    }
    // Firsts get a party. A player who was never tracked before is caught up silently.
    const ms = newMilestones(after, p.milestones);
    p = { ...p, milestones: ms.seen };
    for (const m of ms.celebrate) {
      p = { ...p, gems: p.gems + 20 };
      celebrations.push({ id: nextId++, kind: 'milestone', title: m.title, text: m.text, gems: 20 });
    }
    const missions = refillMissions(p.missions, after, mathRng);
    const remaining = [];
    for (const m of missions) {
      const st = missionStatus(m, after);
      if (st.done) {
        const pay = payPlayGems({ ...p, missionsCompleted: p.missionsCompleted + 1 }, day, m.rewardGems);
        p = addPassPoints(pay.profile, 5);
        xp += m.rewardXp;
        celebrations.push({ id: nextId++, kind: 'mission', title: 'Mission complete', text: pay.paid < m.rewardGems ? `${st.title}. ${PLAY_LIMIT_NOTE}` : st.title, gems: pay.paid });
      } else remaining.push(m);
    }
    p = { ...p, missions: refillMissions(remaining, after, mathRng) };
  }
  if (xp > 0) {
    const oldLevel = levelForXp(p.xp);
    p = { ...p, xp: p.xp + xp };
    const newLevel = levelForXp(p.xp);
    for (let l = oldLevel + 1; l <= newLevel; l++) {
      const pay = payPlayGems(p, utcDay(), XP_REWARDS.levelUpGemsPerLevel * l);
      p = pay.profile;
      celebrations.push({ id: nextId++, kind: 'level', title: `Founder level ${l}!`, text: pay.paid ? 'You are getting better at this.' : `You are getting better at this. ${PLAY_LIMIT_NOTE}`, gems: pay.paid });
    }
  }
  return { profile: p, celebrations };
}

function popsFor(before: GameState, after: GameState): Pop[] {
  if (after.month === before.month || !after.history.length) return [];
  const pl = plSummary(after.history[after.history.length - 1].period.pl);
  const cash = after.ledger.balances.cash - before.ledger.balances.cash;
  const fmt = (p: number) => `${p >= 0 ? '+' : '−'}£${Math.abs(Math.round(p / 100)).toLocaleString('en-GB')}`;
  const out: Pop[] = [{ id: nextId++, text: `${fmt(pl.profit)} profit`, good: pl.profit >= 0 }, { id: nextId++, text: `${fmt(cash)} cash`, good: cash >= 0 }];
  // The crowd reacts: a cheer or a groan for the big moments.
  if (after.board?.last && (after.board.hits !== before.board?.hits || after.board.misses !== before.board?.misses)) {
    out.push(after.board.last === 'hit' ? { id: nextId++, text: '👏 The board is delighted!', good: true } : { id: nextId++, text: '😬 The board is not happy', good: false });
  }
  if ((after.awards?.length ?? 0) > (before.awards?.length ?? 0)) out.push({ id: nextId++, text: '🏆 Award winner!', good: true });
  const ev = after.lastEvent;
  if (ev && ev !== before.lastEvent && ev.month === before.month && !after.pendingEvent) out.push({ id: nextId++, text: ev.polarity === 'good' ? '😀 Good news!' : '😟 Bad news', good: ev.polarity === 'good' });
  return out;
}

export const useGame = create<Store>((set, get) => {
  /** Commit a new game state: save, award progress, surface news. */
  const commit = (before: GameState, after: GameState, extraXp = 0, extra: Partial<Store> = {}) => {
    saveGame('autosave', after);
    const { profile, celebrations } = progressAfter(get().profile, before, after, extraXp);
    persistProfile(profile);
    set({
      game: after, profile, celebrations: [...get().celebrations, ...celebrations].slice(-6),
      pops: [...get().pops, ...popsFor(before, after)].slice(-6), ...extra,
    });
    // Each kind of news has its own sound.
    const rivalMove = after.competitors.some((c, i) => c.cutMonths > 0 && !(before.competitors[i]?.cutMonths > 0));
    const boardResult = !!after.board?.last && (after.board.hits !== before.board?.hits || after.board.misses !== before.board?.misses);
    if (celebrations.some((c) => c.kind === 'milestone')) playSound('confetti');
    else if (celebrations.length) playSound('fanfare');
    else if ((after.awards?.length ?? 0) > (before.awards?.length ?? 0)) playSound('award');
    else if (boardResult) playSound(after.board!.last === 'hit' ? 'board' : 'bad');
    else if (rivalMove) playSound('rival');
    else if (after.pendingEvent && !before.pendingEvent) playSound('event');
    const ev = after.lastEvent;
    if (ev && ev !== before.lastEvent && ev.month === before.month && !after.pendingEvent) {
      get().toast(ev.polarity === 'good' ? 'good' : 'bad', `${ev.title}: ${ev.text}`);
      if (!celebrations.length) playSound(ev.polarity === 'good' ? 'good' : 'bad');
    }
  };

  return {
    game: loadGame('autosave'),
    profile: loadProfile() ?? newProfile(),
    undoStack: [],
    sheet: null,
    booksTab: 'overview',
    speed: 1,
    monthProgress: 0,
    pauseOnPanels: readPref('pauseOnPanels') !== 'false',
    scene3d: readPref('scene3d') !== 'false',
    toasts: [],
    review: null,
    celebrations: [],
    pops: [],
    offline: null,
    preset: null,
    tourOpen: false,
    sceneFocus: null,

    async start(opts) {
      const { profile } = get();
      let game: GameState;
      const fixed = isFixedScenario(opts.scenarioId);
      const ranked = ONLINE && ((opts.scenarioId ?? 'standard') === 'standard' || (fixed && !opts.practice));
      if (ranked) {
        // Register the company first: the server fixes its perks and prestige level.
        try {
          const r = await api.createRun({
            seed: opts.seed, industryId: opts.industryId, difficulty: opts.difficulty ?? 'medium', equipmentFinance: opts.equipmentFinance ?? 'buy',
            companyName: opts.companyName, icon: opts.icon ?? 'rocket', boosts: profile.boosts, rulesVersion: RULES_VERSION, modifiers: opts.modifiers,
            ...(opts.scenarioId === 'daily' ? { daily: true } : opts.scenarioId === 'weekly' ? { weekly: true } : opts.scenarioId === 'challenge' ? { challenge: opts.challengeCode } : {}),
          });
          game = newGame({ ...opts, companyName: r.companyName, perks: r.perks, boosts: r.boosts, prestigeLevel: r.prestigeLevel, modifiers: r.modifiers });
          game.server = { runId: r.runId, synced: 0, syncedMonth: 0 };
        } catch (e) {
          get().toast('error', (e as Error).message);
          return;
        }
      } else {
        game = newGame({ ...opts, perks: profile.perks, boosts: profile.boosts, prestigeLevel: profile.prestigeCount });
      }
      if (game.marketingBudget === 0 && ((opts.scenarioId ?? 'standard') === 'standard' || fixed)) {
        game = applyAction(game, { type: 'setMarketing', amount: startingMarketing(INDUSTRIES[game.industryId]) });
      }
      saveGame('autosave', game);
      const p = persistProfile({ ...profile, missions: refillMissions(profile.missions, game, mathRng) });
      set({ game, profile: p, undoStack: [], sheet: null, monthProgress: 0, preset: null, speed: 1,
        tourOpen: readPref(`tour:${game.industryId}`) !== 'done' });
    },

    act(action, success) {
      const { game } = get();
      if (!game) return false;
      try {
        const next = applyAction(game, action);
        const xp = action.type === 'resolveEvent' ? XP_REWARDS.decision : action.type === 'buyUpgrade' ? XP_REWARDS.upgrade : 0;
        if (action.type === 'prestige') {
          // The company carries on: bank the points and rank, keep playing.
          const points = next.prestigeAward - game.prestigeAward;
          const banked = payPrestigeGems(awardPrestige(get().profile, points, ownerStakeOf(game)), utcDay());
          commit(game, next, 0, { undoStack: [], profile: persistProfile(banked.profile), sheet: null });
          get().toast('success', banked.paid ? `Prestige! +${points} Legacy points and +${banked.paid} gems.` : `Prestige! +${points} Legacy points. (Prestige gems are paid once a day.)`);
          playSound('success');
        } else if (next.status === 'prestiged') {
          const prestiged = payPrestigeGems(applyPrestige(get().profile, next), utcDay()).profile;
          saveGame('autosave', next);
          set({ game: next, undoStack: [], profile: persistProfile(prestiged), sheet: null });
        } else {
          commit(game, next, xp, { undoStack: [...get().undoStack.slice(-19), game] });
        }
        const qe = QUEST_OF_ACTION[action.type];
        if (qe) set({ profile: persistProfile(recordQuest(get().profile, utcDay(), qe)) });
        if (success) get().toast('success', success);
        // Runs that end, and holding company deals, are verified straight away.
        if (next.status !== 'playing' || ['acceptInvestment', 'buyOutInvestors', 'payDividend'].includes(action.type)) void get().syncNow();
        return true;
      } catch (e) {
        if (e instanceof ActionError) {
          get().toast('error', e.message);
          return false;
        }
        throw e;
      }
    },

    undo() {
      if ((get().game?.modifiers ?? []).includes(IRONMAN_ID)) { get().toast('error', 'Ironman: there is no undo.'); return; }
      const stack = get().undoStack;
      const prev = stack[stack.length - 1];
      if (!prev) return;
      saveGame('autosave', prev);
      set({ game: prev, undoStack: stack.slice(0, -1) });
      get().toast('info', 'Last decision undone.');
    },

    closeMonth() {
      const { game } = get();
      if (!game || game.status !== 'playing' || game.pendingEvent) return;
      const next = advanceMonth(game);
      commit(game, next, 0, { undoStack: [], monthProgress: 0 });
      if (next.status === 'playing' && next.month % 12 === 0 && next.month > game.month) set({ review: yearReview(next) });
      // Daily quests: a month closed, a profitable month, a board target beaten.
      let q = recordQuest(get().profile, utcDay(), 'month');
      const last = next.history.at(-1);
      if (last && plSummary(last.period.pl).profit > 0) q = recordQuest(q, utcDay(), 'profit');
      if ((next.board?.hits ?? 0) > (game.board?.hits ?? 0)) q = recordQuest(q, utcDay(), 'board');
      if (q !== get().profile) set({ profile: persistProfile(q) });
      if (next.server && (next.month - next.server.syncedMonth >= SYNC_EVERY_MONTHS || next.status !== 'playing')) void get().syncNow();
    },

    async syncNow() {
      const game = get().game;
      if (!game?.server || game.server.flagged || game.server.carry === 'pending' || syncing) return;
      if (game.pendingEvent) return; // the decision is part of this month's log; sync after it
      const from = game.server.synced;
      if (from === game.actionLog.length && game.month === game.server.syncedMonth) return;
      syncing = true;
      set({ undoStack: [] }); // synced decisions can't be undone
      const actions = game.actionLog.slice(from) as { month: number; action: Action }[];
      const month = game.month;
      try {
        const r = await api.syncRun(game.server.runId, { fromAction: from, actions, month, checksum: stateChecksum(game) });
        const cur = get().game;
        if (cur?.server?.runId === game.server.runId) {
          const updated = { ...cur, server: { ...cur.server, synced: r.actionsVerified, syncedMonth: month } };
          saveGame('autosave', updated);
          set({ game: updated });
        }
        if (r.status !== 'playing') await get().refreshAccount();
      } catch (e) {
        const err = e as ApiError;
        const cur = get().game;
        if (err.status === 409 && err.body.code === 'CARRYOVER_REQUIRED' && cur?.server) {
          // The server still has this company on the old rules: carry it over first, then sync as normal.
          const updated = { ...cur, server: { ...cur.server, carry: 'pending' as const } };
          set({ game: updated });
          saveGame('autosave', updated);
          void get().carryOver();
        } else if (err.status === 409 && typeof err.body.resendFrom === 'number' && cur?.server) {
          // The server is at a different point (another tab, a lost response): resend from there.
          const updated = { ...cur, server: { ...cur.server, synced: err.body.resendFrom as number } };
          set({ game: updated });
          saveGame('autosave', updated);
        } else if (err.status === 422 && cur?.server) {
          const updated = { ...cur, server: { ...cur.server, flagged: err.message } };
          set({ game: updated });
          saveGame('autosave', updated);
          get().toast('error', `${err.message} This company no longer counts for leaderboards.`);
        }
        // Network errors: try again at the next sync point.
      } finally {
        syncing = false;
      }
    },

    async carryOver() {
      const game = get().game;
      if (!game?.server || game.server.carry !== 'pending' || game.status !== 'playing' || carrying) return;
      carrying = true;
      const runId = game.server.runId;
      try {
        const r = await api.carryOver(runId, { state: compactForServer(game), actions: game.actionLog.length });
        const cur = get().game;
        if (cur?.server?.runId === runId) {
          const updated = { ...cur, server: { ...cur.server, synced: r.actionsVerified, syncedMonth: r.month, carry: 'done' as const } };
          saveGame('autosave', updated);
          set({ game: updated });
        }
      } catch (e) {
        const err = e as ApiError;
        const cur = get().game;
        // Offline or signed out: try again later. A refusal means this company cannot be ranked, but it still plays on.
        if ([409, 422].includes(err.status) && cur?.server?.runId === runId) {
          const note = err.status === 409 && /already on the current version/.test(err.message) ? undefined : err.message;
          const updated = { ...cur, server: { ...cur.server, carry: note ? 'failed' as const : 'done' as const, ...(note ? { flagged: note } : {}) } };
          saveGame('autosave', updated);
          set({ game: updated });
          if (note) get().toast('info', `${note} It carries on, but will not count for leaderboards.`);
        }
      } finally {
        carrying = false;
      }
    },

    async refreshAccount() {
      const me = await useAccount.getState().refresh();
      if (!me) return;
      void get().carryOver();
      set({ profile: persistProfile(mergeProfile(get().profile, me)) });
      const game = get().game;
      const level = me.guild?.level ?? 0;
      if (game && game.status === 'playing' && !game.pendingEvent && game.guildLevel !== level && game.server && !game.server.flagged) {
        get().act({ type: 'setGuildLevel', level });
      }
    },

    acceptOffer(offer) {
      const ok = get().act({
        type: 'acceptInvestment', investmentId: offer.id, investorId: offer.investorId, investorName: offer.investorName,
        amount: offer.amount, preMoney: offer.preMoney,
      }, `${offer.investorName} is now a shareholder.`);
      if (ok) void get().refreshAccount();
    },

    async declineOffer(id) {
      try {
        await api.declineInvestment(id);
        get().toast('info', 'Offer declined; the money went back to the investor.');
        await get().refreshAccount();
      } catch (e) {
        get().toast('error', (e as Error).message);
      }
    },

    addGems(gems, reason) {
      set({ profile: persistProfile({ ...get().profile, gems: get().profile.gems + gems }) });
      get().toast('good', `+${gems} gems: ${reason}`);
    },

    tickClock(elapsedMs) {
      const { game, speed, sheet, pauseOnPanels } = get();
      if (!game || game.status !== 'playing' || game.pendingEvent || speed === 0 || get().tourOpen) return;
      if (pauseOnPanels && sheet) return;
      const progress = get().monthProgress + (elapsedMs * speed) / MONTH_MS;
      if (progress >= 1) get().closeMonth();
      else set({ monthProgress: progress });
    },

    setTourOpen(open) {
      const { game } = get();
      if (!open && game) writePref(`tour:${game.industryId}`, 'done');
      set({ tourOpen: open, ...(open ? { sheet: null } : {}) });
    },

    setSpeed(speed) {
      set({ speed });
    },

    setScene3d(v) {
      writePref('scene3d', String(v));
      set({ scene3d: v });
    },

    setPauseOnPanels(v) {
      writePref('pauseOnPanels', String(v));
      set({ pauseOnPanels: v });
    },

    catchUp(awayMs) {
      const { game } = get();
      if (!game || game.status !== 'playing' || game.pendingEvent) return;
      const months = offlineMonthsFor(game, awayMs);
      if (months <= 0) return;
      const next = structuredClone(game);
      // Keep each server sync within its 36-month window.
      const summary = runOffline(next, Math.min(months, next.server ? 18 : months));
      if (summary.months > 0) {
        commit(game, next, 0, { offline: summary, undoStack: [], monthProgress: 0 });
        void get().syncNow();
      }
    },

    dismissOffline() {
      set({ offline: null });
    },

    load(slot) {
      const game = loadGame(slot);
      if (!game) {
        get().toast('error', 'That save could not be loaded (it may be from an older version).');
        return false;
      }
      saveGame('autosave', game);
      set({ game, undoStack: [], sheet: null, monthProgress: 0 });
      if (consumeUpgrade(game)) get().toast('info', UPGRADE_NOTICE);
      void get().carryOver();
      return true;
    },

    save(slot) {
      const { game } = get();
      if (!game) return false;
      const ok = saveGame(slot, game);
      get().toast(ok ? 'success' : 'error', ok ? `Saved to slot ${slot}.` : 'Saving failed: browser storage is unavailable or full.');
      return ok;
    },

    quit() {
      set({ game: null, undoStack: [], sheet: null, preset: null });
    },

    endBankruptRun(rebirth) {
      const { game, profile } = get();
      if (!game || game.status !== 'insolvent') return;
      const useRebirth = rebirth && rebirthCheck(profile, game).allowed;
      const next = persistProfile(applyBankruptcy(profile, game, useRebirth));
      set({
        profile: next, game: null, undoStack: [], sheet: null,
        preset: useRebirth ? { reason: 'rebirth', difficulty: game.difficulty, lockDifficulty: true } : { reason: 'new' },
      });
    },

    resumeSold() {
      const { game } = get();
      if (!game || game.status !== 'prestiged') return;
      const resumed: GameState = {
        ...game, status: 'playing', endReason: undefined, prestigeLevel: (game.prestigeLevel ?? 0) + 1,
        ...(game.server && !game.server.flagged ? { server: { ...game.server, carry: 'pending' as const } } : {}),
      };
      saveGame('autosave', resumed);
      set({ game: resumed, undoStack: [], sheet: null, monthProgress: 0 });
      get().toast('success', 'Your company carries on. Prestige no longer ends it.');
      void get().carryOver();
    },

    nextRun() {
      const { game, profile } = get();
      if (!game) return;
      const p = game.status === 'finished' ? persistProfile(applyRetirement(profile, game)) : profile;
      set({ profile: p, game: null, undoStack: [], sheet: null, preset: { reason: game.status === 'prestiged' ? 'prestige' : 'new' } });
    },

    async buyPerk(perkId) {
      if (ONLINE) {
        try {
          const r = await api.buyPerk(perkId);
          set({ profile: persistProfile({ ...get().profile, perks: r.perks, legacyPoints: r.legacyPoints }) });
          get().toast('success', 'Perk unlocked. It applies from your next company.');
        } catch (e) {
          get().toast('error', (e as Error).message);
        }
        return;
      }
      try {
        set({ profile: persistProfile(buyPerkOnProfile(get().profile, perkId)) });
        get().toast('success', 'Perk unlocked. It applies from your next company.');
      } catch (e) {
        get().toast('error', (e as Error).message);
      }
    },

    buyBoost(boostId) {
      const { profile, game } = get();
      if (!game) return;
      let spent: Profile;
      try {
        spent = spendGemsOnBoost(profile, boostId);
      } catch (e) {
        get().toast('error', (e as Error).message);
        return;
      }
      if (get().act({ type: 'activateBoost', boostId }, 'Boost activated.')) {
        // Recompute from the latest profile (act may have awarded progress) minus the gems.
        set({ profile: persistProfile({ ...get().profile, gems: get().profile.gems - (profile.gems - spent.gems) }), undoStack: [] });
      }
    },

    dismissReview() {
      set({ review: null });
    },

    buyDecor(id) {
      try {
        set({ profile: persistProfile(buyDecorItem(get().profile, id)) });
        get().toast('good', 'Decoration bought and placed on your island.');
        playSound('success');
      } catch (e) {
        get().toast('error', (e as Error).message);
      }
    },

    toggleDecor(id) {
      try {
        set({ profile: persistProfile(toggleDecorItem(get().profile, id)) });
      } catch (e) {
        get().toast('error', (e as Error).message);
      }
    },

    setLogo(logo) {
      try {
        set({ profile: persistProfile(setLogoOnProfile(get().profile, logo)) });
      } catch (e) {
        get().toast('error', (e as Error).message);
      }
    },

    savePlanAction(plan) {
      try {
        set({ profile: persistProfile(savePlan(get().profile, plan, planSlotsOf(get().profile))) });
        get().toast('success', 'Plan saved.');
      } catch (e) {
        get().toast('error', (e as Error).message);
      }
    },

    deletePlanAction(id) {
      set({ profile: persistProfile(deletePlan(get().profile, id)) });
    },

    claimQuest(id) {
      try {
        const r = claimQuestReward(get().profile, utcDay(), id);
        set({ profile: persistProfile(r.bonus ? addBoxes(r.profile, 1) : r.profile) });
        get().toast('good', r.bonus ? `Quest done: +${r.gems} gems, and +${r.bonus} for finishing all three!` : `Quest done: +${r.gems} gems.`);
        playSound('success');
      } catch (e) {
        get().toast('error', (e as Error).message);
      }
    },

    openBox() {
      try {
        const r = openBoxReward(get().profile);
        set({ profile: persistProfile(r.profile) });
        playSound('success');
        return r;
      } catch (e) {
        get().toast('error', (e as Error).message);
        return null;
      }
    },

    answerPuzzle(kind, day, right) {
      const r = recordAnswer(get().profile, kind, day, right);
      if (r.profile === get().profile) return;
      set({ profile: persistProfile(r.profile) });
      if (r.gems) { get().toast('good', `Right! +${r.gems} gems.`); playSound('success'); }
    },

    hearTip(id) {
      const next = hearTipOn(get().profile, id);
      if (next !== get().profile) set({ profile: persistProfile(next) });
    },

    addCardGift(id) {
      set({ profile: persistProfile(addCardOn(get().profile, id)) });
      get().toast('good', `A gift arrived: ${cardDef(id)?.name ?? 'a card'}!`);
      playSound('success');
    },

    claimInheritance() {
      try {
        const before = get().profile;
        const next = claimInheritanceOn(before);
        set({ profile: persistProfile(next) });
        get().toast('good', `Inheritance claimed: +${next.gems - before.gems} gems.`);
        playSound('success');
      } catch (e) { get().toast('error', (e as Error).message); }
    },

    takeSpareCard(id) {
      try { set({ profile: persistProfile(takeForGiftOn(get().profile, id)) }); return true; } catch (e) { get().toast('error', (e as Error).message); return false; }
    },

    finishMini(kind, day, points) {
      const r = recordMiniOn(get().profile, kind, day, points);
      if (r.profile === get().profile) return;
      set({ profile: persistProfile(r.profile) });
      if (r.gems) { get().toast('good', `Well played: +${r.gems} gems.`); playSound('success'); }
    },

    finishSprint(day, points, gems) {
      const r = recordSprintOn(get().profile, day, points, gems);
      if (r.profile === get().profile) return;
      set({ profile: persistProfile(r.profile) });
      if (r.gems) { get().toast('good', `Return filed: +${r.gems} gems.`); playSound('success'); }
    },

    finishInterview(key, right, gems) {
      const want = right === 3 ? gems : right === 2 ? Math.ceil(gems / 2) : 0;
      const r = recordInterviewOn(get().profile, key, 0);
      if (r.profile === get().profile) return;
      // Interviews come round every game year, so their gems count towards the daily play allowance.
      const pay = payPlayGems(r.profile, utcDay(), want);
      set({ profile: persistProfile(pay.profile) });
      if (pay.paid) { get().toast('good', `The investor is impressed: +${pay.paid} gems.`); playSound('success'); }
      else if (want) get().toast('info', "The investor is impressed. (Today's gems from play are used up.)");
    },

    seeTerm(id) {
      const next = seeTermOn(get().profile, id);
      if (next !== get().profile) set({ profile: persistProfile(next) });
    },

    buyLand(id) {
      try { set({ profile: persistProfile(buyLandOn(get().profile, id)) }); get().toast('good', 'New land! Look at the island.'); playSound('success'); } catch (e) { get().toast('error', (e as Error).message); }
    },

    claimTrail(id) {
      try { set({ profile: persistProfile(claimTrailOn(get().profile, id)) }); get().toast('good', 'Trail complete: gems added.'); playSound('fanfare'); } catch (e) { get().toast('error', (e as Error).message); }
    },

    buyTrack(id) {
      try { set({ profile: persistProfile(buyTrackOn(get().profile, id)) }); get().toast('good', 'Soundtrack bought and selected.'); playSound('success'); } catch (e) { get().toast('error', (e as Error).message); }
    },

    selectTrack(id) {
      try { set({ profile: persistProfile(selectTrackOn(get().profile, id)) }); } catch (e) { get().toast('error', (e as Error).message); }
    },

    adoptPet(kind, name) {
      try { set({ profile: persistProfile(adoptPetOn(get().profile, kind, name, new Date().toISOString().slice(0, 10))) }); get().toast('good', 'Welcome to the team!'); playSound('success'); } catch (e) { get().toast('error', (e as Error).message); }
    },

    nameEom(personId) {
      const g = get().game;
      if (!g) return;
      try { set({ profile: persistProfile(nameEomOn(get().profile, g, personId)) }); get().toast('good', 'Employee of the month named.'); playSound('success'); } catch (e) { get().toast('error', (e as Error).message); }
    },

    setBuildingName(id, name) {
      try { set({ profile: persistProfile(setBuildingNameOn(get().profile, id, name)) }); } catch (e) { get().toast('error', (e as Error).message); }
    },

    writeDiary(entry) {
      try { set({ profile: persistProfile(writeDiaryOn(get().profile, entry)) }); get().toast('good', 'Diary entry saved.'); } catch (e) { get().toast('error', (e as Error).message); }
    },

    buyHat(id) {
      try { set({ profile: persistProfile(buyHatOn(get().profile, id)) }); get().toast('good', 'Hat bought: your team is wearing it.'); playSound('success'); } catch (e) { get().toast('error', (e as Error).message); }
    },

    wearHat(id) {
      try { set({ profile: persistProfile(wearHatOn(get().profile, id)) }); } catch (e) { get().toast('error', (e as Error).message); }
    },

    learnSkill(id) {
      const next = learnSkillOn(get().profile, id);
      if (next === get().profile) { get().toast('error', 'You need a free skill point for that.'); return; }
      set({ profile: persistProfile(next) });
      get().toast('good', 'Skill learned.');
      playSound('success');
    },

    claimPass() {
      const r = claimPassTier(get().profile);
      if (!r) { get().toast('error', 'No reward to claim yet. Keep playing.'); return; }
      let p = r.profile;
      if (r.reward.kind === 'gems') p = { ...p, gems: p.gems + r.reward.amount };
      else p = addBoxes(p, 1);
      set({ profile: persistProfile(p) });
      get().toast('good', r.reward.kind === 'gems' ? `Season pass tier ${r.tier}: ${r.reward.amount} gems.` : `Season pass tier ${r.tier}: a mystery box.`);
      playSound('success');
    },

    claimAlbumPage(pageId) {
      try {
        set({ profile: persistProfile(claimAlbumPage(get().profile, pageId)) });
        get().toast('good', 'Album page complete: gems added.');
        playSound('success');
      } catch (e) {
        get().toast('error', (e as Error).message);
      }
    },

    buySkin(id) {
      try {
        set({ profile: persistProfile(buySkin(get().profile, id)) });
        get().toast('good', 'Skin bought and equipped.');
        playSound('success');
      } catch (e) {
        get().toast('error', (e as Error).message);
      }
    },

    equipSkin(id) {
      try {
        set({ profile: persistProfile(equipSkin(get().profile, id)) });
      } catch (e) {
        get().toast('error', (e as Error).message);
      }
    },

    setTitle(id) {
      const { profile } = get();
      if (id !== null && (!isTitleId(id) || !profile.achievements[id])) {
        get().toast('error', 'Earn that achievement to wear its title.');
        return;
      }
      set({ profile: persistProfile({ ...profile, title: id }) });
      if (ONLINE) void api.updateMe({ title: id }).catch(() => { /* offline: it syncs with the next save */ });
    },

    claimDaily() {
      try {
        const { daily, gems } = claimDailyReward(get().profile.daily, today());
        set({ profile: persistProfile({ ...get().profile, daily, gems: get().profile.gems + gems }) });
        get().toast('good', `Daily reward: +${gems} gems. Day ${daily.streak} streak!`);
      } catch (e) {
        get().toast('error', (e as Error).message);
      }
    },

    openSheet(sheet, tab, scrollTo) {
      set({ sheet, sceneFocus: null, ...(tab ? { booksTab: tab } : {}) });
      if (scrollTo) setTimeout(() => document.getElementById(scrollTo)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 250);
    },

    setSceneFocus(sceneFocus) {
      set({ sceneFocus });
    },

    setBooksTab(booksTab) {
      set({ booksTab });
    },

    toast(kind, text, icon) {
      playSound(kind === 'success' ? 'success' : kind === 'good' ? 'coin' : kind === 'info' ? 'click' : 'warn');
      const id = nextId++;
      set({ toasts: [...get().toasts.slice(-2), { id, kind, text, icon }] });
      setTimeout(() => get().dismissToast(id), kind === 'error' ? 7000 : 4500);
    },

    dismissToast(id) {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    },

    dismissCelebration() {
      set({ celebrations: get().celebrations.slice(1) });
    },
  };
});

/** Non-null game selector for screens that only render inside an active game. */
export const useActiveGame = (): GameState => {
  const g = useGame((s) => s.game);
  if (!g) throw new Error('No active game');
  return g;
};

// A game that was upgraded while the page loaded: tell the player once, and carry it over if they are signed in.
{
  const g = useGame.getState().game;
  if (g && consumeUpgrade(g)) setTimeout(() => useGame.getState().toast('info', UPGRADE_NOTICE), 1500);
  if (g?.server?.carry === 'pending') setTimeout(() => void useGame.getState().carryOver(), 2500);
}
