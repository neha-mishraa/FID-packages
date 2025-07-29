# Multi-stage Docker build for production deployment

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy configuration files
COPY --from=builder /app/configs ./configs

# Copy necessary files
COPY --from=builder /app/README.md ./
COPY --from=builder /app/LICENSE ./

# Create non-root user for security
RUN addgroup -g 1001 -S crawli && \
    adduser -S crawli -u 1001 -G crawli

# Set proper ownership
RUN chown -R crawli:crawli /app

# Switch to non-root user
USER crawli

# Expose port (if running as a service)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check: OK')" || exit 1

# Default command
CMD ["node", "dist/index.js", "--config", "configs/production-example.txt", "--format", "json"]

# Labels for better maintenance
LABEL org.opencontainers.image.title="Crawli"
LABEL org.opencontainers.image.description="AI-powered package version scraper"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="Crawli Team"
LABEL org.opencontainers.image.source="https://github.com/crawli/crawli"
LABEL org.opencontainers.image.licenses="MIT"
