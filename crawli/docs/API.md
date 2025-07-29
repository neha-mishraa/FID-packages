# API Documentation

## Architecture Overview

Crawli follows a modular, extensible architecture based on the Strategy pattern. Each package source type has its own specialized scraper that extends the base scraper functionality.

### Core Components

#### BaseScraper
The foundation class that all scrapers extend. Provides:
- HTTP request handling with retries
- Error handling and logging
- Rate limiting and delays
- Common utility methods

```typescript
abstract class BaseScraper {
  abstract scrapeVersion(packageName: string, url: string): Promise<string | null>;
  protected makeRequest(url: string, options?: RequestOptions): Promise<AxiosResponse>;
  protected delay(ms: number): Promise<void>;
  protected isValidVersion(version: string): boolean;
}
```

#### Scraper Implementations

##### DockerHubScraper
Handles Docker Hub registry packages using multiple strategies:
1. **API Strategy**: Uses Docker Hub's REST API for fast, reliable data
2. **HTML Strategy**: Falls back to web scraping if API fails
3. **Cross-source Validation**: Verifies results against multiple endpoints

```typescript
class DockerHubScraper extends BaseScraper {
  async scrapeVersion(packageName: string, url: string): Promise<string | null>;
  private async tryApiStrategy(packageName: string): Promise<string | null>;
  private async tryHtmlStrategy(url: string): Promise<string | null>;
  private async tryCrossSourceValidation(packageName: string, version: string): Promise<boolean>;
}
```

##### GitHubScraper (GenericScraper)
Handles GitHub releases and general web pages:
- Parses release pages for semantic versions
- Filters out pre-releases and build variants
- Supports both GitHub releases and general web scraping

##### HashiCorpScraper
Specialized for HashiCorp's official release pages:
- Optimized for HashiCorp's consistent release format
- Handles Terraform, Vault, Consul, and other tools
- Filters platform-specific builds

##### OpkgScraper
Handles OpenWrt and Yocto package repositories:
- Parses OPKG package index files
- Extracts version information from package metadata
- Handles multiple package entries

#### ScraperFactory
Determines the appropriate scraper based on URL patterns:

```typescript
class ScraperFactory {
  static createScraper(url: string, logger: Logger): BaseScraper {
    if (url.includes('hub.docker.com')) return new DockerHubScraper(logger);
    if (url.includes('releases.hashicorp.com')) return new HashiCorpScraper(logger);
    if (url.includes('openwrt.org') && url.includes('Packages')) return new OpkgScraper(logger);
    return new GenericScraper(logger);
  }
}
```

### Configuration System

#### ConfigParser
Handles flexible configuration file parsing:
- Supports simple `name = url` format
- Ignores comments and empty lines
- Validates URLs and package names

```typescript
interface PackageConfig {
  name: string;
  url: string;
}

class ConfigParser {
  static parseConfig(configPath: string): PackageConfig[];
}
```

### Crawler Orchestration

#### Crawler
The main orchestrator that coordinates all scraping operations:

```typescript
interface CrawlerOptions {
  concurrency?: number;
  delay?: number;
  retries?: number;
  timeout?: number;
  verbose?: boolean;
}

class Crawler {
  constructor(options: CrawlerOptions = {});
  async crawlPackages(packages: PackageConfig[]): Promise<VersionResult[]>;
}
```

### Version Validation

Each scraper implements package-specific version validation to ensure accuracy:

```typescript
// Docker Hub - General semantic versioning
/^v?\d+(\.\d+)*(-[a-zA-Z0-9-]+)*$/

// Debian - Major.minor format
/^\d{1,2}(\.\d{1,2})?$/

// Fedora - Two-digit version numbers
/^\d{2}$/

// Alpine - Three-part semantic versioning
/^\d+\.\d+\.\d+$/
```

### Error Handling

Crawli implements comprehensive error handling at multiple levels:

1. **Network Level**: Retry with exponential backoff
2. **Parser Level**: Multiple parsing strategies with fallbacks
3. **Validation Level**: Cross-source verification for critical packages
4. **Application Level**: Graceful degradation and detailed logging

### Performance Features

- **Concurrent Processing**: Configurable concurrency levels
- **Request Caching**: Avoids duplicate requests within the same session
- **Rate Limiting**: Respectful delays between requests
- **Timeout Management**: Prevents hanging requests
- **Resource Optimization**: Efficient memory usage for large package lists

### Output Formats

#### JSON Output
```json
{
  "package": "alpine",
  "version": "3.22.0",
  "url": "https://hub.docker.com/r/library/alpine",
  "timestamp": "2024-01-15T10:30:00Z",
  "source": "docker-hub-api"
}
```

#### Text Output
```
alpine: 3.22.0
debian: 12.11
terraform: 1.6.5
```

## Usage Examples

### Basic Usage
```bash
# Crawl packages from configuration file
npm start -- --config configs/production-example.txt

# Output in JSON format
npm start -- --config configs/docker-images.txt --format json

# Enable verbose logging
npm start -- --config configs/mixed-sources.txt --verbose
```

### Programmatic Usage
```typescript
import { Crawler, ConfigParser } from './src';

const packages = ConfigParser.parseConfig('my-config.txt');
const crawler = new Crawler({
  concurrency: 5,
  delay: 1000,
  verbose: true
});

const results = await crawler.crawlPackages(packages);
console.log(results);
```

### Advanced Configuration
```typescript
const crawler = new Crawler({
  concurrency: 10,        // Process 10 packages simultaneously
  delay: 500,            // 500ms delay between requests
  retries: 3,            // Retry failed requests 3 times
  timeout: 30000,        // 30 second timeout per request
  verbose: true          // Enable detailed logging
});
```
