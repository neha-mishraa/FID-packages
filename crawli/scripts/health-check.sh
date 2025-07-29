#!/bin/bash

# Production health check script
# Usage: ./scripts/health-check.sh [url]

set -e

URL=${1:-"http://localhost:3000/health"}
TIMEOUT=${2:-10}

echo "🏥 Performing health check on ${URL}"

# Check if the service is responding
if curl -f -s --max-time ${TIMEOUT} "${URL}" > /dev/null; then
    echo "✅ Service is healthy"
    exit 0
else
    echo "❌ Service health check failed"
    exit 1
fi
