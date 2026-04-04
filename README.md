# Golanding

Golanding is being built as a SaaS product that runs on your site.

The previous local-distribution assumption is no longer canonical. For deployment and access-control decisions, read these first:

1. `00_SAAS_PIVOT.md`
2. `01_REQUIREMENTS.md`
3. `01A_ACCESS_POLICY.md`
4. `02_SYSTEM_DESIGN.md`

Current implementation status:

- Next.js SaaS scaffold is running
- approved-email web login is implemented
- draft landing creation is implemented
- landing list, detail, and analysis screens are implemented
- SQLite is the default local DB
- PostgreSQL is supported for deployment via `GOLANDING_DB_PROVIDER=postgres`
- local uploads are the default
- S3-compatible object storage is supported via `GOLANDING_STORAGE_PROVIDER=s3`
- admin screen supports approved-email CRUD and CSV bulk import
- admin screen also shows active creator sessions and supports force logout
- approved account lists can be exported as CSV from the admin screen
- admin screen starts with overview cards for accounts, sessions, landings, visitors, and form submits
- admin screen also includes a deployment readiness panel for production checks

Run locally:

```bash
npm install
npm run dev
```

Environment:

```bash
GOLANDING_ACCESS_SECRET=replace-with-random-secret
GOLANDING_ADMIN_EMAILS=admin@example.com
GOLANDING_DB_PROVIDER=sqlite
# for deployment
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/golanding
GOLANDING_DB_SSL=disable
GOLANDING_STORAGE_PROVIDER=local
S3_REGION=ap-northeast-2
S3_BUCKET=golanding-assets
S3_ENDPOINT=
S3_PUBLIC_BASE_URL=https://cdn.example.com
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=false
```

For a local PostgreSQL container, see [docker-compose.postgres.yml](C:/Users/admin/Desktop/민석툴/Project1/main_golanding/docker-compose.postgres.yml).
For deployment settings, see [DEPLOYMENT.md](C:/Users/admin/Desktop/민석툴/Project1/main_golanding/DEPLOYMENT.md).
For a production env template, see [.env.production.example](C:/Users/admin/Desktop/민석툴/Project1/main_golanding/.env.production.example).
For a go-live checklist, see [DEPLOYMENT_CHECKLIST.md](C:/Users/admin/Desktop/민석툴/Project1/main_golanding/DEPLOYMENT_CHECKLIST.md).
