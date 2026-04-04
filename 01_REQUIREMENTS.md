# Golanding Requirements v1

## 1. Product Definition

Golanding is a tool that completes a landing page after the user registers already-made landing assets.

The product scope for this phase is limited to:

- landing registration
- landing publishing
- click heatmap
- scroll map
- dwell map
- admin/analysis page
- CSV download for collected DB submissions

Out of scope for this phase:

- full landing page AI generation
- benchmark analysis
- session replay
- advanced A/B testing
- advertisement integration beyond simple landing tracking

## 2. Supported Landing Types

Golanding must support exactly 3 landing registration types.

### 2.1 Button Type

- The user uploads one or more landing images.
- One or more CTA buttons can be added.
- Each button must support:
  - label text
  - target URL
  - width ratio / layout proportion control
  - alignment / placement control within the CTA area
- The CTA area must visually match the landing image as much as possible.

### 2.2 DB Collection Type

- The user uploads one or more landing images.
- A form is attached under or around the landing image.
- The user can freely configure the form fields.
- Supported field types:
  - name
  - email
  - phone
  - address
  - memo1
  - memo2
  - memo3
- Every field label must be editable.
- Every field must support required / optional configuration.
- Memo-type fields are user-defined prompt fields.
- The form UI must visually match the landing image as much as possible.

### 2.3 HTML Source Type

- The user can register an externally created HTML source.
- The input may contain full HTML/CSS/JS depending on the case.
- Styling consistency is desirable but not guaranteed because the source is externally authored.
- Even for HTML source type, Golanding must still apply the same analytics:
  - click heatmap
  - scroll map
  - dwell map

## 3. Image Registration Rules

- Landing images can be uploaded as multiple files.
- Multiple files must be rendered in order as one continuous landing page.
- Mobile readability is more important than PC fidelity.
- If a single responsive strategy must be chosen, mobile must be the priority baseline.
- If separate PC/mobile assets are required later, mobile should be treated as the primary version.

## 4. Frontend Styling Controls

For button type and DB collection type, the built-in Golanding UI must support lightweight visual tuning.

The required adjustable items are:

- primary color
- text color
- background color
- border radius

The purpose is not full design editing. The purpose is to avoid obvious visual mismatch with the uploaded landing assets.

## 5. Admin Page Requirements

The admin page landing list must show at least:

- title
- created date
- landing type
- public URL
- visitor count

## 6. Analysis Page Requirements

The analysis page must show at least:

- click heatmap
- scroll map
- dwell map
- total visitor count
- total click count
- CTA click count
- form submission count

## 7. Click Heatmap Rules

- Track clicks across the landing page.
- Track button clicks separately so CTA performance can also be measured.
- DB collection pages must include form interaction tracking as part of click analysis.
- HTML source pages must also support the same click tracking.

## 8. Scroll Map Rules

- Scroll analysis must accumulate visitor session data.
- The analysis page must visualize how far visitors reached across the landing page.
- The result must allow identifying strong zones, weak zones, and drop-off-heavy zones.

## 9. Dwell Map Rules

### 9.1 Base Segmentation

- Every landing page must be divided vertically into 20 equal sections.
- Dwell analysis is always calculated against these 20 sections.

### 9.2 Per-Visitor Normalization

For each visitor session:

- that session's valid total dwell time is treated as 100%
- time spent in each section is converted into that session's percentage
- section percentages from all sessions are accumulated

Example:

- Visitor A valid dwell time = 20s
- Section 3 dwell = 10s -> 50%
- Section 5 dwell = 5s -> 25%

- Visitor B valid dwell time = 30s
- Section 8 dwell = 15s -> 50%
- Section 19 dwell = 10s -> 33.3%

The system must accumulate these normalized section ratios across visitors to support:

- strongest viewed sections
- weakest viewed sections
- drop-off-heavy sections
- comparative section-level interest analysis

### 9.3 Accumulation Target

- Dwell map accumulation is session-based.
- One user reopening the page in a new session is treated as a new visit.

## 10. Inactivity Filtering Rules

These rules are mandatory for dwell calculation.

### 10.1 Idle Time Discard

- If the page is left open with no meaningful movement or activity for 30 seconds, that 30-second idle period must not be counted as valid dwell time.

### 10.2 Session Exclusion

- If there is 60 seconds or more of no meaningful movement or activity, that visitor session must be excluded from cumulative dwell-map aggregation.

Implementation interpretation for v1:

- "no meaningful movement or activity" means no scroll, no click, no CTA interaction, and no form interaction within the session.
- The 60-second rule is treated as a session invalidation rule for dwell-map aggregation.

## 11. DB Submission Management

- DB collection type pages must store submissions.
- The admin side must support CSV download for submission data.
- CSV export must include at least:
  - landing identifier
  - submission timestamp
  - configured field labels
  - submitted field values

## 12. Common Analytics Coverage

All 3 landing types must support the same analytics coverage:

- button type: yes
- DB collection type: yes
- HTML source type: yes

No landing type is exempt from analytics.

## 13. First Implementation Priorities

The first implementation priority should be:

1. landing registration and publishing
2. button type and DB collection type UI composition
3. HTML source registration
4. event collection pipeline
5. click heatmap
6. scroll map
7. dwell map with inactivity filtering
8. admin page
9. CSV export

## 14. Core Acceptance Criteria

- A user can register a landing using one of the 3 supported types.
- A user can upload multiple images and render them as one continuous landing page.
- Button type supports multiple buttons with ratio/layout adjustment.
- DB collection type supports editable labels and required/optional flags for each field.
- HTML source type can be published and tracked.
- Every landing type is tracked for click, scroll, and dwell.
- Dwell is calculated against 20 equal vertical sections.
- Dwell accumulation uses normalized per-session percentages.
- 30-second idle segments are discarded.
- 60-second idle sessions are excluded from dwell aggregation.
- Admin page shows landing list and analysis metrics.
- DB submissions can be downloaded as CSV.
