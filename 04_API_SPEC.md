# Golanding API Specification v1

## 1. Purpose

This document defines the v1 API surface for Golanding.

The API is divided into 2 logical groups:

1. access / activation API
2. landing / publish / analytics API

## 2. General Rules

### 2.1 Format

- request body: JSON unless file upload is required
- response body: JSON
- timestamps: ISO 8601 UTC string
- ids: UUID where applicable

### 2.2 Auth Modes

Golanding uses 2 auth modes.

- activation auth for creator app
- public visitor mode for landing runtime tracking

### 2.3 Response Shape

Recommended base response:

```json
{
  "success": true,
  "data": {}
}
```

Error shape:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

## 3. Access / Activation API

Base prefix:

- `/api/access`

### 3.1 Check Approved Email

`POST /api/access/check-email`

Purpose:

- checks whether an email is eligible for activation

Request:

```json
{
  "email": "student@example.com"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "approved": true,
    "status": "approved",
    "expires_at": null,
    "cohort": "meta-ads-2026-01"
  }
}
```

Error codes:

- `EMAIL_REQUIRED`
- `EMAIL_NOT_APPROVED`
- `EMAIL_BLOCKED`
- `EMAIL_EXPIRED`

### 3.2 Activate App

`POST /api/access/activate`

Purpose:

- first activation
- token issue
- device binding

Request:

```json
{
  "email": "student@example.com",
  "device_id": "device-hash",
  "device_name": "MINSEOK-LAPTOP"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "activation_id": "uuid",
    "token": "signed-token",
    "expires_at": "2026-04-30T00:00:00.000Z"
  }
}
```

Error codes:

- `DEVICE_CONFLICT`
- `EMAIL_NOT_APPROVED`
- `EMAIL_BLOCKED`
- `EMAIL_EXPIRED`

### 3.3 Renew Token

`POST /api/access/renew`

Purpose:

- renew expired or near-expiry token

Request:

```json
{
  "token": "signed-token",
  "device_id": "device-hash"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "new-signed-token",
    "expires_at": "2026-05-30T00:00:00.000Z"
  }
}
```

Error codes:

- `TOKEN_INVALID`
- `TOKEN_REVOKED`
- `DEVICE_MISMATCH`
- `EMAIL_BLOCKED`

### 3.4 Validate Token

`POST /api/access/validate`

Purpose:

- creator app validates local token at launch

Request:

```json
{
  "token": "signed-token",
  "device_id": "device-hash"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "valid": true,
    "email": "student@example.com",
    "expires_at": "2026-04-30T00:00:00.000Z"
  }
}
```

### 3.5 Revoke Activation

`POST /api/access/revoke`

Purpose:

- instructor/admin revokes activation token

Request:

```json
{
  "activation_id": "uuid"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "revoked": true
  }
}
```

## 4. Landing Management API

Base prefix:

- `/api/landings`

All landing management APIs require creator-side access token.

### 4.1 List Landings

`GET /api/landings`

Query params:

- `status`
- `landing_type`

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "Meta Ads Class LP",
        "landing_type": "button",
        "status": "published",
        "public_slug": "meta-ads-class-lp",
        "created_at": "2026-03-31T00:00:00.000Z",
        "visitor_count": 123
      }
    ]
  }
}
```

### 4.2 Create Landing

`POST /api/landings`

Purpose:

- creates root landing record

Request:

```json
{
  "title": "Landing Title",
  "description": "optional",
  "landing_type": "button",
  "theme": {
    "primary_color": "#2563eb",
    "text_color": "#111827",
    "background_color": "#ffffff",
    "radius": 16
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "landing_id": "uuid"
  }
}
```

### 4.3 Get Landing Detail

`GET /api/landings/{landing_id}`

Response includes:

- root landing
- images
- buttons
- form fields
- html source metadata
- publish status

### 4.4 Update Landing Root

`PUT /api/landings/{landing_id}`

Request:

```json
{
  "title": "Updated Title",
  "description": "Updated",
  "theme": {
    "primary_color": "#0f766e",
    "text_color": "#0f172a",
    "background_color": "#ffffff",
    "radius": 20
  }
}
```

### 4.5 Archive Landing

`POST /api/landings/{landing_id}/archive`

Purpose:

- landing is hidden from normal active list

## 5. Landing Image API

Base prefix:

- `/api/landings/{landing_id}/images`

### 5.1 Upload Images

`POST /api/landings/{landing_id}/images`

Content type:

- `multipart/form-data`

Request fields:

- `images[]`
- `sort_orders[]` optional

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "storage_path": "path",
        "sort_order": 1,
        "width": 1080,
        "height": 1920
      }
    ]
  }
}
```

