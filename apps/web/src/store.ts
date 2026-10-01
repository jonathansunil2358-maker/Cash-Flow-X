import {
  ActionError, advanceMonth, applyAction, INDUSTRIES, applyBankruptcy, applyPrestige, applyRetirement, buyPerk as buyPerkOnProfile, claimDaily as claimDailyReward,
  levelForXp, missionStatus, newAchievements, newGame, newProfile, offlineMonthsFor, plSummary, rebirthCheck, refillMissions, runOffline,
  RULES_VERSION, spendGemsOnBoost, stateChecksum, XP_REWARDS, type Action, type BoostId, type DifficultyId, type GameState, type NewGameOptions, type OfflineSummary,
  type Profile, type Rng,
} from '@cfx/engine';
import { create } from 'zustand';
import { useAccount } from './lib/account';
import { startingMarketing } from './lib/coach';
import { api, ApiError, ONLINE, type Me } from './lib/api';
import { loadGame, loadProfile, readPref, saveGame, saveProfile, writePref, type SlotId } from './lib/save';

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
  kind: 'achievement' | 'level' | 'mission';
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
  start: (opts: Omit<NewGameOptions, 'perks' | 'boosts' | 'prestigeLevel'>) => Promise<void>;
  /** Send new decisions to the server for verification (online runs). */
  syncNow: () => Promise<void>;
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
  buyPerk: (perkId: string) => Promise<void>;
  buyBoost: (boostId: BoostId) => void;
  claimDaily: () => void;
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

let nextId = 1;
let syncing = false;
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
  if (closed > 0 || extraXp > 0) {
    for (const a of newAchievements(after, p.achievements)) {
      p = { ...p, achievements: { ...p.achievements, [a.id]: today() }, gems: p.gems + a.gems };
      xp += 25;
      celebrations.push({ id: nextId++, kind: 'achievement', title: a.name, text: a.description, gems: a.gems });
    }
    const missions = refillMissions(p.missions, after, mathRng);
    const remaining = [];
    for (const m of missions) {
      const st = missionStatus(m, after);
      if (st.done) {
        p = { ...p, gems: p.gems + m.rewardGems, missionsCompleted: p.missionsCompleted + 1 };
        xp += m.rewardXp;
        celebrations.push({ id: nextId++, kind: 'mission', title: 'Mission complete', text: st.title, gems: m.rewardGems });
      } else remaining.push(m);
    }
    p = { ...p, missions: refillMissions(remaining, after, mathRng) };
  }
  if (xp > 0) {
    const oldLevel = levelForXp(p.xp);
    p = { ...p, xp: p.xp + xp };
    const newLevel = levelForXp(p.xp);
    for (let l = oldLevel + 1; l <= newLevel; l++) {
      const gems = XP_REWARDS.levelUpGemsPerLevel * l;
      p = { ...p, gems: p.gems + gems };
      celebrations.push({ id: nextId++, kind: 'level', title: `Founder level ${l}!`, text: 'You are getting better at this.', gems });
    }
  }
  return { profile: p, celebrations };
}

function popsFor(before: GameState, after: GameState): Pop[] {
  if (after.month === before.month || !after.history.length) return [];
  const pl = plSummary(after.history[after.history.length - 1].period.pl);
  const cash = after.ledger.balances.cash - before.ledger.balances.cash;
  const fmt = (p: number) => `${p >= 0 ? '+' : '−'}£${Math.abs(Math.round(p / 100)).toLocaleString('en-GB')}`;
  return [{ id: nextId++, text: `${fmt(pl.profit)} profit`, good: pl.profit >= 0 }, { id: nextId++, text: `${fmt(cash)} cash`, good: cash >= 0 }];
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
    const ev = after.lastEvent;
    if (ev && ev !== before.lastEvent && ev.month === before.month && !after.pendingEvent) {
      get().toast(ev.polarity === 'good' ? 'good' : 'bad', `${ev.title}: ${ev.text}`);
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
    celebrations: [],
    pops: [],
    offline: null,
    preset: null,
    tourOpen: false,
    sceneFocus: null,

    async start(opts) {
      const { profile } = get();
      let game: GameState;
      const ranked = ONLINE && (opts.scenarioId ?? 'standard') === 'standard';
      if (ranked) {
        // Register the company first: the server fixes its perks and prestige level.
        try {
          const r = await api.createRun({
            seed: opts.seed, industryId: opts.industryId, difficulty: opts.difficulty ?? 'medium', equipmentFinance: opts.equipmentFinance ?? 'buy',
            companyName: opts.companyName, icon: opts.icon ?? 'rocket', boosts: profile.boosts, rulesVersion: RULES_VERSION,
          });
          game = newGame({ ...opts, companyName: r.companyName, perks: r.perks, boosts: r.boosts, prestigeLevel: r.prestigeLevel });
          game.server = { runId: r.runId, synced: 0, syncedMonth: 0 };
        } catch (e) {
          get().toast('error', (e as Error).message);
          return;
        }
      } else {
        game = newGame({ ...opts, perks: profile.perks, boosts: profile.boosts, prestigeLevel: profile.prestigeCount });
      }
      if (game.marketingBudget === 0 && (opts.scenarioId ?? 'standard') === 'standard') {
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
        if (next.status === 'prestiged') {
          const prestiged = applyPrestige(get().profile, next);
          saveGame('autosave', next);
          set({ game: next, undoStack: [], profile: persistProfile(prestiged), sheet: null });
        } else {
          commit(game, next, xp, { undoStack: [...get().undoStack.slice(-19), game] });
        }
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
      if (next.server && (next.month - next.server.syncedMonth >= SYNC_EVERY_MONTHS || next.status !== 'playing')) void get().syncNow();
    },

    async syncNow() {
      const game = get().game;
      if (!game?.server || game.server.flagged || syncing) return;
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
        if (err.status === 409 && typeof err.body.resendFrom === 'number' && cur?.server) {
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

    async refreshAccount() {
      const me = await useAccount.getState().refresh();
      if (!me) return;
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
