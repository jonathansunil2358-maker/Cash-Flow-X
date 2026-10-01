import { perkPurchase, type PerkLevels } from '@cfx/engine';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { dailyBoard } from './daily';
import { requireUser, signIn, signOut, tokenOf, verifyGoogleIdToken, type AppEnv, type UserRow } from './auth';
import { claimSeasonReward, leaderboard, seasonRewards, type Board, type Period } from './boards';
import { claimWeekly, createGuild, guildDetail, joinGuild, leaveGuild, listGuilds } from './guilds';
import { declineInvestment, myInvestments, offerInvestment } from './investments';
import { createRun, syncRun, type CreateRunBody, type SyncBody } from './runs';
import { expireOffers, guildLevelOfUser, netWorthOf } from './social';
import { cleanIcon, cleanName, HttpError, nowIso } from './util';

const app = new Hono<AppEnv>();

app.use('*', async (c, next) => {
  const allowed = (c.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return cors({
    origin: (origin) => (allowed.includes(origin) ? origin : null),
    allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowHeaders: ['content-type', 'authorization'],
    maxAge: 86400,
  })(c, next);
});

async function limit(c: Context<AppEnv>, key: string) {
  if (!c.env.SUBMIT_LIMITER) return;
  // Local development only (DEV_AUTH is never set in production): automated test runs start many companies a minute.
  if (c.env.DEV_AUTH === 'true') return;
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
  const { success } = await c.env.SUBMIT_LIMITER.limit({ key: `${key}:${ip}` });
  if (!success) throw new HttpError(429, 'Too many requests, try again in a minute.');
}

async function body<T>(c: Context<AppEnv>): Promise<T> {
  const raw = await c.req.text();
  if (raw.length > 600_000) throw new HttpError(400, 'Request too large.');
  try {
    return JSON.parse(raw || '{}') as T;
  } catch {
    throw new HttpError(400, 'Invalid JSON.');
  }
}

app.get('/health', (c) => c.json({ ok: true, googleConfigured: !!c.env.GOOGLE_CLIENT_ID, devAuth: c.env.DEV_AUTH === 'true' }));

// ---------------------------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------------------------

app.post('/auth/google', async (c) => {
  await limit(c, 'auth');
  if (!c.env.GOOGLE_CLIENT_ID) throw new HttpError(403, 'Google sign-in is not configured on this server.');
  const { credential } = await body<{ credential?: string }>(c);
  if (typeof credential !== 'string') throw new HttpError(400, 'Missing Google credential.');
  const claims = await verifyGoogleIdToken(credential, c.env.GOOGLE_CLIENT_ID);
  const s = await signIn(c.env, { googleSub: claims.sub, name: claims.given_name ?? claims.name ?? 'Founder' });
  return c.json({ token: s.token, isNew: s.isNew });
});

/** Local development only: sign in by name, no Google account. */
app.post('/auth/dev', async (c) => {
  if (c.env.DEV_AUTH !== 'true') throw new HttpError(404, 'Not found.');
  const { name } = await body<{ name?: string }>(c);
  const clean = cleanName(name);
  if (!clean) throw new HttpError(400, 'Enter a name.');
  const s = await signIn(c.env, { devName: clean.toLowerCase(), name: clean });
  return c.json({ token: s.token, isNew: s.isNew });
});

app.post('/auth/logout', requireUser, async (c) => {
  await signOut(c.env, tokenOf(c)!);
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------------------------
// Me
// ---------------------------------------------------------------------------------------------

async function meView(c: Context<AppEnv>, user: UserRow) {
  await expireOffers(c.env);
  const fresh = (await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first<UserRow>())!;
  const guild = fresh.guild_id ? await c.env.DB.prepare('SELECT id, name, icon FROM guilds WHERE id = ?').bind(fresh.guild_id).first<{ id: string; name: string; icon: string }>() : null;
  const run = await c.env.DB.prepare(`SELECT id, status, actions_verified, month, flagged_reason FROM game_runs WHERE user_id = ? AND is_active = 1`)
    .bind(user.id).first<{ id: string; status: string; actions_verified: number; month: number; flagged_reason: string | null }>();
  return {
    user: {
      id: fresh.id, name: fresh.name, icon: fresh.icon, visibility: fresh.visibility, legacyPoints: fresh.legacy_points, legacyEarned: fresh.legacy_earned,
      prestigeCount: fresh.prestige_count, perks: JSON.parse(fresh.perks_json) as PerkLevels, personalCash: fresh.personal_cash,
      client: JSON.parse(fresh.client_json),
    },
    guild: guild ? { ...guild, role: fresh.guild_role, level: await guildLevelOfUser(c.env, guild.id) } : null,
    activeRun: run ? { id: run.id, status: run.status, actionsVerified: run.actions_verified, month: run.month, flaggedReason: run.flagged_reason } : null,
    investments: await myInvestments(c.env, fresh),
    netWorth: await netWorthOf(c.env, fresh.id),
    seasonRewards: await seasonRewards(c.env, fresh),
  };
}

app.get('/me', requireUser, async (c) => c.json(await meView(c, c.get('user'))));

app.put('/me', requireUser, async (c) => {
  const user = c.get('user');
  const b = await body<{ name?: unknown; icon?: unknown; visibility?: unknown; client?: unknown }>(c);
  const name = b.name === undefined ? user.name : cleanName(b.name);
  if (!name) throw new HttpError(400, 'Enter a name.');
  const icon = b.icon === undefined ? user.icon : cleanIcon(b.icon);
  const visibility = b.visibility === undefined ? user.visibility : b.visibility;
  if (!['full', 'summary', 'hidden'].includes(visibility as string)) throw new HttpError(400, 'Visibility must be full, summary or hidden.');
  const client = b.client === undefined ? user.client_json : JSON.stringify(b.client);
  if (client.length > 60_000) throw new HttpError(400, 'Saved progress is too large.');
  await c.env.DB.prepare('UPDATE users SET name = ?, icon = ?, visibility = ?, client_json = ?, updated_at = ? WHERE id = ?')
    .bind(name, icon, visibility, client, nowIso(), user.id).run();
  return c.json({ ok: true });
});

/** Perks are bought with server-held Legacy points (earned only by verified prestiges). */
app.post('/me/perks', requireUser, async (c) => {
  const user = c.get('user');
  const { perkId } = await body<{ perkId?: string }>(c);
  const perks = JSON.parse(user.perks_json) as PerkLevels;
  const check = perkPurchase(perks, String(perkId), user.legacy_points);
  if (!check.ok) throw new HttpError(409, check.reason ?? 'Cannot buy that perk.');
  perks[String(perkId)] = (perks[String(perkId)] ?? 0) + 1;
  const res = await c.env.DB.prepare('UPDATE users SET perks_json = ?, legacy_points = legacy_points - ?, updated_at = ? WHERE id = ? AND legacy_points >= ?')
    .bind(JSON.stringify(perks), check.cost, nowIso(), user.id, check.cost).run();
  if (!res.meta.changes) throw new HttpError(409, 'Not enough Legacy points.');
  return c.json({ perks, legacyPoints: user.legacy_points - check.cost });
});

// ---------------------------------------------------------------------------------------------
// Runs (chunked verification)
// ---------------------------------------------------------------------------------------------

app.post('/runs', requireUser, async (c) => {
  await limit(c, 'runs');
  return c.json(await createRun(c.env, c.get('user'), await body<CreateRunBody>(c)), 201);
});

app.post('/runs/:id/sync', requireUser, async (c) => c.json(await syncRun(c.env, c.get('user'), c.req.param('id')!, await body<SyncBody>(c))));

// ---------------------------------------------------------------------------------------------
// Holding companies
// ---------------------------------------------------------------------------------------------

app.get('/guilds', requireUser, async (c) => c.json(await listGuilds(c.env, c.req.query('q') ?? '')));
app.post('/guilds', requireUser, async (c) => c.json(await createGuild(c.env, c.get('user'), await body(c)), 201));
app.get('/guilds/:id', requireUser, async (c) => c.json(await guildDetail(c.env, c.get('user'), c.req.param('id')!)));
app.post('/guilds/:id/join', requireUser, async (c) => c.json(await joinGuild(c.env, c.get('user'), c.req.param('id')!)));
app.post('/guild/leave', requireUser, async (c) => c.json(await leaveGuild(c.env, c.get('user'))));
app.post('/guild/weekly/claim', requireUser, async (c) => c.json(await claimWeekly(c.env, c.get('user'))));

// ---------------------------------------------------------------------------------------------
// Investments
// ---------------------------------------------------------------------------------------------

app.post('/investments', requireUser, async (c) => {
  await limit(c, 'invest');
  return c.json(await offerInvestment(c.env, c.get('user'), await body(c)), 201);
});
app.post('/investments/:id/decline', requireUser, async (c) => c.json(await declineInvestment(c.env, c.get('user'), c.req.param('id')!)));

// ---------------------------------------------------------------------------------------------
// Leaderboards and seasons
// ---------------------------------------------------------------------------------------------

app.get('/leaderboards/:board', requireUser, async (c) => {
  const period = (c.req.query('period') === 'all' ? 'all' : 'season') as Period;
  c.header('cache-control', 'private, max-age=15');
  return c.json(await leaderboard(c.env, c.get('user'), c.req.param('board') as Board, period));
});
app.get('/daily', requireUser, async (c) => {
  // Never cached: the player's own status changes the moment they start or finish an attempt.
  c.header('cache-control', 'private, no-store');
  return c.json(await dailyBoard(c.env, c.get('user'), c.req.query('day')));
});
app.post('/rewards/season/:board', requireUser, async (c) => c.json(await claimSeasonReward(c.env, c.get('user'), c.req.param('board') as Board)));

app.onError((err, c) => {
  if (err instanceof HttpError) {
    // 409 bodies from sync carry machine-readable details.
    try {
      const parsed = JSON.parse(err.message);
      if (parsed && typeof parsed === 'object') return c.json({ error: 'Out of sync.', ...parsed }, err.status);
    } catch {
      /* plain message */
    }
    return c.json({ error: err.message }, err.status);
  }
  console.error(err);
  return c.json({ error: 'Internal error' }, 500);
});

export default app;
