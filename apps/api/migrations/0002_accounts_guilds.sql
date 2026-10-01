-- Phase 4: accounts, server-verified runs, holding companies, investments, seasons.
-- The phase 3 "runs" table (whole-game submissions) is replaced by incrementally verified game_runs.
DROP TABLE IF EXISTS runs;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  google_sub TEXT UNIQUE,
  dev_name TEXT UNIQUE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'rocket',
  legacy_points INTEGER NOT NULL DEFAULT 0,
  legacy_earned INTEGER NOT NULL DEFAULT 0,
  prestige_count INTEGER NOT NULL DEFAULT 0,
  perks_json TEXT NOT NULL DEFAULT '{}',
  -- Pence: dividends received, investment returns, less money invested in other players.
  personal_cash INTEGER NOT NULL DEFAULT 0,
  -- Client-owned progress (gems, XP, achievements, missions) for cross-device play. Not trusted.
  client_json TEXT NOT NULL DEFAULT '{}',
  guild_id TEXT,
  guild_role TEXT,
  visibility TEXT NOT NULL DEFAULT 'summary',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX users_guild ON users (guild_id);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX sessions_user ON sessions (user_id);

CREATE TABLE game_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  seed TEXT NOT NULL,
  industry_id TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  icon TEXT NOT NULL,
  start_json TEXT NOT NULL,
  checkpoint BLOB NOT NULL,
  actions_verified INTEGER NOT NULL DEFAULT 0,
  month INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'playing',
  flagged_reason TEXT,
  stats_json TEXT NOT NULL DEFAULT '{}',
  equity_value INTEGER NOT NULL DEFAULT 0,
  owner_stake INTEGER NOT NULL DEFAULT 0,
  owner_dividends INTEGER NOT NULL DEFAULT 0,
  shares_total INTEGER NOT NULL DEFAULT 1000000,
  profit_to_date INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX game_runs_user ON game_runs (user_id, is_active);

CREATE TABLE guilds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  icon TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE investments (
  id TEXT PRIMARY KEY,
  investor_id TEXT NOT NULL,
  investee_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  pre_money INTEGER NOT NULL,
  shares INTEGER NOT NULL DEFAULT 0,
  -- offered → accepted | declined | expired; accepted → buyout-requested → bought-out; accepted → written-off
  status TEXT NOT NULL,
  dividends_credited INTEGER NOT NULL DEFAULT 0,
  buyout_credited INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX investments_investor ON investments (investor_id, status);
CREATE INDEX investments_investee ON investments (investee_id, status);
CREATE INDEX investments_run ON investments (run_id);

CREATE TABLE guild_weekly (
  guild_id TEXT NOT NULL,
  week TEXT NOT NULL,
  profit INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, week)
);

CREATE TABLE reward_claims (
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  period TEXT NOT NULL,
  gems INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, kind, period)
);

CREATE TABLE season_stats (
  user_id TEXT NOT NULL,
  season TEXT NOT NULL,
  peak_net_worth INTEGER NOT NULL DEFAULT 0,
  prestiges INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, season)
);
CREATE INDEX season_stats_nw ON season_stats (season, peak_net_worth DESC);
CREATE INDEX season_stats_pr ON season_stats (season, prestiges DESC);

CREATE TABLE guild_season (
  guild_id TEXT NOT NULL,
  season TEXT NOT NULL,
  peak_valuation INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, season)
);
CREATE INDEX guild_season_val ON guild_season (season, peak_valuation DESC);
