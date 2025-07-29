# Deployment Guide

## Production Deployment

### Docker Deployment

#### Option 1: Build from Source
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S crawli && \
    adduser -S crawli -u 1001

USER crawli

# Expose port and start
EXPOSE 3000
CMD ["npm", "start"]
```

#### Option 2: Multi-stage Build
```dockerfile
# Multi-stage Dockerfile for optimized production image
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/configs ./configs

# Create non-root user
RUN addgroup -g 1001 -S crawli && \
    adduser -S crawli -u 1001

# Set proper permissions
RUN chown -R crawli:crawli /app
USER crawli

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

#### Build and Run
```bash
# Build the image
docker build -t crawli:latest .

# Run the container
docker run -d \
  --name crawli \
  -v $(pwd)/configs:/app/configs \
  -v $(pwd)/output:/app/output \
  crawli:latest \
  --config /app/configs/production.txt \
  --output /app/output/results.json \
  --format json
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  crawli:
    build: .
    container_name: crawli
    volumes:
      - ./configs:/app/configs:ro
      - ./output:/app/output
    environment:
      - NODE_ENV=production
      - CRAWLI_CONCURRENCY=5
      - CRAWLI_DELAY=1000
    command: >
      node dist/index.js
      --config /app/configs/production.txt
      --output /app/output/results.json
      --format json
      --verbose
    restart: unless-stopped
```

### Kubernetes Deployment

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crawli
  labels:
    app: crawli
spec:
  replicas: 2
  selector:
    matchLabels:
      app: crawli
  template:
    metadata:
      labels:
        app: crawli
    spec:
      containers:
      - name: crawli
        image: crawli:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: CRAWLI_CONCURRENCY
          value: "5"
        volumeMounts:
        - name: config-volume
          mountPath: /app/configs
          readOnly: true
        - name: output-volume
          mountPath: /app/output
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: config-volume
        configMap:
          name: crawli-config
      - name: output-volume
        emptyDir: {}

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: crawli-config
data:
  production.txt: |
    alpine = https://hub.docker.com/r/library/alpine
    debian = https://hub.docker.com/r/library/debian
    terraform = https://github.com/hashicorp/terraform/releases

---
apiVersion: v1
kind: Service
metadata:
  name: crawli-service
spec:
  selector:
    app: crawli
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
```

### Cloud Functions

#### AWS Lambda
```typescript
// lambda-handler.ts
import { Crawler, ConfigParser } from './src';

export const handler = async (event: any) => {
  try {
    const packages = event.packages || ConfigParser.parseConfig('default-config.txt');
    const crawler = new Crawler({
      concurrency: 10,
      delay: 100, // Reduced delay for serverless
      timeout: 25000 // Lambda timeout is 30s
    });
    
    const results = await crawler.crawlPackages(packages);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
```

#### Google Cloud Functions
```javascript
// index.js for Google Cloud Functions
const { Crawler, ConfigParser } = require('./dist');

exports.crawlPackages = async (req, res) => {
  try {
    const packages = req.body.packages || ConfigParser.parseConfig('default-config.txt');
    const crawler = new Crawler({
      concurrency: 5,
      delay: 200,
      timeout: 540000 // 9 minutes for Cloud Functions
    });
    
    const results = await crawler.crawlPackages(packages);
    
    res.status(200).json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

## Environment Configuration

### Environment Variables
```bash
# Production environment variables
NODE_ENV=production
CRAWLI_CONCURRENCY=5
CRAWLI_DELAY=1000
CRAWLI_TIMEOUT=30000
CRAWLI_RETRIES=3
CRAWLI_LOG_LEVEL=info
CRAWLI_OUTPUT_FORMAT=json
```

### Configuration Files
Create environment-specific configuration files:

```bash
# configs/production.txt
alpine = https://hub.docker.com/r/library/alpine
debian = https://hub.docker.com/r/library/debian
ubuntu = https://hub.docker.com/r/library/ubuntu

# configs/staging.txt  
alpine = https://hub.docker.com/r/library/alpine
terraform = https://github.com/hashicorp/terraform/releases

# configs/development.txt
alpine = https://hub.docker.com/r/library/alpine
```

## Monitoring and Logging

### Application Metrics
```typescript
// Add to your monitoring setup
interface CrawlMetrics {
  totalPackages: number;
  successfulCrawls: number;
  failedCrawls: number;
  averageResponseTime: number;
  errors: Array<{package: string, error: string}>;
}
```

### Health Checks
```typescript
// health-check.ts
export const healthCheck = async (): Promise<{status: string, uptime: number}> => {
  return {
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  };
};
```

### Log Aggregation
For production deployments, consider:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Fluentd** for log collection
- **Prometheus** + **Grafana** for metrics
- **New Relic** or **DataDog** for APM

## Security Considerations

### Network Security
- Use HTTPS for all external requests
- Implement rate limiting to prevent abuse
- Use VPN or private networks for internal deployments

### Authentication
```typescript
// Add API key authentication if exposing as service
app.use('/api', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || !validateApiKey(apiKey)) {
    return res.status(401).json({error: 'Invalid API key'});
  }
  next();
});
```

### Input Validation
```typescript
// Validate configuration inputs
const validateConfig = (packages: PackageConfig[]): boolean => {
  for (const pkg of packages) {
    if (!isValidUrl(pkg.url) || !isValidPackageName(pkg.name)) {
      throw new Error(`Invalid configuration: ${pkg.name}`);
    }
  }
  return true;
};
```

## Performance Optimization

### Caching Strategy
```typescript
// Implement Redis caching for production
import Redis from 'ioredis';

class CacheService {
  private redis = new Redis(process.env.REDIS_URL);
  
  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }
  
  async set(key: string, value: string, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, value);
  }
}
```

### Database Storage
```typescript
// Store results in database for historical tracking
interface VersionHistory {
  package: string;
  version: string;
  crawledAt: Date;
  source: string;
}
```

## Scaling Considerations

### Horizontal Scaling
- Deploy multiple instances behind a load balancer
- Use message queues (Redis/RabbitMQ) for package processing
- Implement distributed caching

### Vertical Scaling
- Optimize for CPU-bound operations
- Increase concurrency based on available resources
- Monitor memory usage for large package lists

## Backup and Recovery

### Configuration Backup
```bash
# Backup configurations
tar -czf config-backup-$(date +%Y%m%d).tar.gz configs/

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
aws s3 cp configs/ s3://crawli-backups/configs-$DATE/ --recursive
```

### Result Archives
```bash
# Archive crawl results
gzip -9 output/results-$(date +%Y%m%d).json
aws s3 cp output/results-*.json.gz s3://crawli-archives/
```
