# Golanding Access Policy v2

## 1. Purpose

Golanding is operated as a SaaS on the instructor-owned website.

Access must be controlled at the account and web-session level, not by distributing local files.

## 2. Basic Rule

- only approved emails may sign in
- access happens on the Golanding website
- creator actions require a valid server-issued web session
- all landing and analytics data is stored centrally

## 3. Access Scope

In v1, Golanding is still restricted to invited or approved users such as class participants.

The approved account list must support:

- email
- name
- cohort or group
- status
- optional expiration date

## 4. Session Policy

After successful sign-in:

- the server issues a signed session token
- the browser stores the token
- the session is validated on protected API calls

Recommended v1 policy:

- one active session per email
- previous active session may be revoked when a new session is created
- session expiration is time-based

## 5. Admin Policy

The admin must be able to:

- approve accounts
- block accounts
- expire accounts
- view active sessions
- revoke sessions
- import approved accounts by CSV

## 6. Security Goal

The goal is practical access control for a hosted SaaS.

This policy is intended to control:

- who may sign in
- who may create or manage landings
- who may access analytics and CSV data

## 7. Acceptance Criteria

- unapproved email cannot sign in
- approved email can create a valid session
- protected APIs reject missing or invalid sessions
- admin can revoke an approved account or active session