### 5.2 Reorder Images

`PUT /api/landings/{landing_id}/images/reorder`

Request:

```json
{
  "items": [
    { "image_id": "uuid", "sort_order": 1 },
    { "image_id": "uuid", "sort_order": 2 }
  ]
}
```

### 5.3 Delete Image

`DELETE /api/landings/{landing_id}/images/{image_id}`

## 6. Button Config API

Base prefix:

- `/api/landings/{landing_id}/buttons`

### 6.1 Add Button

`POST /api/landings/{landing_id}/buttons`

Request:

```json
{
  "label": "무료 신청하기",
  "target_url": "https://example.com",
  "width_ratio": 0.5,
  "alignment": "center",
  "sort_order": 1
}
```

### 6.2 Update Button

`PUT /api/landings/{landing_id}/buttons/{button_id}`

### 6.3 Delete Button

`DELETE /api/landings/{landing_id}/buttons/{button_id}`

### 6.4 Reorder Buttons

`PUT /api/landings/{landing_id}/buttons/reorder`

## 7. DB Form Config API

Base prefix:

- `/api/landings/{landing_id}/form-fields`

### 7.1 Add Field

`POST /api/landings/{landing_id}/form-fields`

Request:

```json
{
  "field_type": "name",
  "field_key": "name",
  "label": "이름",
  "placeholder": "이름을 입력하세요",
  "required": true,
  "sort_order": 1
}
```

### 7.2 Update Field

`PUT /api/landings/{landing_id}/form-fields/{field_id}`

### 7.3 Delete Field

`DELETE /api/landings/{landing_id}/form-fields/{field_id}`

### 7.4 Reorder Fields

`PUT /api/landings/{landing_id}/form-fields/reorder`

## 8. HTML Source API

Base prefix:

- `/api/landings/{landing_id}/html-source`

### 8.1 Save HTML Source

`PUT /api/landings/{landing_id}/html-source`

Request:

```json
{
  "source_mode": "full_html",
  "html_source": "<html>...</html>",
  "css_source": "",
  "js_source": ""
}
```

### 8.2 Get HTML Source

`GET /api/landings/{landing_id}/html-source`

## 9. Publish API

Base prefix:

- `/api/publish`

### 9.1 Validate Publish

`POST /api/publish/{landing_id}/validate`

Purpose:

- verifies publish readiness

Checks at least:

- landing type selected
- image set valid when required
- button config valid when button type
- form config valid when DB type
- html source present when HTML type

Response:

```json
{
  "success": true,
  "data": {
    "publishable": true,
    "issues": []
  }
}
```

### 9.2 Publish Landing

`POST /api/publish/{landing_id}`

Response:

```json
{
  "success": true,
  "data": {
    "published_landing_id": "uuid",
    "public_slug": "meta-ads-class-lp",
    "published_url": "/p/meta-ads-class-lp",
    "published_at": "2026-03-31T00:00:00.000Z"
  }
}
```

### 9.3 Republish Landing

`POST /api/publish/{landing_id}/republish`

## 10. Public Landing API

Base prefix:

- `/p/{public_slug}`

Purpose:

- public landing page render route

This may be server-rendered HTML instead of JSON API.

## 11. Visitor Tracking API

Base prefix:

- `/api/tracking`

These APIs do not require creator auth.

### 11.1 Start Session

`POST /api/tracking/session/start`

Request:

```json
{
  "landing_id": "uuid",
  "session_id": "session-token",
  "viewport_width": 390,
  "viewport_height": 844
}
```

Response:

```json
{
  "success": true,
  "data": {
    "session_started": true
  }
}
```

### 11.2 Track Event

`POST /api/tracking/event`

Purpose:

- accepts pageview, click, scroll heartbeat, CTA click, form interaction, exit

Request:

```json
{
  "landing_id": "uuid",
  "session_id": "session-token",
  "event_type": "click",
  "event_time": "2026-03-31T12:00:00.000Z",
  "page_x": 420,
  "page_y": 1550,
  "norm_x": 0.42,
  "norm_y": 0.31,
  "scroll_top_ratio": 0.25,
  "scroll_bottom_ratio": 0.48,
  "active_duration_ms": 1000,
  "target_type": "button",
  "target_key": "cta_primary"
}
```

Rules:

- click events require click coordinates
- scroll heartbeat events should include scroll ratios
- heartbeat events may include `active_duration_ms`
- server updates `visitor_sessions` and dwell state from this stream

### 11.3 End Session

`POST /api/tracking/session/end`

Request:

```json
{
  "landing_id": "uuid",
  "session_id": "session-token",
  "event_time": "2026-03-31T12:05:00.000Z"
}
```

