# Golanding Data Model v1

## 1. Purpose

This document defines the logical data model for Golanding v1.

It covers:

- access control
- activation/license control
- landing registration
- image assets
- button and DB form configuration
- HTML source registration
- public visitor sessions
- raw analytics events
- dwell / scroll / click aggregation
- DB submissions
- CSV export support

This is a logical model first. Exact SQL types and engine-specific syntax can be finalized later.

## 2. Design Principles

### 2.1 Raw and Aggregate Must Be Separated

Golanding must keep:

- raw event data
- aggregate analysis data

Raw data is the source of truth. Aggregate data is the read-optimized layer.

### 2.2 Session Is the Core Analytics Unit

The base analytics unit is not account and not browser user identity.

The base unit is:

- visitor session

This is required for:

- visitor count
- scroll depth
- dwell normalization
- invalid session filtering

### 2.3 Landing Type Variants Share One Landing Root

All landing types must share one root landing record.

Variant-specific configuration is stored in child tables.

### 2.4 Approval Domain and Product Domain Must Be Separate

Class approval/authentication and landing runtime data should not be mixed.

The access domain remains logically separate from landing/analytics domain.

## 3. Naming Conventions

Recommended table naming:

- plural snake_case

Recommended id policy:

- UUID as primary key

Recommended timestamps:

- `created_at`
- `updated_at`

Recommended soft-control fields where needed:

- `status`
- `is_active`
- `revoked_at`
- `expires_at`

## 4. Main Domains

Golanding v1 is divided into 5 domains.

1. access domain
2. landing domain
3. publish/runtime domain
4. analytics domain
5. submission/export domain

## 5. Access Domain

### 5.1 approved_students

Purpose:

- defines who is allowed to activate Golanding

Fields:

- `id`
- `email`
- `name`
- `cohort`
- `status`
- `expires_at`
- `note`
- `created_at`
- `updated_at`

Rules:

- `email` must be unique
- `status` values:
  - `approved`
  - `blocked`
  - `expired`
  - `pending`

Indexes:

- unique index on `email`
- index on `status`
- index on `cohort`

### 5.2 app_activations

Purpose:

- tracks local activation and device binding

Fields:

- `id`
- `approved_student_id`
- `email`
- `device_id`
- `device_name`
- `token_version`
- `issued_at`
- `expires_at`
- `last_seen_at`
- `revoked_at`
- `status`
- `created_at`
- `updated_at`

Rules:

- one active device per approved email in v1
- `status` values:
  - `active`
  - `revoked`
  - `expired`
  - `replaced`

Indexes:

- index on `approved_student_id`
- index on `email`
- index on `device_id`
- index on `status`

## 6. Landing Domain

### 6.1 landings

Purpose:

- root record for every landing page

Fields:

- `id`
- `owner_email`
- `owner_activation_id`
- `title`
- `description`
- `landing_type`
- `status`
- `public_slug`
- `theme_primary_color`
- `theme_text_color`
- `theme_background_color`
- `theme_radius`
- `created_at`
- `updated_at`

Rules:

- `landing_type` values:
  - `button`
  - `db_form`
  - `html_source`
- `status` values:
  - `draft`
  - `published`
  - `archived`

Indexes:

- unique index on `public_slug`
- index on `owner_email`
- index on `status`
- index on `landing_type`

### 6.2 landing_images

Purpose:

- stores the ordered image stack of a landing

Fields:

- `id`
- `landing_id`
- `storage_path`
- `original_file_name`
- `mime_type`
- `file_size`
- `width`
- `height`
- `sort_order`
- `created_at`

Rules:

- one landing can have many images
- render order is controlled by `sort_order`

Indexes:

- index on `landing_id`
- composite index on `landing_id, sort_order`

### 6.3 landing_buttons

Purpose:

- stores CTA buttons for button-type landing

Fields:

- `id`
- `landing_id`
- `label`
- `target_url`
- `width_ratio`
- `alignment`
- `sort_order`
- `is_active`
- `created_at`
- `updated_at`

Rules:

- one landing can have many buttons
- `alignment` values can be:
  - `left`
  - `center`
  - `right`
  - `stretch`
- `width_ratio` should be constrained to a safe range

Indexes:

- index on `landing_id`
- composite index on `landing_id, sort_order`

### 6.4 landing_form_fields

Purpose:

- stores form field configuration for DB collection landing

Fields:

- `id`
- `landing_id`
- `field_type`
- `field_key`
- `label`
- `placeholder`
- `required`
- `sort_order`
- `is_active`
- `created_at`
- `updated_at`

Rules:

