# Database Backup Strategy

## Overview
This document outlines recommended backup strategies for the Ebook Library PostgreSQL database.

## Automated Backup with Docker

### Option 1: pg_dump via Cron Container

Add this service to your `docker-compose.yml`:

```yaml
  backup:
    image: postgres:15-alpine
    container_name: ebook-library-backup
    depends_on:
      db:
        condition: service_healthy
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-ebookuser}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-ebookpass}
      POSTGRES_DB: ${POSTGRES_DB:-ebooklibrary}
      BACKUP_KEEP_DAYS: 7
      BACKUP_KEEP_WEEKS: 4
      BACKUP_KEEP_MONTHS: 6
    volumes:
      - ./backups:/backups
      - ./scripts/backup.sh:/backup.sh:ro
    entrypoint: /bin/sh
    command: -c "crond -f -d 8"
```

### Backup Script

Create `scripts/backup.sh`:

```bash
#!/bin/sh
set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql.gz"

# Create backup
pg_dump -h db -U $POSTGRES_USER -d $POSTGRES_DB | gzip > $BACKUP_FILE

# Remove old backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +${BACKUP_KEEP_DAYS:-7} -delete

echo "Backup completed: $BACKUP_FILE"
```

### Crontab

Create `scripts/crontab`:

```
# Daily backup at 2 AM
0 2 * * * /backup.sh >> /var/log/backup.log 2>&1
```

## Manual Backup

### Create Backup

```bash
# From host machine
docker exec ebook-library-db pg_dump -U ebookuser -d ebooklibrary | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore from Backup

```bash
# Stop the backend
docker-compose stop backend

# Restore database
gunzip < backup_20260110.sql.gz | docker exec -i ebook-library-db psql -U ebookuser -d ebooklibrary

# Restart backend
docker-compose start backend
```

## Backup Best Practices

### 1. **Multiple Backup Locations**
- Local backups on the host machine
- Remote backups to cloud storage (S3, Google Cloud Storage, etc.)
- Consider using tools like `restic` or `borg` for encrypted backups

### 2. **Backup Frequency**
- **Recommended**: Daily automated backups
- **Minimum**: Weekly backups for low-activity instances
- **High-activity**: Consider hourly or continuous replication

### 3. **Backup Retention Policy**
- Keep daily backups for 7 days
- Keep weekly backups for 4 weeks
- Keep monthly backups for 6-12 months
- Adjust based on your data retention requirements

### 4. **Test Restores Regularly**
- Schedule quarterly restore tests
- Verify backup integrity
- Document restore procedures
- Test in a separate environment

### 5. **What to Backup**
- **Database**: PostgreSQL data (automated above)
- **Book Files**: `./data/books` directory
- **Cover Images**: `./data/covers` directory
- **Configuration**: `.env` file (store securely, contains secrets!)

## Cloud Backup Examples

### AWS S3

```bash
#!/bin/bash
# Upload to S3 after creating backup
aws s3 cp $BACKUP_FILE s3://your-bucket/ebook-library/backups/
```

### Google Cloud Storage

```bash
#!/bin/bash
# Upload to GCS after creating backup
gsutil cp $BACKUP_FILE gs://your-bucket/ebook-library/backups/
```

### Restic (Encrypted, Deduplicated)

```bash
#!/bin/bash
# Initialize repository (once)
restic -r /path/to/backup/repo init

# Create backup
restic -r /path/to/backup/repo backup ./data ./backups .env

# Prune old backups
restic -r /path/to/backup/repo forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
```

## Monitoring Backups

### Log Backup Status

Add to your backup script:

```bash
# Send notification on success/failure
if [ $? -eq 0 ]; then
    echo "SUCCESS: Backup completed at $(date)" >> /var/log/backup.log
    # Optional: Send success notification (email, webhook, etc.)
else
    echo "ERROR: Backup failed at $(date)" >> /var/log/backup.log
    # Optional: Send alert notification
fi
```

### Health Check Endpoint

Consider creating a health check endpoint that verifies:
- Last backup timestamp
- Backup file size
- Backup integrity

## Disaster Recovery Plan

1. **Identify backup to restore**
2. **Stop the application**:
   ```bash
   docker-compose down
   ```

3. **Restore database**:
   ```bash
   gunzip < backup.sql.gz | docker exec -i ebook-library-db psql -U ebookuser -d ebooklibrary
   ```

4. **Restore book files**:
   ```bash
   cp -r backup/books/* ./data/books/
   cp -r backup/covers/* ./data/covers/
   ```

5. **Restart application**:
   ```bash
   docker-compose up -d
   ```

6. **Verify functionality**:
   - Check application logs
   - Test file uploads
   - Verify user access
   - Confirm book reading works

## Implementation Status

✅ **Documentation Complete**
⏸️ **Implementation Optional** - Backup strategy depends on your deployment environment and requirements

**Recommended Next Steps**:
1. Choose a backup strategy that fits your needs
2. Set up automated daily backups
3. Test restore procedure
4. Document your specific backup configuration
5. Add monitoring for backup success/failure
