# Golanding System Design v2

## 1. System Shape

Golanding v1 is a hosted SaaS with four major areas:

- creator web app
- public landing delivery
- analytics ingestion
- admin and analysis console

## 2. High-Level Flow

1. approved user signs in on Golanding website
2. user creates a landing draft
3. user publishes a landing
4. visitors open the public landing URL
5. click, scroll, and dwell events are collected centrally
6. creator reviews analysis in the admin site

## 3. Creator Web App

The creator app supports:

- button landing
- DB form landing
- HTML source landing
- multiple ordered images
- theme controls for button and DB form blocks

## 4. Analytics Design

Analytics types:

- click heatmap
- scroll map
- dwell map

Dwell map rules:

- page is divided into 20 vertical sections
- valid dwell is normalized per session to 100%
- normalized section ratios are accumulated across valid sessions
- 30-second idle gaps are discarded
- sessions with 60-second or longer idle state are excluded

## 5. Auth Design

Auth model:

- approved email allowlist
- server-issued signed web session
- protected creator APIs require session validation

## 6. Storage Design

v1 scaffold currently uses local JSON files for speed.

Target production design is:

- relational DB for accounts, landings, analytics, submissions
- object storage for landing images
- server-side session table

## 7. Deployment Direction

Recommended production deployment:

- Next.js app server
- PostgreSQL
- object storage
- background analytics aggregation job