- `field_type` values:
  - `name`
  - `email`
  - `phone`
  - `address`
  - `memo`
- `field_key` should be unique within one landing
- memo fields may be represented as:
  - `memo1`
  - `memo2`
  - `memo3`

Indexes:

- index on `landing_id`
- composite index on `landing_id, sort_order`
- composite unique index on `landing_id, field_key`

### 6.5 landing_html_sources

Purpose:

- stores externally authored HTML source for HTML-type landing

Fields:

- `id`
- `landing_id`
- `source_mode`
- `html_source`
- `css_source`
- `js_source`
- `render_bundle_path`
- `created_at`
- `updated_at`

Rules:

- one landing has at most one active HTML source record in v1
- `source_mode` values:
  - `full_html`
  - `mixed`

Indexes:

- unique index on `landing_id`

## 7. Publish / Runtime Domain

### 7.1 published_landings

Purpose:

- tracks publish output state

Fields:

- `id`
- `landing_id`
- `public_slug`
- `published_url`
- `published_version`
- `published_at`
- `is_current`
- `created_at`

Rules:

- a landing can have multiple published versions
- only one current publish version should be active

Indexes:

- index on `landing_id`
- index on `public_slug`
- composite index on `landing_id, is_current`

### 7.2 landing_runtime_configs

Purpose:

- stores resolved runtime config for public rendering

Fields:

- `id`
- `landing_id`
- `published_landing_id`
- `runtime_json`
- `created_at`

Use:

- precomputed rendering/runtime config for fast serving

## 8. Analytics Domain

### 8.1 visitor_sessions

Purpose:

- one record per visitor session per landing

Fields:

- `id`
- `landing_id`
- `session_id`
- `started_at`
- `ended_at`
- `last_activity_at`
- `device_type`
- `viewport_width`
- `viewport_height`
- `max_scroll_depth`
- `total_click_count`
- `cta_click_count`
- `form_interaction_count`
- `has_30s_idle_segment`
- `has_60s_idle_break`
- `is_valid_for_dwell`
- `created_at`
- `updated_at`

Rules:

- `session_id` should be unique per landing
- `device_type` values:
  - `mobile`
  - `tablet`
  - `desktop`
  - `unknown`
- `is_valid_for_dwell = false` when 60s idle break rule is triggered

Indexes:

- composite unique index on `landing_id, session_id`
- index on `landing_id`
- index on `is_valid_for_dwell`
- index on `started_at`

### 8.2 analytics_events

Purpose:

- stores raw user interaction events

Fields:

- `id`
- `landing_id`
- `session_id`
- `event_type`
- `event_time`
- `page_x`
- `page_y`
- `norm_x`
- `norm_y`
- `scroll_top_ratio`
- `scroll_bottom_ratio`
- `active_duration_ms`
- `target_type`
- `target_key`
- `meta_json`
- `created_at`

Rules:

- `event_type` values:
  - `pageview`
  - `click`
  - `scroll_heartbeat`
  - `cta_click`
  - `form_focus`
  - `form_submit`
  - `exit`
- click events should store coordinates
- scroll heartbeat events should store scroll ratios
- heartbeat events may also store `active_duration_ms`

Indexes:

- index on `landing_id`
- composite index on `landing_id, session_id`
- composite index on `landing_id, event_type`
- composite index on `landing_id, event_time`

### 8.3 session_dwell_sections

Purpose:

- stores per-session per-section dwell accumulation before cross-session normalization

Fields:

- `id`
- `landing_id`
- `session_id`
- `section_index`
- `valid_dwell_ms`
- `normalized_ratio`
- `created_at`
- `updated_at`

Rules:

- `section_index` range: 1..20
- one session can have up to 20 section rows
- `normalized_ratio` is calculated only after session finalization

Indexes:

- composite unique index on `landing_id, session_id, section_index`
- index on `landing_id`
- index on `session_id`

### 8.4 landing_analysis_snapshots

Purpose:

- stores read-optimized aggregate analysis snapshot per landing

Fields:

- `id`
- `landing_id`
- `calculated_at`
- `visitor_count`
- `valid_dwell_session_count`
- `excluded_dwell_session_count`
- `total_click_count`
- `cta_click_count`
- `form_submission_count`
- `avg_scroll_depth`
- `scroll_completion_rate`
- `click_heatmap_json`
- `scroll_map_json`
- `dwell_map_json`
- `summary_json`

Rules:

- latest snapshot is the default analysis view

Indexes:

- index on `landing_id`
- composite index on `landing_id, calculated_at`

### 8.5 Optional Section-Level Aggregate Table

If a separate table is preferred instead of JSON-only storage:

