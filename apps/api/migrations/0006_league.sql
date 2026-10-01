-- Weekly puzzle league: one verified answer per player, per kind of puzzle, per day.
CREATE TABLE puzzle_answers (
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  kind TEXT NOT NULL,
  correct INTEGER NOT NULL,
  week TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, day, kind)
);
CREATE INDEX puzzle_answers_week ON puzzle_answers (week, correct);
