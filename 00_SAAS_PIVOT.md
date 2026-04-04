# Golanding SaaS Pivot

## 1. Decision

Golanding is no longer a locally distributed class file.

Golanding v1 will run as a SaaS on the instructor-owned website.

## 2. What Changed

The old model assumed:

- local app distribution
- first activation on instructor server
- 30-day local token
- device binding

The new model is:

- web-based SaaS
- browser login on Golanding site
- approved email allowlist for initial access control
- central landing storage
- central analytics collection
- central admin and analysis pages

## 3. New Product Position

Golanding is now:

- a hosted landing builder
- a hosted click heatmap tool
- a hosted scroll map tool
- a hosted dwell map tool

## 4. Access Model

Access is controlled on the website itself.

- user opens Golanding site
- user signs in with approved email
- server creates a web session
- session is used for landing management and analytics viewing

Device-bound local activation is removed from v1 scope.

## 5. Architecture Consequences

This pivot changes the architecture in these ways:

- no student file distribution workflow
- no local token-first runtime
- no offline-first assumption
- no per-device activation requirement
- all creator data is stored on the central server

## 6. What Remains The Same

These business requirements remain unchanged:

- 3 landing types: button, DB form, HTML source
- multiple images can be appended in order
- analytics types: heatmap, scroll map, dwell map
- dwell map uses 20 vertical sections
- dwell map excludes idle periods over 30 seconds
- dwell sessions with 60 seconds or more idle are excluded

## 7. Canonical Rule

If any older document still mentions local distribution, local activation, or device binding, this SaaS pivot document supersedes that assumption.
