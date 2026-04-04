# Deployment

## Hosting Decision

Production hosting is assumed to be `Vercel`.

Production database is assumed to be `Supabase Postgres`.

That means the production baseline is:

- `GOLANDING_DB_PROVIDER=postgres`
- `DATABASE_URL` points to the Supabase Postgres connection string
- `GOLANDING_STORAGE_PROVIDER=s3`
- uploads use S3-compatible object storage

Do not use these in Vercel production:

- SQLite file storage
- `public/uploads` as the real production asset store

Vercel's filesystem is not a persistent application datastore, so both the database and uploaded images must live outside the app instance.

## Database

Local development defaults to SQLite.

For PostgreSQL:

```bash
docker compose -f docker-compose.postgres.yml up -d
```

Then set:

```bash
GOLANDING_DB_PROVIDER=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/golanding
GOLANDING_DB_SSL=disable
```

## Upload Storage

Local development defaults to `public/uploads`.

For S3-compatible object storage:

```bash
GOLANDING_STORAGE_PROVIDER=s3
S3_REGION=ap-northeast-2
S3_BUCKET=golanding-assets
S3_ENDPOINT=https://<your-s3-endpoint>
S3_PUBLIC_BASE_URL=https://<your-public-cdn-or-bucket-url>
S3_ACCESS_KEY_ID=<your-access-key>
S3_SECRET_ACCESS_KEY=<your-secret-key>
S3_FORCE_PATH_STYLE=false
```

Notes:

- `S3_ENDPOINT` can be blank for AWS S3.
- `S3_PUBLIC_BASE_URL` should be the public URL users will load images from.
- For Cloudflare R2 or MinIO, use the provider endpoint and adjust `S3_FORCE_PATH_STYLE` if needed.

## Minimum Production Setup

- `GOLANDING_ACCESS_SECRET` must be a long random secret.
- `GOLANDING_ADMIN_EMAILS=computerschool100@gmail.com`
- `GOLANDING_DB_PROVIDER=postgres`
- `DATABASE_URL` points to the Supabase Postgres instance
- `GOLANDING_STORAGE_PROVIDER=s3`
- `S3_PUBLIC_BASE_URL` points to a public bucket URL or CDN

## Vercel Setup Order

1. Create a Vercel project from this repository.
2. Create a Supabase project and copy the Postgres connection string.
3. Set all required environment variables in the Vercel project.
4. Use S3-compatible storage for uploads.
5. Deploy once and sign in with `computerschool100@gmail.com`.
6. Open `/admin/accounts` and verify the `Deployment Readiness` panel shows no `FAIL`.

## Admin Operations

- Use `/admin/accounts` to manage approved creator emails.
- CSV import skips existing emails instead of overwriting them.
- Approved account lists can be exported as CSV.
- Active creator sessions can be revoked immediately from the same admin screen.
- The same admin screen now includes a deployment readiness panel.
