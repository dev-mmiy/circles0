# Deployment Troubleshooting Guide

## Issue: Cloud Run Deployment Timeout (November 2, 2025)

### Problem Summary

**Commit:** `c244be8` - "fix: enable automatic database migrations on startup"

**Error:**
```
ERROR: The user-provided container failed to start and listen on the port defined provided by the PORT=8080 environment variable within the allocated timeout.
```

**Root Cause:**
1. Enabled automatic `alembic upgrade head` on container startup in Dockerfile
2. Database had an obsolete migration revision `86db3e3cb5f3` that no longer exists in codebase
3. Alembic couldn't locate the revision, causing startup to fail and timeout

---

## Solution Steps

### 1. Temporary Fix - Disable Auto-Migration

**Commit:** `485542b` - "fix: disable automatic migrations and improve migration safety"

Changed `backend/Dockerfile`:
```dockerfile
# Before (c244be8)
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]

# After (485542b)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
```

**Result:** Application successfully deployed and running.

---

### 2. Database Migration Cleanup

#### Issue: Obsolete Revision in Database
```
FAILED: Can't locate revision identified by '86db3e3cb5f3'
```

The database `alembic_version` table contained a revision ID that no longer exists in the codebase.

#### Solution: Reset alembic_version

Created Cloud Run Job to reset the version:

```bash
gcloud run jobs create force-update-version \
  --image=gcr.io/circles-202510/disease-community-api:latest \
  --region=asia-northeast1 \
  --command="python" \
  --args="-c,import os; from sqlalchemy import create_engine, text; \
          e=create_engine(os.getenv('DATABASE_URL'), isolation_level='AUTOCOMMIT'); \
          c=e.connect(); \
          c.execute(text('TRUNCATE TABLE alembic_version')); \
          c.execute(text(\"INSERT INTO alembic_version (version_num) VALUES ('000000000000')\")); \
          c.close()" \
  --set-env-vars="DATABASE_URL=${DATABASE_URL}" \
  --set-cloudsql-instances=circles-202510:asia-northeast1:disease-community-db
```

**Result:** Successfully reset to base migration `000000000000`.

---

### 3. Run Migration Manually

#### Issue: Alembic CLI doesn't properly handle DATABASE_URL in Cloud Run Jobs

Standard `alembic upgrade head` command failed with:
```
KeyError: 'url'
```

#### Solution: Use Python API Directly

Created Cloud Run Job using Alembic Python API:

```bash
gcloud run jobs create migrate-python \
  --image=gcr.io/circles-202510/disease-community-api:latest \
  --region=asia-northeast1 \
  --command="python" \
  --args="-c,import os; from alembic.config import Config; from alembic import command; \
          cfg=Config('/app/alembic.ini'); \
          cfg.set_main_option('sqlalchemy.url', os.getenv('DATABASE_URL')); \
          command.upgrade(cfg, 'head')" \
  --set-env-vars="DATABASE_URL=${DATABASE_URL}" \
  --set-cloudsql-instances=circles-202510:asia-northeast1:disease-community-db
```

**Result:** Migration `6b534d266a32` (Update user model for Auth0 profile management) successfully applied.

---

## Current State

✅ **Application Status:** Running and healthy
- URL: https://disease-community-api-508246122017.asia-northeast1.run.app
- Health Check: `{"status":"healthy"}`

✅ **Database Status:** Up to date
- Current migration: `6b534d266a32`
- New columns added:
  - `auth0_id`
  - `email_verified`
  - `display_name`
  - `username`
  - `avatar_url`
  - `gender`
  - `country`
  - `language`
  - `timezone`
  - `profile_visibility`
  - `show_email`
  - `show_online_status`
  - `last_login_at`

---

## Lessons Learned

### 1. Don't Run Migrations Automatically on Startup in Production

**Problem:**
- If migration fails, entire application fails to start
- Difficult to debug and recover
- Can cause extended downtime

**Best Practice:**
- Run migrations as separate jobs before deployment
- Use CI/CD pipeline to run migrations
- Implement migration rollback strategy

### 2. Keep Migration History Clean

**Problem:**
- Old migration files were deleted but database still referenced them
- Caused "Can't locate revision" errors

**Best Practice:**
- Never delete migration files that have been applied to production
- Use `alembic downgrade` before removing migrations
- Document migration history changes

### 3. Test Migrations in Staging First

**Best Practice:**
- Always test migrations in staging environment
- Verify rollback procedures
- Check for data compatibility issues

---

## Future Recommendations

### 1. Implement Pre-Deployment Migration Job in CI/CD

Add to `.github/workflows/ci.yml`:

```yaml
- name: Run Database Migrations
  run: |
    gcloud run jobs create migrate-${{ github.sha }} \
      --image gcr.io/${{ env.PROJECT_ID }}/disease-community-api:${{ github.sha }} \
      --command="python" \
      --args="-c,..." \
      --set-env-vars="DATABASE_URL=${{ secrets.DATABASE_URL }}" \
      --set-cloudsql-instances=... \
      || echo "Migration job already exists"
    
    gcloud run jobs execute migrate-${{ github.sha }} --wait
```

### 2. Add Migration Health Check Endpoint

Add to `app/main.py`:

```python
@app.get("/health/migrations")
async def migration_health():
    """Check if database migrations are up to date."""
    from sqlalchemy import text
    from app.database import engine
    
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version_num FROM alembic_version"))
        current_version = result.fetchone()[0]
        
    # Get latest version from migration files
    from alembic.script import ScriptDirectory
    from alembic.config import Config
    
    config = Config("alembic.ini")
    script = ScriptDirectory.from_config(config)
    head_version = script.get_current_head()
    
    return {
        "current_version": current_version,
        "expected_version": head_version,
        "up_to_date": current_version == head_version
    }
```

### 3. Document Migration Procedures

Create runbook for common migration scenarios:
- Rolling back migrations
- Recovering from failed migrations
- Handling data migrations
- Testing migration compatibility

---

## Related Files

- `backend/Dockerfile` - Container startup configuration
- `backend/alembic/versions/6b534d266a32_update_user_model_for_auth0_profile_.py` - Latest migration
- `backend/alembic/env.py` - Alembic configuration
- `backend/app/models/user.py` - User model definition

---

## Contact

If you encounter similar issues, refer to this document and the related commits:
- Commit `485542b`: Temporary fix (disable auto-migration)
- Commit `c244be8`: Original change (auto-migration enabled)
- Commit `2d2a475`: Added migration fix script

