# Golanding Implementation Plan v1

## 1. Purpose

This document defines the waterfall-style implementation sequence for Golanding v1.

The goal is not to build everything at once, but to implement in controlled stages based on the already fixed documents:

- requirements
- access policy
- system design
- data model
- API spec
- screen spec
- test plan

## 2. Waterfall Principle for This Project

Golanding will follow this order:

1. requirements definition
2. system design
3. data and API design
4. screen design
5. implementation
6. testing
7. release preparation

For this project, stages 1 to 4 are now documented.

Implementation should begin only after these documents are treated as baseline.

## 3. Phase Breakdown

### Phase 1: Foundation

Scope:

- project skeleton
- access/auth skeleton
- database schema
- storage setup
- app structure

Deliverables:

- runnable base repo
- migration files
- env definition
- base routing structure

### Phase 2: Access Control

Scope:

- approved student email model
- activation flow
- token issuance
- token validation
- token renewal
- device binding

Deliverables:

- activation screen
- access APIs
- local token storage
- instructor access control basics

### Phase 3: Landing Core

Scope:

- create landing
- edit landing
- upload multiple images
- image ordering
- shared preview model

Deliverables:

- landing list screen
- landing create/edit base
- image stack rendering

### Phase 4: Button Landing

Scope:

- multi-button config
- width ratio config
- alignment config
- preview
- publish validation

Deliverables:

- button config screen
- button config API
- published button landing rendering

### Phase 5: DB Landing

Scope:

- form field config
- editable labels
- required/optional flags
- memo fields
- submission storage
- CSV export

Deliverables:

- DB landing config screen
- DB submit API
- submission list/export

### Phase 6: HTML Source Landing

Scope:

- HTML source save
- source validation
- publish flow
- tracking injection support

Deliverables:

- HTML source config screen
- HTML source API
- published HTML landing runtime support

### Phase 7: Public Tracking

Scope:

- session start
- click tracking
- scroll heartbeat tracking
- CTA click tracking
- form interaction tracking
- session end

Deliverables:

- visitor session creation
- analytics event write path
- public landing tracking layer

### Phase 8: Analytics Engine

Scope:

- click heatmap aggregation
- scroll map aggregation
- dwell map accumulation
- 20-section logic
- per-session normalization
- inactivity filtering

Deliverables:

- analytics processors
- aggregate snapshot model
- rebuild pipeline

### Phase 9: Analysis UI

Scope:

- summary panel
- click heatmap screen
- scroll map screen
- dwell map screen
- insights panel

Deliverables:

- analysis detail page
- device filter support
- visual overlays

### Phase 10: Instructor Admin

Scope:

- approved student list
- student import
- activation management
- revoke/block flows

Deliverables:

- instructor admin screens
- CSV import support
- activation revoke support

### Phase 11: Test and Stabilization

Scope:

- unit test completion
- integration test completion
- analytics edge case verification
- UI cleanup
- release checklist

Deliverables:

- passing test suite
- release candidate

## 4. Recommended Build Order

The practical build order should be:

1. foundation
2. access control
3. landing core
4. button landing
5. DB landing
6. public tracking
7. analytics engine
8. analysis UI
9. HTML source landing
10. instructor admin
11. stabilization

Reason:

- button and DB landing cover the primary product value
- public tracking and analytics are the core differentiator
- HTML source support is important but should not block the main analytics MVP

## 5. MVP Cut Line

If scope must be reduced for the first usable release, MVP should include only:

- approved email activation
- landing list/create/edit
- multi-image upload
- button landing
- DB landing
- publish
- click heatmap
- scroll map
- dwell map
- CSV export

The first optional delay candidate is:

- HTML source landing

This does not mean HTML source is dropped permanently. It means it is the first scope to push if schedule tightens.

## 6. Document-to-Implementation Mapping

### 6.1 Requirements Source

Implementation must follow:

- `01_REQUIREMENTS.md`
- `01A_ACCESS_POLICY.md`

### 6.2 Structural Source

Implementation must follow:

- `02_SYSTEM_DESIGN.md`
- `03_DATA_MODEL.md`

### 6.3 Interface Source

Implementation must follow:

- `04_API_SPEC.md`
- `05_SCREEN_SPEC.md`

### 6.4 Verification Source

Implementation must follow:

- `06_TEST_PLAN.md`

## 7. Milestone Proposal

### Milestone 1

- activation works
- landing root CRUD works
- image upload/order works

### Milestone 2

- button landing publish works
- DB landing publish works
- public pages render correctly

### Milestone 3

- tracking pipeline works
- click heatmap works
- scroll map works

### Milestone 4

- dwell map works with all inactivity rules
- CSV export works
- analysis UI works

### Milestone 5

- HTML source landing works
- instructor admin works
- release candidate ready

## 8. Recommended Technical Work Packages

Implementation should be split into these work packages.

### WP-01 Access

- approved student schema
- activation APIs
- local token logic

### WP-02 Landing Core

- landing schema
- image schema
- create/edit screens

### WP-03 Button Config

- button schema
- button UI
- button rendering

### WP-04 Form Config

- form field schema
- DB config UI
- submission pipeline

### WP-05 Publish Runtime

- public route
- publish validation
- publish version records

### WP-06 Tracking

- session creation
- event writing
- client tracking script

### WP-07 Analytics

- click aggregation
- scroll aggregation
- dwell normalization
- exclusion rules

### WP-08 Analysis UI

- summary widgets
- heatmap overlay
- scroll map UI
- dwell map UI

### WP-09 Instructor Admin

- approved student UI
- activation revoke UI
- CSV import UI

## 9. Key Non-Negotiable Rules During Build

The following must not be weakened during implementation.

- only approved student emails can activate
- all landing types must share one landing root model
- dwell map must use 20 equal sections
- dwell map must use per-session normalization
- 30-second idle periods must be excluded
- 60-second idle sessions must be excluded from dwell aggregation
- DB submissions must be exportable as CSV

## 10. Definition of Done for V1

Golanding v1 is done only when:

- approved students can activate locally
- unapproved users cannot use the product
- button landing works
- DB landing works
- HTML source landing works or is explicitly postponed by MVP decision
- public pages collect tracking events
- click heatmap works
- scroll map works
- dwell map works with the required inactivity rules
- CSV export works
- instructor can manage approvals and activations

## 11. Immediate Next Step

The next practical execution step after this document is:

- choose the implementation repository structure inside `main_golanding`
- create the actual app skeleton
- create the initial migration/schema files
- begin Phase 1 foundation work

## 12. Acceptance Criteria

- Implementation stages are clearly ordered.
- MVP cut line is defined.
- Build order matches product priorities.
- Non-negotiable rules are preserved.
