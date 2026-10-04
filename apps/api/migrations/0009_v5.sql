-- Joint ventures between two players, one a week.
CREATE TABLE joint_ventures (
  code TEXT PRIMARY KEY,
  week TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  partner_id TEXT,
  owner_pts INTEGER NOT NULL DEFAULT 0,
  partner_pts INTEGER NOT NULL DEFAULT 0,
  owner_claimed INTEGER NOT NULL DEFAULT 0,
  partner_claimed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX joint_ventures_owner ON joint_ventures (owner_id, week);
CREATE INDEX joint_ventures_partner ON joint_ventures (partner_id, week);
CREATE TABLE venture_days (
  code TEXT NOT NULL,
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  PRIMARY KEY (code, user_id, day)
);
