-- Duels, community goals, replays of finished fixed-field runs and the plan marketplace.
ALTER TABLE challenges ADD COLUMN max_players INTEGER NOT NULL DEFAULT 0;

-- Verified months played by everyone each ISO week, and who has contributed (for the shared goal).
CREATE TABLE community (
  week TEXT PRIMARY KEY,
  months INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE community_users (
  week TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (week, user_id)
);

-- Decisions of daily, weekly and challenge runs, so the winner can be replayed.
CREATE TABLE fixed_actions (
  run_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  month INTEGER NOT NULL,
  action_json TEXT NOT NULL,
  PRIMARY KEY (run_id, seq)
);

-- Shared scenario plans.
CREATE TABLE shared_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  plan_json TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX shared_plans_top ON shared_plans (likes DESC, created_at DESC);
CREATE TABLE plan_likes (
  plan_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (plan_id, user_id)
);
