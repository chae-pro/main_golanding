create table approved_accounts (
  id uuid primary key,
  email text not null unique,
  name text not null,
  cohort text,
  status text not null,
  expires_at timestamptz null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table creator_sessions (
  id uuid primary key,
  approved_account_id uuid not null references approved_accounts(id),
  email text not null,
  token_version integer not null default 1,
  expires_at timestamptz not null,
  status text not null,
  last_validated_at timestamptz not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table landings (
  id uuid primary key,
  owner_email text not null,
  type text not null,
  title text not null,
  public_slug text not null unique,
  status text not null,
  description text null,
  primary_color text not null,
  text_color text not null,
  surface_color text not null,
  radius integer not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table landing_images (
  id uuid primary key,
  landing_id uuid not null references landings(id) on delete cascade,
  sort_order integer not null,
  src text not null,
  alt text null
);

create table landing_buttons (
  id uuid primary key,
  landing_id uuid not null references landings(id) on delete cascade,
  label text not null,
  href text not null,
  width_ratio numeric(8, 2) not null,
  sort_order integer not null
);

create table landing_form_fields (
  id uuid primary key,
  landing_id uuid not null references landings(id) on delete cascade,
  field_key text not null,
  label text not null,
  placeholder text null,
  required boolean not null,
  sort_order integer not null
);

create table landing_html_sources (
  landing_id uuid primary key references landings(id) on delete cascade,
  html_source text not null
);

create table visitor_sessions (
  id uuid primary key,
  landing_id uuid not null references landings(id) on delete cascade,
  session_key text not null,
  started_at timestamptz not null,
  ended_at timestamptz null,
  valid_dwell_seconds integer not null default 0,
  excluded_due_to_idle boolean not null default false
);

create table analytics_events (
  id uuid primary key,
  landing_id uuid not null references landings(id) on delete cascade,
  visitor_session_id uuid not null references visitor_sessions(id) on delete cascade,
  event_type text not null,
  section_index integer null,
  x_ratio numeric(8, 5) null,
  y_ratio numeric(8, 5) null,
  meta_json jsonb null,
  occurred_at timestamptz not null
);

create table session_dwell_sections (
  id uuid primary key,
  visitor_session_id uuid not null references visitor_sessions(id) on delete cascade,
  section_index integer not null,
  dwell_seconds integer not null,
  normalized_percent numeric(8, 4) not null default 0
);

create table landing_analysis_snapshots (
  id uuid primary key,
  landing_id uuid not null references landings(id) on delete cascade,
  visitor_count integer not null,
  total_click_count integer not null,
  cta_click_count integer not null,
  form_submission_count integer not null,
  avg_scroll_depth numeric(8, 2) not null,
  scroll_completion_rate numeric(8, 2) not null,
  valid_dwell_session_count integer not null,
  excluded_dwell_session_count integer not null,
  dwell_sections_json jsonb not null,
  top_sections_json jsonb not null,
  weak_sections_json jsonb not null,
  created_at timestamptz not null
);

create table form_submissions (
  id uuid primary key,
  landing_id uuid not null references landings(id) on delete cascade,
  visitor_session_id uuid null references visitor_sessions(id) on delete set null,
  submitted_at timestamptz not null
);

create table form_submission_items (
  id uuid primary key,
  form_submission_id uuid not null references form_submissions(id) on delete cascade,
  field_key text not null,
  label text not null,
  value text not null
);
