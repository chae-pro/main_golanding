# Deployment Checklist

## Before Deploy

0. Confirm hosting target is `Vercel`.
1. Set `GOLANDING_ACCESS_SECRET` to a long random value.
2. Set `GOLANDING_ADMIN_EMAILS=computerschool100@gmail.com`.
3. Set `GOLANDING_DB_PROVIDER=postgres`.
4. Set `DATABASE_URL` to the production Supabase Postgres instance.
5. Set `GOLANDING_STORAGE_PROVIDER=s3`.
6. Configure `S3_REGION`, `S3_BUCKET`, `S3_PUBLIC_BASE_URL`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`.
7. Add at least one approved creator account from `/admin/accounts`.

Notes:

- On Vercel, do not use SQLite as the production database.
- On Vercel, do not rely on local disk uploads.
- Supabase is the chosen production PostgreSQL provider.

## After Deploy

1. Log in with an admin account.
2. Open `/admin/accounts`.
3. Confirm the `Deployment Readiness` panel has no `FAIL` items.
4. Confirm overview counts load.
5. Confirm creator session listing works.
6. Create a test landing and publish it.
7. Visit the public landing and verify visitor/session tracking appears in admin analytics.
8. Upload one image and confirm it resolves from the production storage URL.
