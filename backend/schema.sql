-- Town Central HOA schema (reconstructed from live application queries).
-- Startup also runs additive ALTERs in backend/db/migrate.js.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  email VARCHAR NOT NULL UNIQUE,
  password_hash VARCHAR,
  address VARCHAR,
  role VARCHAR DEFAULT 'resident',
  agreed_to_guidelines BOOLEAN DEFAULT false,
  agreed_to_guidelines_at TIMESTAMPTZ,
  profile_photo TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS neighborhood_roster (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR,
  last_name VARCHAR,
  email VARCHAR,
  street_address VARCHAR NOT NULL,
  lot_number VARCHAR,
  onboarding_token VARCHAR,
  is_claimed BOOLEAN DEFAULT false,
  profile_photo TEXT
);

CREATE TABLE IF NOT EXISTS invitations (
  id SERIAL PRIMARY KEY,
  email VARCHAR NOT NULL,
  token VARCHAR NOT NULL UNIQUE,
  primary_resident_id INTEGER,
  address VARCHAR,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR DEFAULT 'normal',
  channel_type VARCHAR DEFAULT 'general',
  is_sticky BOOLEAN DEFAULT false,
  image_url TEXT,
  reactions JSONB DEFAULT '{}'::jsonb,
  is_removed BOOLEAN DEFAULT false,
  removal_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcement_comments (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
  author_name VARCHAR,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_alerts (
  id SERIAL PRIMARY KEY,
  category VARCHAR NOT NULL,
  author VARCHAR,
  content TEXT NOT NULL,
  image_url TEXT,
  reactions JSONB DEFAULT '{}'::jsonb,
  flags INTEGER DEFAULT 0,
  is_edited BOOLEAN DEFAULT false,
  is_removed BOOLEAN DEFAULT false,
  removal_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS alert_comments (
  id SERIAL PRIMARY KEY,
  alert_id INTEGER REFERENCES community_alerts(id) ON DELETE CASCADE,
  author_name VARCHAR,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS watercooler_posts (
  id SERIAL PRIMARY KEY,
  author_name VARCHAR,
  author_email VARCHAR,
  content TEXT NOT NULL,
  image_url TEXT,
  reactions JSONB DEFAULT '{}'::jsonb,
  is_removed BOOLEAN DEFAULT false,
  removal_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS watercooler_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES watercooler_posts(id) ON DELETE CASCADE,
  author_name VARCHAR,
  content TEXT NOT NULL,
  image_url TEXT,
  is_removed BOOLEAN DEFAULT false,
  removal_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_requests (
  id SERIAL PRIMARY KEY,
  resident_id INTEGER,
  first_name VARCHAR,
  last_name VARCHAR,
  request_type VARCHAR,
  subject VARCHAR,
  description TEXT,
  status VARCHAR DEFAULT 'Open',
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS neighborhood_events (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  event_date DATE NOT NULL,
  event_time VARCHAR,
  location VARCHAR,
  description TEXT,
  category VARCHAR,
  attachment_url TEXT,
  attachment_name VARCHAR,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS verified_vendors (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR NOT NULL,
  service_type VARCHAR,
  contact_phone VARCHAR,
  contact_email VARCHAR,
  website_url VARCHAR,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS document_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  parent_id INTEGER REFERENCES document_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  file_url TEXT NOT NULL,
  category_id INTEGER REFERENCES document_categories(id) ON DELETE SET NULL,
  is_private BOOLEAN DEFAULT false,
  requires_board_key BOOLEAN DEFAULT false,
  uploaded_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resident_dues (
  street_address VARCHAR PRIMARY KEY,
  balance NUMERIC(10,2) DEFAULT 0,
  status VARCHAR DEFAULT 'Pending',
  last_payment_date DATE,
  next_due_date DATE
);

CREATE TABLE IF NOT EXISTS ledger_transactions (
  id SERIAL PRIMARY KEY,
  address VARCHAR NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  transaction_type VARCHAR NOT NULL,
  payment_method VARCHAR,
  reference_note TEXT,
  created_by VARCHAR,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS neighborhood_notifications (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  channel_type VARCHAR,
  sender_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
