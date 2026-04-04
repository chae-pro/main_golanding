# Golanding Test Plan v1

## 1. Purpose

This document defines the v1 testing scope for Golanding.

The goal is to verify:

- access control works
- 3 landing types work
- publish flow works
- analytics rules work
- dwell map rules are calculated correctly
- CSV export works

## 2. Test Levels

Golanding v1 should be tested at 4 levels.

1. unit test
2. integration test
3. end-to-end test
4. manual acceptance test

## 3. Critical Risk Areas

These areas have the highest verification priority.

- approved email activation
- token renewal / device binding
- multi-image landing rendering
- button layout configuration
- DB form field configuration
- HTML source tracking compatibility
- click heatmap aggregation
- scroll map aggregation
- dwell map normalization
- 30-second idle exclusion
- 60-second idle session exclusion
- CSV export correctness

## 4. Unit Test Scope

### 4.1 Access Rules

Must test:

- approved email accepted
- blocked email rejected
- expired email rejected
- invalid token rejected
- device mismatch rejected

### 4.2 Landing Validation

Must test:

- button landing requires valid button URLs
- DB landing requires at least one active field
- HTML source landing requires source content
- publish validation fails for incomplete landing config

### 4.3 Analytics Calculators

Must test:

- click point normalization
- scroll depth checkpoint aggregation
- 20-section index calculation
- per-session dwell sum
- normalized section ratio calculation
- top/weak section ranking

### 4.4 Idle Filtering

Must test:

- 30-second idle period is excluded from valid dwell
- 60-second idle session is marked invalid for dwell aggregation

## 5. Integration Test Scope

### 5.1 Activation Flow

Scenario:

- approved student email activates
- token is issued
- token validation succeeds
- token renewal succeeds

### 5.2 Landing Creation Flow

Scenario:

- create landing root
- upload images
- save button or form config
- fetch saved landing

### 5.3 Publish Flow

Scenario:

- validate landing
- publish landing
- fetch public landing route

### 5.4 Tracking Flow

Scenario:

- session starts
- events are written
- session state updates
- aggregate snapshot can be built

### 5.5 Submission Flow

Scenario:

- DB form is submitted
- submission rows are stored
- CSV export returns expected rows

## 6. End-to-End Test Scope

### 6.1 Approved Student E2E

Expected path:

- launch app
- enter approved email
- activate successfully
- arrive at landing list

### 6.2 Button Landing E2E

Expected path:

- create button landing
- upload multiple images
- add multiple buttons
- publish
- open public landing
- button clicks are tracked
- click heatmap shows recorded button activity

### 6.3 DB Landing E2E

Expected path:

- create DB landing
- upload multiple images
- configure fields
- publish
- submit DB form
- submission appears in export
- form submission count appears in analysis

### 6.4 HTML Source Landing E2E

Expected path:

- create HTML landing
- save source
- publish
- open public landing
- click/scroll tracking still works

## 7. Dwell Map Verification Plan

This is the most important test area.

### 7.1 Section Split Rule

Verify:

- page is split into exactly 20 equal vertical sections
- every dwell slice is assigned to valid section indices 1..20

### 7.2 Session Normalization Rule

Verify with deterministic session data:

- session total valid dwell = 100%
- each section ratio = section dwell / session total dwell
- ratios sum to approximately 1.0 across that session

### 7.3 Cross-Session Accumulation Rule

Verify:

- multiple normalized sessions accumulate correctly
- final map reflects combined ratios, not raw milliseconds only

### 7.4 30-Second Idle Exclusion Rule

Test case:

- session has 10s active
- 30s no activity
- 5s active

Expected:

- only 15s total valid dwell
- idle 30s is excluded

### 7.5 60-Second Idle Session Exclusion Rule

Test case:

- session has activity
- then 60s or more of no activity

Expected:

- session remains in traffic logs if desired
- session is excluded from dwell aggregation
- `is_valid_for_dwell = false`

## 8. Manual Acceptance Checklist

### 8.1 Access

- unapproved email cannot activate
- approved email can activate
- revoked account cannot continue after renewal cycle

### 8.2 Landing Creation

- multiple images can be uploaded
- image order can be changed
- buttons can be added and resized
- form labels can be edited
- required/optional toggles work
- HTML source can be saved

### 8.3 Publish

- publish validation shows correct issues
- public landing URL opens
- public landing works on mobile

### 8.4 Analytics

- clicks appear on heatmap
- scroll map reflects visit depth
- dwell map shows 20 sections
- excluded dwell sessions are counted separately

### 8.5 Submissions

- DB form submits successfully
- CSV downloads correctly
- CSV contains expected labels and values

## 9. Test Data Requirements

The project should maintain reusable test data for:

- approved student accounts
- blocked/expired student accounts
- button landing sample
- DB landing sample
- HTML landing sample
- synthetic tracking sessions
- synthetic dwell edge cases

## 10. Recommended Synthetic Analytics Cases

### Case A: Simple Valid Session

- active scroll/clicks over 20 seconds
- no idle break
- valid dwell aggregation expected

### Case B: 30s Idle Segment

- active segment
- 30s no activity
- active segment
- idle excluded, session still valid

### Case C: 60s Idle Session

- active segment
- 60s no activity
- session invalid for dwell

### Case D: Multi-Session Dwell Comparison

- one session concentrated in upper sections
- one session concentrated in lower sections
- accumulated ratios should reflect both

## 11. Regression Test Priority

The following must be run before release:

- activation regression
- publish regression
- button landing regression
- DB landing regression
- HTML landing regression
- dwell calculator regression
- CSV export regression

## 12. Release Gate

Golanding v1 should not be considered releasable unless:

- approved email activation works
- all 3 landing types publish
- public tracking works
- click heatmap works
- scroll map works
- dwell map works with 20-section normalization
- 30s idle exclusion works
- 60s idle session exclusion works
- CSV export works

## 13. Acceptance Criteria

- Test plan covers access, landing, publish, analytics, and export.
- Dwell-map rules are explicitly testable.
- Critical release gates are defined.
