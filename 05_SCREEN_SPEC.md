# Golanding Screen Specification v1

## 1. Purpose

This document defines the minimum screen set for Golanding v1.

The screen design is based on:

- class-limited creator tool
- local-first usage
- central publish and analytics
- 3 landing types

## 2. Main Screen Groups

Golanding v1 should include these screen groups.

1. activation screens
2. landing list/admin screens
3. landing creation/edit screens
4. publish screens
5. analysis screens
6. CSV/submission screens
7. instructor admin screens

## 3. Activation Screens

### 3.1 Activation Screen

Purpose:

- first run activation

Main UI:

- email input
- activate button
- activation status message

Behavior:

- user enters approved class email
- system checks approval
- on success, token is stored locally
- on failure, access is blocked

Required states:

- idle
- checking
- approved
- blocked
- expired
- device conflict

### 3.2 Token Renewal Screen

Purpose:

- re-approval after token expiration

Main UI:

- current email display
- renew button
- error/help message

## 4. Landing List / Admin Screens

### 4.1 Landing List Screen

Purpose:

- main home screen after activation

Must show:

- landing title
- created date
- landing type
- public URL
- visitor count

Main actions:

- create landing
- open landing detail
- open analysis
- publish / republish
- archive

Recommended layout:

- top summary bar
- search/filter row
- landing table or card list

### 4.2 Landing Detail Screen

Purpose:

- single landing overview

Must show:

- landing basic info
- landing type
- status
- public URL
- preview summary
- quick analysis metrics

Main actions:

- edit
- publish
- republish
- open public page
- open analysis

## 5. Landing Creation / Edit Screens

### 5.1 Create Landing Entry Screen

Purpose:

- choose landing type and basic metadata

Fields:

- title
- description
- landing type
- theme primary color
- theme text color
- theme background color
- theme radius

Landing type options:

- button
- db_form
- html_source

### 5.2 Shared Image Registration Screen

Purpose:

- upload and order landing images

Must support:

- multiple image upload
- drag or button upload
- image ordering
- image delete
- image preview

Behavior:

- images are shown as one continuous stack preview
- mobile readability should be previewed clearly

### 5.3 Button Landing Config Screen

Purpose:

- configure one or more CTA buttons

Must support:

- add button
- edit label
- edit target URL
- width ratio control
- order control
- alignment control
- enable/disable button

Recommended preview:

- image stack preview
- CTA area preview below stack

### 5.4 DB Collection Config Screen

Purpose:

- configure form fields

Must support:

- add field
- choose field type
- edit label
- edit placeholder
- required / optional toggle
- reorder fields
- remove field

Supported field types:

- name
- email
- phone
- address
- memo1
- memo2
- memo3

Recommended preview:

- image stack preview
- form preview below stack

### 5.5 HTML Source Config Screen

Purpose:

- register external HTML source

Must support:

- full HTML input area
- optional CSS input
- optional JS input
- source validation result
- preview render result

Behavior:

- tracking injection compatibility should be checked before publish

## 6. Publish Screens

### 6.1 Publish Validation Screen

Purpose:

- show publish readiness before actual publish

Must show:

- publishable yes/no
- missing images
- invalid buttons
- invalid form config
- invalid HTML source

Main actions:

- fix issues
- continue publish

### 6.2 Publish Result Screen

Purpose:

- confirm publish completion

Must show:

- published URL
- publish time
- version info

Main actions:

- copy URL
- open public page
- open analysis

## 7. Analysis Screens

### 7.1 Analysis Summary Screen

Purpose:

- top-level analytics overview

Must show:

- total visitor count
- total click count
- CTA click count
- form submission count
- average scroll depth
- scroll completion rate
- valid dwell session count
- excluded dwell session count

### 7.2 Click Heatmap Screen

Purpose:

- visualize click density

Must show:

- landing preview
- click overlay

Filters:

- all clicks
- CTA clicks
- form clicks
- device filter

### 7.3 Scroll Map Screen

Purpose:

- visualize reach depth by session accumulation

Must show:

- landing preview
- reach heat strip or equivalent overlay
- 0 to 100 depth checkpoints

Filters:

- device filter

### 7.4 Dwell Map Screen

Purpose:

- visualize normalized 20-section dwell accumulation

Must show:

- landing preview
- 20 equal section overlays
- section-by-section accumulated ratio
- strongest sections
- weakest sections

Must also show:

- valid dwell sessions
- excluded sessions by inactivity rule

### 7.5 Insight Panel

Purpose:

- provide simple operational interpretation

Must support at least:

- most viewed sections
- weak sections
- likely drop-off-heavy sections

## 8. Submission / CSV Screens

### 8.1 Submission List Screen

Purpose:

- view DB submissions for DB landing type

Must show:

- submission time
- key field values
- submission count

Main actions:

- export CSV

### 8.2 CSV Export Action

Purpose:

- download submission data

Behavior:

- no complex screen required
- may be button on submission list or landing detail

## 9. Instructor Admin Screens

### 9.1 Approved Student List Screen

Purpose:

- manage class access

Must show:

- email
- name
- cohort
- approval status
- expiration date

Main actions:

- add approved student
- block student
- expire student
- search by email

### 9.2 Bulk Import Screen

Purpose:

- register approved student list by CSV

Must support:

- CSV upload
- import result summary
- invalid row report

### 9.3 Activation Management Screen

Purpose:

- manage device-bound activations

Must show:

- email
- device name
- issued at
- expires at
- last seen at
- status

Main actions:

- revoke activation

## 10. Common UI Rules

### 10.1 Mobile Priority

- creator-side previews should still allow mobile-first interpretation
- public page preview must show mobile behavior clearly

### 10.2 Theme Controls

For button and DB landing types, built-in UI must support:

- primary color
- text color
- background color
- radius

### 10.3 Preview First

The creation flow should always show a preview, not only a form editor.

### 10.4 Error Visibility

Every important action should have visible result states:

- success
- validation error
- save failure
- publish failure
- activation failure

## 11. Minimum Navigation Structure

Recommended creator-side navigation:

- Home / Landings
- Create Landing
- Analysis
- Submissions
- Settings / Activation

Recommended instructor-side navigation:

- Approved Students
- Activations
- Imports

## 12. Acceptance Criteria

- Student can activate the app from activation screen.
- Student can view landing list after activation.
- Student can create any of the 3 landing types.
- Student can upload and order multiple images.
- Student can configure multi-button landing.
- Student can configure DB form landing.
- Student can register HTML source landing.
- Student can validate and publish landing.
- Student can view click heatmap, scroll map, and dwell map.
- Student can export DB submissions as CSV.
- Instructor can manage approved students and activations.
