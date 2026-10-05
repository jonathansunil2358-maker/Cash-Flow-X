-- Friendly one-week growth bets, and the guild supply chain.
CREATE TABLE bets (
  id TEXT PRIMARY KEY,
  challenger_id TEXT NOT NULL,
  opponent_id TEXT NOT NULL,
  stake INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'offered',
  week TEXT,
  challenger_start INTEGER,
  opponent_start INTEGER,
  winner_id TEXT,
  winner_claimed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX bets_challenger ON bets (challenger_id, status);
CREATE INDEX bets_opponent ON bets (opponent_id, status);
CREATE TABLE guild_supply (
  guild_id TEXT NOT NULL,
  week TEXT NOT NULL,
  slot INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (guild_id, week, slot)
);
CREATE INDEX guild_supply_user ON guild_supply (week, user_id);
