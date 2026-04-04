# 고랜딩 시스템 설계서 (AI 전달용)

## 1. 문서 목적

이 문서는 다른 AI 또는 다른 개발자가 현재 고랜딩의 시스템 구조를 빠르게 이해하고, 같은 아키텍처 방향으로 구현을 이어가도록 돕기 위한 설계 문서다.

이 문서의 목표는 다음과 같다.

- 전체 시스템 구조를 한 번에 이해할 수 있게 한다
- 각 레이어의 책임을 분리한다
- 인증, 랜딩, 분석, 관리자 기능의 연결 방식을 명확히 한다
- 운영 배포 시 필요한 방향을 고정한다

## 2. 시스템 한 줄 구조

고랜딩은 `Next.js 기반 SaaS 앱 + 관계형 DB + 객체 스토리지 + 공개 랜딩 추적 파이프라인` 구조를 가진다.

## 3. 최상위 시스템 구성

현재 시스템은 크게 4개 영역으로 나뉜다.

1. creator/admin 웹 앱
2. 공개 랜딩 전달 영역
3. 분석 이벤트 수집 영역
4. 관리자 운영 영역

## 4. 주요 사용자 흐름

### 4.1 creator 흐름

1. 승인 이메일로 로그인한다
2. 랜딩 초안을 만든다
3. 랜딩을 수정한다
4. 랜딩을 발행한다
5. 방문자 데이터를 분석 페이지에서 확인한다

### 4.2 visitor 흐름

1. 공개 랜딩 URL에 접속한다
2. 이미지/버튼/폼/HTML 랜딩을 본다
3. 클릭, 스크롤, 폼 제출 이벤트가 서버에 기록된다
4. 누적 데이터가 관리자 분석 화면에 반영된다

### 4.3 admin 흐름

1. 관리자 이메일로 로그인한다
2. 승인 계정 목록을 관리한다
3. CSV로 계정을 일괄 등록한다
4. 활성 세션을 보고 강제 로그아웃한다
5. 운영 요약과 배포 readiness를 확인한다

## 5. 현재 기술 구조

### 5.1 프레임워크

- Next.js App Router
- React
- TypeScript

### 5.2 저장소

개발 기본:

- SQLite

운영 목표:

- PostgreSQL

### 5.3 파일/이미지 저장

개발 기본:

- local upload (`public/uploads`)

운영 목표:

- S3 호환 스토리지

## 6. 주요 도메인

### 6.1 계정 도메인

핵심 개체:

- approved account
- creator session
- admin email config

책임:

- 승인 이메일 로그인 허용 여부 결정
- 관리자 권한 판별
- 세션 생성/검증/철회

### 6.2 랜딩 도메인

핵심 개체:

- landing
- landing image
- landing button
- landing form field
- html source

책임:

- 랜딩 생성/수정/상태 변경
- 공개 slug 기준 조회
- 이미지/버튼/폼/HTML 렌더링 정보 제공

### 6.3 분석 도메인

핵심 개체:

- visitor session
- analytics event
- form submission

책임:

- 공개 랜딩 방문 세션 생성
- 클릭/스크롤/폼 제출 이벤트 기록
- 스크롤/체류 집계 계산

### 6.4 관리자 도메인

핵심 개체:

- 승인 계정 관리
- CSV import/export
- 활성 세션 관리
- 운영 요약
- deployment readiness

## 7. 랜딩 구조 설계

랜딩은 정확히 아래 3가지 타입을 가진다.

- button
- form
- html

공통 속성:

- id
- ownerEmail
- type
- title
- publicSlug
- status
- description
- theme
- images
- createdAt
- updatedAt

타입별 확장:

- button: buttons 배열 사용
- form: formFields 배열 사용
- html: htmlSource 사용

## 8. 공개 랜딩 렌더링 설계

공개 랜딩 URL:

- `/l/{publicSlug}`

렌더링 원칙:

- 이미지 여러 장은 sortOrder 순으로 이어붙인다
- 버튼형은 CTA 블록을 함께 렌더링한다
- DB 수집형은 폼 블록을 함께 렌더링한다
- HTML형은 html source를 그대로 주입한다

모바일 보조 UX:

- 버튼형은 모바일 sticky CTA dock 사용
- DB형은 모바일 sticky form jump 사용

## 9. 인증 설계

### 9.1 인증 모델

- 승인 이메일 allowlist
- 서버 발급 세션 쿠키
- creator API 보호
- admin은 env 기반 이메일 판별

### 9.2 부트스트랩 설계

문제:

- production DB가 비어 있으면 관리자 로그인 자체가 막힐 수 있음

해결:

