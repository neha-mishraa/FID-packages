#!/bin/bash

# Production deployment script
# Usage: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT=${1:-"production"}
DOCKER_IMAGE="crawli:latest"
CONTAINER_NAME="crawli-${ENVIRONMENT}"

echo "🚀 Deploying Crawli to ${ENVIRONMENT} environment"

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t ${DOCKER_IMAGE} .

# Stop existing container if running
if docker ps -q -f name=${CONTAINER_NAME} | grep -q .; then
    echo "🛑 Stopping existing container..."
    docker stop ${CONTAINER_NAME}
    docker rm ${CONTAINER_NAME}
fi

# Run the new container
echo "🏃 Starting new container..."
docker run -d \
    --name ${CONTAINER_NAME} \
    --restart unless-stopped \
    -v $(pwd)/configs:/app/configs:ro \
    -v $(pwd)/output:/app/output \
    -e NODE_ENV=${ENVIRONMENT} \
    ${DOCKER_IMAGE}

# Wait for container to be ready
echo "⏳ Waiting for container to be ready..."
sleep 5

# Check if container is running
if docker ps -q -f name=${CONTAINER_NAME} | grep -q .; then
    echo "✅ Deployment successful!"
    docker logs ${CONTAINER_NAME} --tail 10
else
    echo "❌ Deployment failed!"
    docker logs ${CONTAINER_NAME}
    exit 1
fi
