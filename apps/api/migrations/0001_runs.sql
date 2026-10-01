-- Verified leaderboard runs. Every row was produced by replaying the submitted seed + action log.
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  run_hash TEXT NOT NULL UNIQUE,
  player_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  industry_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  seed TEXT NOT NULL,
  score INTEGER NOT NULL,
  owner_wealth INTEGER NOT NULL,
  equity_value INTEGER NOT NULL,
  months INTEGER NOT NULL,
  won_at_month INTEGER,
  status TEXT NOT NULL,
  grade TEXT NOT NULL,
  actions_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX runs_board ON runs (scenario_id, industry_id, score DESC);
CREATE INDEX runs_scenario ON runs (scenario_id, score DESC);
