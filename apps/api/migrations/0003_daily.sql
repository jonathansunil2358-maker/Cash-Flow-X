-- Daily challenge: one shared company per UTC day, scored when the 24 months are finished.
ALTER TABLE game_runs ADD COLUMN daily_day TEXT;

CREATE TABLE daily_scores (
  day TEXT NOT NULL,
  user_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  -- Owner stake in pence at the last verified month (0 if the company failed).
  score INTEGER NOT NULL DEFAULT 0,
  months INTEGER NOT NULL DEFAULT 0,
  -- Only finished companies appear on the board, so nobody can stop at a lucky peak.
  finished INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'playing',
  updated_at TEXT NOT NULL,
  -- One attempt per player per day.
  PRIMARY KEY (day, user_id)
);
CREATE INDEX daily_scores_board ON daily_scores (day, finished, score DESC);
