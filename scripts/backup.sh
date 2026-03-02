#!/bin/sh
# ============================================
# KubeAtlas Database Backup Script
# ============================================

set -e

# Configuration
BACKUP_DIR="/backups"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/kubeatlas_backup_${DATE}.sql"

# Create backup directory if not exists
mkdir -p "${BACKUP_DIR}"

echo "Starting database backup..."
echo "Backup file: ${BACKUP_FILE}"

# Perform backup
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
    -h "${POSTGRES_HOST}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    -F p \
    -f "${BACKUP_FILE}"

# Compress backup
gzip "${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "Backup completed: ${BACKUP_FILE}"

# Calculate checksum
cd "${BACKUP_DIR}"
sha256sum "$(basename ${BACKUP_FILE})" > "${BACKUP_FILE}.sha256"

# Remove old backups
echo "Removing backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "kubeatlas_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "kubeatlas_backup_*.sql.gz.sha256" -type f -mtime +${RETENTION_DAYS} -delete

# List remaining backups
echo "Current backups:"
ls -lh "${BACKUP_DIR}"/kubeatlas_backup_*.sql.gz 2>/dev/null || echo "No backups found"

echo "Backup process completed successfully!"