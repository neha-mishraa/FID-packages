#!/bin/bash

# Backup configuration and results
# Usage: ./scripts/backup.sh [destination]

set -e

DESTINATION=${1:-"./backups"}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="${DESTINATION}/crawli-backup-${TIMESTAMP}"

echo "💾 Creating backup at ${BACKUP_DIR}"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Backup configurations
if [ -d "configs" ]; then
    echo "📁 Backing up configurations..."
    cp -r configs ${BACKUP_DIR}/
fi

# Backup output (if exists)
if [ -d "output" ]; then
    echo "📊 Backing up output..."
    cp -r output ${BACKUP_DIR}/
fi

# Backup documentation
echo "📚 Backing up documentation..."
cp README.md CHANGELOG.md LICENSE ${BACKUP_DIR}/ 2>/dev/null || true

# Create archive
echo "🗜️  Creating archive..."
cd ${DESTINATION}
tar -czf crawli-backup-${TIMESTAMP}.tar.gz crawli-backup-${TIMESTAMP}/
rm -rf crawli-backup-${TIMESTAMP}/

echo "✅ Backup completed: ${DESTINATION}/crawli-backup-${TIMESTAMP}.tar.gz"
