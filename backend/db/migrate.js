const statements = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'resident'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS agreed_to_guidelines BOOLEAN DEFAULT false`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS agreed_to_guidelines_at TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT`,
  `ALTER TABLE document_categories ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES document_categories(id) ON DELETE CASCADE`,
  `ALTER TABLE document_categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`,
];

async function migrate(query) {
  for (const sql of statements) {
    await query(sql);
  }
}

module.exports = { migrate };
