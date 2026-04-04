# Golanding Repository Structure Proposal v1

## 1. Purpose

This document proposes the initial repository structure for implementation inside `main_golanding`.

The goal is to keep:

- access logic separate
- creator app separate
- public runtime separate
- analysis logic reusable

## 2. Recommended Structure

```text
main_golanding/
  docs/
  apps/
    creator-app/
    runtime-server/
    instructor-admin/
  packages/
    core-domain/
    access-sdk/
    analytics-engine/
    ui-shared/
  infra/
    migrations/
    seed/
    env/
  scripts/
  tests/
    unit/
    integration/
    e2e/
```

## 3. Directory Roles

### 3.1 docs

Purpose:

- all waterfall documents
- requirements
- design
- API
- test plan

Suggested move target:

- current markdown files created in `main_golanding`

### 3.2 apps/creator-app

Purpose:

- student-facing Golanding app

Contains:

- activation UI
- landing list
- create/edit UI
- analysis UI
- CSV export entry points

### 3.3 apps/runtime-server

Purpose:

- publish API
- public landing routes
- tracking endpoints
- analysis APIs

Contains:

- public `/p/{slug}`
- `/api/tracking/*`
- `/api/analysis/*`
- `/api/publish/*`

### 3.4 apps/instructor-admin

Purpose:

- approved student management
- activation management
- CSV import for student lists

This may be:

- a separate app
- or an isolated admin route group

### 3.5 packages/core-domain

Purpose:

- shared types
- entities
- validation rules

Examples:

- landing types
- form field types
- publish validation
- DTO definitions

### 3.6 packages/access-sdk

Purpose:

- token validation helpers
- activation client
- device-id helper

### 3.7 packages/analytics-engine

Purpose:

- click aggregation
- scroll aggregation
- dwell normalization
- inactivity filtering
- snapshot builders

### 3.8 packages/ui-shared

Purpose:

- reusable UI components
- color/theme helpers
- preview widgets

### 3.9 infra/migrations

Purpose:

- schema migrations

Minimum files likely needed:

- access tables
- landing tables
- analytics tables
- submission tables

### 3.10 infra/seed

Purpose:

- approved student seed examples
- test landing seed examples

### 3.11 scripts

Purpose:

- local setup
- seed load
- export helpers
- analysis rebuild scripts

### 3.12 tests

Purpose:

- unit/integration/e2e organization

## 4. Simpler Alternative

If the repository must stay smaller in v1, use this compact structure instead.

```text
main_golanding/
  docs/
  src/
    app/
    server/
    domain/
    analytics/
    access/
    ui/
  infra/
    migrations/
  tests/
```

This is acceptable for v1 if team size is small.

## 5. Recommended v1 Choice

Recommended v1 choice:

- start with compact structure
- keep clear module boundaries
- split to multi-app layout only if growth requires it

Reason:

- faster start
- lower operational complexity
- easier for one builder / small team

## 6. Acceptance Criteria

- Repository structure supports creator, runtime, access, and analytics separation.
- v1 can start with compact layout without losing module clarity.