#### landing_dwell_section_aggregates

Fields:

- `id`
- `landing_id`
- `snapshot_id`
- `section_index`
- `accumulated_ratio`
- `session_count`
- `rank_order`
- `created_at`

Indexes:

- composite unique index on `snapshot_id, section_index`
- index on `landing_id`

## 9. Submission and Export Domain

### 9.1 form_submissions

Purpose:

- one record per submitted DB form

Fields:

- `id`
- `landing_id`
- `session_id`
- `submitted_at`
- `created_at`

Indexes:

- index on `landing_id`
- index on `session_id`
- index on `submitted_at`

### 9.2 form_submission_items

Purpose:

- stores actual submitted field values

Fields:

- `id`
- `submission_id`
- `field_key`
- `field_type`
- `field_label`
- `field_value`
- `created_at`

Rules:

- multiple rows per submission

Indexes:

- index on `submission_id`
- composite index on `submission_id, field_key`

### 9.3 CSV Export Read Model

CSV export does not need a separate persisted table in v1.

CSV can be generated from:

- `landings`
- `form_submissions`
- `form_submission_items`

Recommended export columns:

- landing_id
- landing_title
- submission_id
- session_id
- submitted_at
- field_key
- field_label
- field_type
- field_value

## 10. Relationships

Main relationships:

- `approved_students` 1:N `app_activations`
- `landings` 1:N `landing_images`
- `landings` 1:N `landing_buttons`
- `landings` 1:N `landing_form_fields`
- `landings` 1:1 `landing_html_sources`
- `landings` 1:N `published_landings`
- `landings` 1:N `visitor_sessions`
- `landings` 1:N `analytics_events`
- `landings` 1:N `session_dwell_sections`
- `landings` 1:N `form_submissions`
- `form_submissions` 1:N `form_submission_items`
- `landings` 1:N `landing_analysis_snapshots`

## 11. Dwell Calculation Data Path

The dwell-map pipeline should follow this order.

1. raw events are written into `analytics_events`
2. session state is updated in `visitor_sessions`
3. dwell slices are accumulated into `session_dwell_sections`
4. session finalization computes `normalized_ratio`
5. invalid dwell sessions are excluded using `is_valid_for_dwell`
6. aggregate snapshot is written to `landing_analysis_snapshots`

This keeps the dwell logic auditable and recomputable.

## 12. Idle Filtering Representation

### 12.1 30-Second Idle Segment

Representation:

- do not add the idle window to `valid_dwell_ms`
- optionally mark `has_30s_idle_segment = true` on `visitor_sessions`

### 12.2 60-Second Idle Session Exclusion

Representation:

- set `has_60s_idle_break = true`
- set `is_valid_for_dwell = false`

This session may still be kept for traffic logs, but it must be excluded from dwell aggregation.

## 13. Recommended Constraints

Recommended constraints for v1:

- `section_index` must be between 1 and 20
- `width_ratio` must be greater than 0 and less than or equal to 1
- `norm_x` and `norm_y` should be between 0 and 1 when present
- `scroll_top_ratio` and `scroll_bottom_ratio` should be between 0 and 1 when present
- `active_duration_ms` should be non-negative

## 14. Recommended Deletion Policy

### 14.1 Hard Delete Candidates

- draft-only failed uploads
- invalid temporary publish bundles

### 14.2 Soft Retention Candidates

- analytics history
- submissions
- activation history

Recommended v1 approach:

- avoid destructive deletion of analytics and submission records
- archive landings instead of hard deleting published history

## 15. Recommended Future Extensions

This model leaves room for later additions:

- separate mobile/desktop landing variants
- section-level semantic mapping
- replay support
- A/B testing
- account/team workspace model

## 16. Minimum v1 Table Set

If implementation must stay lean, these are the essential tables:

- `approved_students`
- `app_activations`
- `landings`
- `landing_images`
- `landing_buttons`
- `landing_form_fields`
- `landing_html_sources`
- `published_landings`
- `visitor_sessions`
- `analytics_events`
- `session_dwell_sections`
- `landing_analysis_snapshots`
- `form_submissions`
- `form_submission_items`

## 17. Acceptance Criteria

- The schema can represent all 3 landing types.
- The schema can store multiple ordered landing images.
- The schema can store multiple buttons per landing.
- The schema can store configurable DB form fields.
- The schema can store external HTML source.
- The schema can store session-based analytics events.
- The schema can represent 20-section dwell accumulation per session.
- The schema can mark dwell-invalid sessions.
- The schema can store aggregate analysis snapshots.
- The schema can support CSV export of DB submissions.
