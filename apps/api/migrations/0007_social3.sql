-- Co-op links (a friend advises or watches), their suggestions, and one-time card gifts.
CREATE TABLE coop_links (
  code TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  role TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX coop_links_owner ON coop_links (owner_id, revoked);
CREATE TABLE coop_members (
  code TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (code, user_id)
);
CREATE INDEX coop_members_user ON coop_members (user_id);
CREATE TABLE coop_suggestions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  from_user TEXT NOT NULL,
  action_json TEXT NOT NULL,
  note TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL
);
CREATE INDEX coop_suggestions_code ON coop_suggestions (code, status);
CREATE TABLE card_gifts (
  code TEXT PRIMARY KEY,
  from_user TEXT NOT NULL,
  card TEXT NOT NULL,
  claimed_by TEXT,
  created_at TEXT NOT NULL
);
