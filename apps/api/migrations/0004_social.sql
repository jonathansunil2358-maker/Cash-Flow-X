-- Achievement titles, weekly events and friend challenges.
ALTER TABLE users ADD COLUMN title TEXT;
ALTER TABLE game_runs ADD COLUMN weekly_week TEXT;
ALTER TABLE game_runs ADD COLUMN challenge_code TEXT;

-- Weekly event: one shared company per ISO week with a twist, same rules as the daily challenge.
CREATE TABLE weekly_scores (
  week TEXT NOT NULL,
  user_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  months INTEGER NOT NULL DEFAULT 0,
  finished INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'playing',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (week, user_id)
);
CREATE INDEX weekly_scores_board ON weekly_scores (week, finished, score DESC);

-- Friend challenges: a private code anyone can join once.
CREATE TABLE challenges (
  code TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE challenge_scores (
  code TEXT NOT NULL,
  user_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  months INTEGER NOT NULL DEFAULT 0,
  finished INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'playing',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (code, user_id)
);
CREATE INDEX challenge_scores_board ON challenge_scores (code, finished, score DESC);