## 12. DB Submission API

Base prefix:

- `/api/forms`

### 12.1 Submit DB Form

`POST /api/forms/{landing_id}/submit`

Request:

```json
{
  "session_id": "session-token",
  "items": [
    {
      "field_key": "name",
      "field_label": "이름",
      "field_type": "name",
      "value": "홍길동"
    },
    {
      "field_key": "phone",
      "field_label": "전화번호",
      "field_type": "phone",
      "value": "010-1234-5678"
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "submission_id": "uuid"
  }
}
```

## 13. Analysis API

Base prefix:

- `/api/analysis`

Creator auth required.

### 13.1 Get Analysis Summary

`GET /api/analysis/{landing_id}/summary`

Response:

```json
{
  "success": true,
  "data": {
    "visitor_count": 100,
    "total_click_count": 250,
    "cta_click_count": 70,
    "form_submission_count": 12,
    "avg_scroll_depth": 63,
    "scroll_completion_rate": 18,
    "valid_dwell_session_count": 83,
    "excluded_dwell_session_count": 7
  }
}
```

### 13.2 Get Click Heatmap

`GET /api/analysis/{landing_id}/click-heatmap`

Query params:

- `mode=all|cta|form`
- `device=all|mobile|tablet|desktop`

Response:

```json
{
  "success": true,
  "data": {
    "points": [
      { "norm_x": 0.51, "norm_y": 0.22, "count": 12 }
    ]
  }
}
```

### 13.3 Get Scroll Map

`GET /api/analysis/{landing_id}/scroll-map`

Query params:

- `device=all|mobile|tablet|desktop`

Response:

```json
{
  "success": true,
  "data": {
    "checkpoints": [
      { "depth": 0, "reach_rate": 100 },
      { "depth": 10, "reach_rate": 92 }
    ]
  }
}
```

### 13.4 Get Dwell Map

`GET /api/analysis/{landing_id}/dwell-map`

Query params:

- `device=all|mobile|tablet|desktop`

Response:

```json
{
  "success": true,
  "data": {
    "valid_session_count": 83,
    "excluded_session_count": 7,
    "sections": [
      { "section_index": 1, "accumulated_ratio": 0.84 },
      { "section_index": 2, "accumulated_ratio": 0.73 }
    ],
    "top_sections": [1, 2, 3],
    "weak_sections": [17, 18, 19]
  }
}
```

### 13.5 Force Rebuild Analysis

`POST /api/analysis/{landing_id}/rebuild`

Purpose:

- rebuild aggregate snapshot from raw data

## 14. Submission Export API

Base prefix:

- `/api/exports`

### 14.1 Download Submissions CSV

`GET /api/exports/{landing_id}/submissions.csv`

Auth:

- creator token required

Response:

- `text/csv`

## 15. Instructor Admin API

Base prefix:

- `/api/admin`

This is separate from normal student creator auth.

### 15.1 List Approved Students

`GET /api/admin/approved-students`

### 15.2 Add Approved Student

`POST /api/admin/approved-students`

Request:

```json
{
  "email": "student@example.com",
  "name": "홍길동",
  "cohort": "meta-ads-2026-01",
  "expires_at": null
}
```

### 15.3 Bulk Import Approved Students

`POST /api/admin/approved-students/import`

Content type:

- `multipart/form-data`

### 15.4 Block Approved Student

`POST /api/admin/approved-students/{approved_student_id}/block`

### 15.5 Revoke Student Activation

`POST /api/admin/activations/{activation_id}/revoke`

## 16. Error Code Recommendations

Recommended common error codes:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `TOKEN_INVALID`
- `TOKEN_EXPIRED`
- `TOKEN_REVOKED`
- `DEVICE_CONFLICT`
- `EMAIL_NOT_APPROVED`
- `EMAIL_BLOCKED`
- `EMAIL_EXPIRED`
- `PUBLISH_VALIDATION_FAILED`
- `LANDING_NOT_FOUND`
- `INVALID_LANDING_TYPE`
- `INVALID_FORM_CONFIG`
- `INVALID_BUTTON_CONFIG`
- `INVALID_HTML_SOURCE`
- `TRACKING_WRITE_FAILED`
- `ANALYSIS_BUILD_FAILED`

## 17. Acceptance Criteria

- API can activate approved student only.
- API can create and edit all 3 landing types.
- API can upload and order multiple images.
- API can manage multi-button landing config.
- API can manage DB form field config.
- API can save HTML source landing config.
- API can publish and republish landings.
- API can collect visitor interaction events.
- API can store DB form submissions.
- API can return heatmap, scroll map, and dwell map.
- API can export submission data as CSV.
