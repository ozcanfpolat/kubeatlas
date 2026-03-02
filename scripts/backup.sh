#!/bin/bash
# ============================================
# KubeAtlas Backup Script
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-kubeatlas}"
DB_NAME="${DB_NAME:-kubeatlas}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}KubeAtlas Backup${NC}"
echo -e "${BLUE}========================================${NC}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}Error: pg_dump not found${NC}"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

# Check if using Docker
if [ "${USE_DOCKER:-false}" = "true" ]; then
    echo -e "${BLUE}Using Docker container for backup...${NC}"
    
    # Check if container is running
    if ! docker ps | grep -q "kubeatlas-postgres"; then
        echo -e "${RED}Error: PostgreSQL container not running${NC}"
        exit 1
    fi
    
    docker exec kubeatlas-postgres pg_dump \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -Fc \
        > "${BACKUP_PATH}"
else
    echo -e "${BLUE}Using native pg_dump...${NC}"
    
    # Check if database is accessible
    if ! pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" > /dev/null 2>&1; then
        echo -e "${RED}Error: Database is not accessible${NC}"
        exit 1
    fi
    
    pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -Fc \
        > "${BACKUP_PATH}"
fi

# Check if backup was successful
if [ $? -eq 0 ] && [ -s "${BACKUP_PATH}" ]; then
    # Compress backup
echo -e "${BLUE}Compressing backup...${NC}"
    gzip "${BACKUP_PATH}"
    BACKUP_PATH="${BACKUP_PATH}.gz"
    
    # Get file size
    BACKUP_SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
    
    echo -e "${GREEN}✓ Backup completed successfully!${NC}"
    echo -e "  File: ${BACKUP_PATH}"
    echo -e "  Size: ${BACKUP_SIZE}"
    echo -e "  Timestamp: $(date -r "${BACKUP_PATH}" '+%Y-%m-%d %H:%M:%S')"
else
    echo -e "${RED}✗ Backup failed${NC}"
    rm -f "${BACKUP_PATH}"
    exit 1
fi

# Clean old backups
echo -e "${BLUE}Cleaning old backups...${NC}"
find "${BACKUP_DIR}" -name "backup_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete

BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "backup_*.sql.gz" | wc -l)
echo -e "${GREEN}✓ Cleanup completed${NC}"
echo -e "  ${BACKUP_COUNT} backup(s) retained"

echo -e "${BLUE}========================================${NC}"
