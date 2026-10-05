-- Supplier deals between two players, and the weekly co-op boss.
CREATE TABLE supply_deals (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'offered',
  created_at TEXT NOT NULL,
  started_at TEXT,
  supplier_week TEXT,
  buyer_week TEXT
);
CREATE INDEX supply_deals_supplier ON supply_deals (supplier_id, status);
CREATE INDEX supply_deals_buyer ON supply_deals (buyer_id, status);
CREATE TABLE boss_hits (
  week TEXT NOT NULL,
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  pts INTEGER NOT NULL,
  PRIMARY KEY (week, user_id, day)
);
CREATE INDEX boss_hits_week ON boss_hits (week);
