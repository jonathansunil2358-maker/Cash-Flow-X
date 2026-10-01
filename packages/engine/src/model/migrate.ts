import { emptyBalances } from '../ledger/accounts';
import { STATE_VERSION, type GameState } from './state';

/**
 * Bring a saved game from an older version up to the current one, so games in progress carry on
 * instead of being thrown away. Works on a freshly parsed state, in place, and is deterministic:
 * the game and the server migrate the same state to the same result.
 *
 * Only adds what the newer rules need, with neutral defaults, one version at a time:
 *  - v3 -> v4: pay and morale, promotions, R&D projects, rival memory, the Research account.
 *  - v4 -> v5: sites, insurance, contracts, stock market listing, weekly twist, the Insurance account.
 * Returns null for anything that is not a game this version can read.
 */
export function migrateState(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, any>;
  if (s.version === STATE_VERSION) return raw as GameState;
  if (s.version === 3 || s.version === 4) {
    if (s.version === 3) fromV3(s);
    fromV4(s);
    return raw as GameState;
  }
  return null;
}

/** Add every ledger account the state does not know yet, at zero. */
function addMissingAccounts(balances: Record<string, number> | undefined): void {
  if (!balances) return;
  for (const k of Object.keys(emptyBalances())) if (balances[k] === undefined) balances[k] = 0;
}

function fromV3(s: Record<string, any>): void {
  addMissingAccounts(s.ledger?.balances);
  for (const h of s.history ?? []) addMissingAccounts(h?.closing);

  s.pay ??= 'market';
  s.trainingSpend ??= 0;
  s.morale ??= 60;
  s.promo ??= null;
  s.promoDipMonths ??= 0;
  s.promoCooldown ??= 0;
  s.projects ??= [];
  s.projectsDone ??= [];
  for (const c of s.competitors ?? []) {
    c.cutMonths ??= 0;
    c.normalPrice ??= c.price;
    c.lastLaunchYear ??= -1;
  }
  s.version = 4;
}

function fromV4(s: Record<string, any>): void {
  addMissingAccounts(s.ledger?.balances);
  for (const h of s.history ?? []) addMissingAccounts(h?.closing);

  s.sites ??= 1;
  s.pendingSites ??= [];
  s.insurance ??= 'none';
  s.contracts ??= [];
  s.contractOffers ??= [];
  s.listed ??= false;
  s.listedMonth ??= null;
  s.sentiment ??= 1;
  s.priceHistory ??= [];
  s.guidance ??= null;
  s.twist ??= null;
  s.version = STATE_VERSION;
}
