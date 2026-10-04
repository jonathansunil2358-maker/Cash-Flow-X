-- Island visits (likes and greetings), guild landmarks, the cosmetics market, mentors and shared scenarios.
CREATE TABLE island_likes (
  target_id TEXT NOT NULL,
  from_id TEXT NOT NULL,
  day TEXT NOT NULL,
  PRIMARY KEY (target_id, from_id, day)
);
CREATE TABLE island_greetings (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  from_id TEXT NOT NULL,
  text_idx INTEGER NOT NULL,
  day TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX island_greetings_target ON island_greetings (target_id, created_at);
CREATE TABLE guild_landmarks (
  guild_id TEXT PRIMARY KEY,
  funded INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE market_listings (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  item TEXT NOT NULL,
  price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  buyer_id TEXT,
  collected INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX market_listings_open ON market_listings (status, created_at);
CREATE INDEX market_listings_seller ON market_listings (seller_id, status);
CREATE TABLE mentor_links (
  code TEXT PRIMARY KEY,
  mentor_id TEXT NOT NULL,
  mentee_id TEXT,
  mentor_claimed INTEGER NOT NULL DEFAULT 0,
  mentee_claimed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX mentor_links_mentor ON mentor_links (mentor_id);
CREATE INDEX mentor_links_mentee ON mentor_links (mentee_id);
CREATE TABLE scenarios (
  code TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sector TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  seed TEXT NOT NULL,
  objective_kind TEXT NOT NULL,
  objective_value INTEGER NOT NULL,
  plays INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX scenarios_owner ON scenarios (owner_id);
CREATE TABLE scenario_plays (
  code TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (code, user_id)
);
