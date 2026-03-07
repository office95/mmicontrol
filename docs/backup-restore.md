# Backup & Restore Playbook

## Nightly logical backups (in this repo)
- Workflow: `.github/workflows/db-backup.yml` (runs daily 02:00 UTC + manual).
- Dump: `pg_dump --format=custom` of the Supabase primary DB.
- Upload: S3 bucket from secret `BACKUP_S3_BUCKET` (path `db-backups/`).
- Compression: `zstd`.

### Secrets required (GitHub repo settings → Secrets and variables → Actions)
- `SUPABASE_URL` – e.g. `https://<project>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` – service role key of the project
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- `BACKUP_S3_BUCKET` – e.g. `my-backups-bucket`

### S3 lifecycle (configure in bucket, not in workflow)
- Keep last 30–60 days (rule: delete objects older than N days).
- Optionally transition to Glacier/Deep Archive after 30 days.

## Restore procedure (staging or temp project)
1) Download latest dump from S3:
   ```bash
   aws s3 cp s3://<bucket>/db-backups/backup-YYYY-MM-DD.dump.zst .
   unzstd backup-YYYY-MM-DD.dump.zst
   ```
2) Create a fresh database (e.g., new Supabase project or local Postgres).
3) Restore:
   ```bash
   pg_restore --clean --create \
     --dbname="postgres://postgres:<password>@<host>:5432/postgres" \
     backup-YYYY-MM-DD.dump
   ```
4) Validate:
   - run app smoke test against staging
   - check critical tables counts
   - verify RLS/roles if applicable

## Delete logging (local SQL)
- File `supabase_guardrails.sql` creates `deletion_log` and attaches a BEFORE DELETE trigger to all user tables (excl. system/storage/realtime).
- Run it once in the target DB to capture any future deletes.
- `deletion_log` stores full row JSON and a `restore_hint` for manual replay.

## Recommended cadences
- Backups: nightly (already configured).
- Restore drill: monthly in staging.
- Key rotation: service role key 1–2× pro Jahr.
- Schema: keep migrations in Git; avoid ad-hoc SQL in production.
