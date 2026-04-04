CREATE TABLE IF NOT EXISTS approved_accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  cohort TEXT,
  status TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS creator_sessions (
  id TEXT PRIMARY KEY,
  approved_account_id TEXT NOT NULL,
  email TEXT NOT NULL,
  token_version INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL,
  last_validated_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (approved_account_id) REFERENCES approved_accounts(id)
);

CREATE TABLE IF NOT EXISTS signup_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  cohort TEXT,
  note TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS landings (
  id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  public_slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  description TEXT,
  primary_color TEXT NOT NULL,
  text_color TEXT NOT NULL,
  surface_color TEXT NOT NULL,
  radius INTEGER NOT NULL,
  html_source TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS landing_images (
  id TEXT PRIMARY KEY,
  landing_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  src TEXT NOT NULL,
  alt TEXT,
  FOREIGN KEY (landing_id) REFERENCES landings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS landing_buttons (
  id TEXT PRIMARY KEY,
  landing_id TEXT NOT NULL,
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  width_ratio DOUBLE PRECISION NOT NULL,
  sort_order INTEGER NOT NULL,
  FOREIGN KEY (landing_id) REFERENCES landings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS landing_form_fields (
  id TEXT PRIMARY KEY,
  landing_id TEXT NOT NULL,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  placeholder TEXT,
  required INTEGER NOT NULL,
  sort_order INTEGER NOT NULL,
  FOREIGN KEY (landing_id) REFERENCES landings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS visitor_sessions (
  id TEXT PRIMARY KEY,
  landing_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  last_section_index INTEGER NOT NULL,
  max_scroll_depth DOUBLE PRECISION NOT NULL,
  excluded_from_dwell INTEGER NOT NULL,
  valid_dwell_ms INTEGER NOT NULL,
  section_dwell_json TEXT NOT NULL,
  FOREIGN KEY (landing_id) REFERENCES landings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  landing_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  section_index INTEGER NOT NULL,
  scroll_depth DOUBLE PRECISION,
  x_ratio DOUBLE PRECISION,
  y_ratio DOUBLE PRECISION,
  target_type TEXT,
  target_id TEXT,
  occurred_at TEXT NOT NULL,
  FOREIGN KEY (landing_id) REFERENCES landings(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES visitor_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS form_submissions (
  id TEXT PRIMARY KEY,
  landing_id TEXT NOT NULL,
  session_id TEXT,
  submitted_at TEXT NOT NULL,
  values_json TEXT NOT NULL,
  FOREIGN KEY (landing_id) REFERENCES landings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_creator_sessions_email ON creator_sessions(email);
CREATE INDEX IF NOT EXISTS idx_signup_requests_email ON signup_requests(email);
CREATE INDEX IF NOT EXISTS idx_landings_owner_email ON landings(owner_email);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_landing_id ON visitor_sessions(landing_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_landing_id ON analytics_events(landing_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_landing_id ON form_submissions(landing_id);