- `GOLANDING_ADMIN_EMAILS`에 있는 이메일은 승인 계정 조회 전에 자동 동기화
- 계정이 없으면 자동 생성
- 막혀 있거나 만료되어 있으면 자동으로 `approved + no expiry` 상태로 복구

이 로직은 제거하면 안 된다.

## 10. 분석 이벤트 설계

### 10.1 이벤트 유형

- pageview
- scroll
- click
- form_submit

### 10.2 이벤트 기록 위치

공개 API:

- `/api/public/sessions`
- `/api/public/events`
- `/api/public/form-submissions`

### 10.3 수집 항목

이벤트는 상황에 따라 아래를 가진다.

- landingId
- sessionId
- sectionIndex
- scrollDepth
- xRatio
- yRatio
- targetType
- targetId
- occurredAt

## 11. 스크롤맵 설계

계산 원칙:

- 세션별 `maxScrollDepth` 저장
- 20개 구간 기준 도달률 계산
- 특정 섹션 threshold 이상 도달한 세션 비율로 시각화

## 12. 체류맵 설계

### 12.1 세션 상태 저장

각 방문 세션은 아래 상태를 가진다.

- startedAt
- lastActivityAt
- lastSectionIndex
- maxScrollDepth
- excludedFromDwell
- validDwellMs
- sectionDwellMs[20]

### 12.2 계산 원칙

- 페이지를 20등분
- 각 이벤트 사이 시간차를 이전 섹션 체류시간으로 누적
- 30초 미만 활동 간격만 유효 체류로 누적
- 60초 이상 무반응이면 해당 세션을 체류맵 집계에서 제외
- 유효 세션은 각 섹션 체류시간을 유효 총 체류시간 대비 비율로 환산
- 그 비율을 전체 세션에 대해 누적

### 12.3 결과값

- dwellSections[20]
- topSections
- weakSections
- validDwellSessionCount
- excludedDwellSessionCount

## 13. 관리자 기능 설계

### 13.1 승인 계정 관리

기능:

- 목록 조회
- 단건 생성
- 단건 수정
- 상태 변경
- CSV import
- CSV export

### 13.2 활성 세션 관리

기능:

- active 세션 목록 조회
- 세션 revoke

### 13.3 관리자 대시보드 요약

지표:

- approvedAccountCount
- activeSessionCount
- publishedLandingCount
- totalLandingCount
- recentVisitorCount
- recentFormSubmissionCount

### 13.4 배포 readiness

체크 대상:

- access secret
- admin emails
- approved accounts 존재 여부
- db provider
- database url
- storage provider
- storage config

출력 형식:

- pass
- warn
- fail

## 14. 저장소 설계 방향

### 14.1 DB 추상화

현재 구조는 DB provider를 추상화해서 아래 2개를 지원한다.

- sqlite
- postgres

의도:

- 로컬 개발은 빠르게
- 운영은 안정적으로

### 14.2 스토리지 추상화

현재 구조는 스토리지 provider를 추상화해서 아래 2개를 지원한다.

- local
- s3

의도:

- 개발 편의성 유지
- 운영 배포 시 외부 객체 스토리지 사용

## 15. API 계층 설계

현재 API는 목적별로 분리되어 있다.

### 15.1 인증 API

- 로그인
- 로그아웃
- 세션 검증

### 15.2 랜딩 API

- 랜딩 목록
- 랜딩 생성
- 랜딩 수정
- 상태 변경
- 제출 데이터 CSV 다운로드

### 15.3 공개 분석 API

- 방문 세션 시작
- 이벤트 수집
- 폼 제출 저장

### 15.4 관리자 API

- 승인 계정 조회/생성/수정
- CSV import/export
- 활성 세션 조회
- 세션 revoke

## 16. 운영 배포 방향

운영 기준 권장 구성:

- Next.js app server
- PostgreSQL
- S3 호환 스토리지
- 관리자 readiness 패널 기반 점검

운영 전 필수 점검:

- `.env.production.example` 기준 env 작성
- `DEPLOYMENT_CHECKLIST.md` 기준 체크
- `/admin/accounts` readiness에서 fail 제거

## 17. AI가 추가 작업 시 따라야 할 설계 원칙

- App Router 구조를 유지할 것
- 인증은 서버 세션 쿠키 기반을 유지할 것
- 랜딩 타입 3종 구조를 유지할 것
- 분석 규칙 20등분/30초/60초를 변경하지 말 것
- 개발은 SQLite 가능, 운영은 PostgreSQL 기준이라는 방향을 유지할 것
- 개발은 local upload 가능, 운영은 S3 기준이라는 방향을 유지할 것
- 관리자 부트스트랩과 readiness 패널을 제거하지 말 것
- 새 기능을 추가할 때는 creator, public, analytics, admin 중 어느 영역인지 먼저 구분하고 그에 맞는 레이어에 넣을 것
