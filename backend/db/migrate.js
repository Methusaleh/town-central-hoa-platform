const statements = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'resident'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS agreed_to_guidelines BOOLEAN DEFAULT false`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS agreed_to_guidelines_at TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT`,
  `ALTER TABLE document_categories ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES document_categories(id) ON DELETE CASCADE`,
  `ALTER TABLE document_categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`,
  `DO $$
BEGIN
  IF to_regclass('public.watercooler_posts') IS NOT NULL AND to_regclass('public.porch_posts') IS NULL THEN
    ALTER TABLE watercooler_posts RENAME TO porch_posts;
  END IF;
  IF to_regclass('public.watercooler_comments') IS NOT NULL AND to_regclass('public.porch_comments') IS NULL THEN
    ALTER TABLE watercooler_comments RENAME TO porch_comments;
  END IF;
  IF to_regclass('public.watercooler_posts_id_seq') IS NOT NULL AND to_regclass('public.porch_posts_id_seq') IS NULL THEN
    ALTER SEQUENCE watercooler_posts_id_seq RENAME TO porch_posts_id_seq;
  END IF;
  IF to_regclass('public.watercooler_comments_id_seq') IS NOT NULL AND to_regclass('public.porch_comments_id_seq') IS NULL THEN
    ALTER SEQUENCE watercooler_comments_id_seq RENAME TO porch_comments_id_seq;
  END IF;
  IF to_regclass('public.watercooler_posts_pkey') IS NOT NULL AND to_regclass('public.porch_posts_pkey') IS NULL THEN
    ALTER INDEX watercooler_posts_pkey RENAME TO porch_posts_pkey;
  END IF;
  IF to_regclass('public.watercooler_comments_pkey') IS NOT NULL AND to_regclass('public.porch_comments_pkey') IS NULL THEN
    ALTER INDEX watercooler_comments_pkey RENAME TO porch_comments_pkey;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'watercooler_comments_post_id_fkey'
  ) THEN
    ALTER TABLE porch_comments RENAME CONSTRAINT watercooler_comments_post_id_fkey TO porch_comments_post_id_fkey;
  END IF;
END $$;`,
  `CREATE TABLE IF NOT EXISTS porch_posts (
    id SERIAL PRIMARY KEY,
    author_name VARCHAR NOT NULL,
    author_email VARCHAR,
    content TEXT NOT NULL,
    image_url TEXT,
    reactions JSONB DEFAULT '{}'::jsonb,
    is_removed BOOLEAN DEFAULT false,
    removal_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS porch_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES porch_posts(id) ON DELETE CASCADE,
    author_name VARCHAR NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    is_removed BOOLEAN DEFAULT false,
    removal_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `DROP TABLE IF EXISTS watercooler_comments`,
  `DROP TABLE IF EXISTS watercooler_posts`,
  `ALTER TABLE neighborhood_events ADD COLUMN IF NOT EXISTS event_type VARCHAR DEFAULT 'gathering'`,
  `ALTER TABLE neighborhood_events ADD COLUMN IF NOT EXISTS cover_url TEXT`,
  `ALTER TABLE neighborhood_events ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb`,
  `UPDATE neighborhood_events
     SET event_type = 'meeting'
   WHERE lower(coalesce(category, '')) LIKE '%meet%'`,
  `UPDATE neighborhood_events
     SET event_type = 'gathering'
   WHERE event_type IS NULL OR event_type = ''`,
  `ALTER TABLE alert_comments ADD COLUMN IF NOT EXISTS image_url TEXT`,
  `CREATE TABLE IF NOT EXISTS event_rsvps (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES neighborhood_events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (event_id, user_id)
  )`,
  `DELETE FROM neighborhood_roster a
     USING neighborhood_roster b
   WHERE lower(trim(a.street_address)) = lower(trim(b.street_address))
     AND a.id <> b.id
     AND (
       (COALESCE(b.is_claimed, false) AND NOT COALESCE(a.is_claimed, false))
       OR (
         COALESCE(a.is_claimed, false) = COALESCE(b.is_claimed, false)
         AND a.id > b.id
       )
     )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS neighborhood_roster_street_unique
     ON neighborhood_roster ((lower(trim(street_address))))`,
];

async function migrate(query) {
  for (const sql of statements) {
    await query(sql);
  }
}

module.exports = { migrate };
