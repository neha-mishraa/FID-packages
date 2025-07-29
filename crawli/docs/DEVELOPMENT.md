# Development Guide

## Setup Development Environment

### Prerequisites
- Node.js 18+ 
- npm 8+
- Git
- TypeScript knowledge
- Understanding of web scraping concepts

### Installation
```bash
# Clone the repository
git clone https://github.com/your-org/crawli.git
cd crawli

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start in development mode
npm run dev
```

### Development Scripts
```bash
npm run dev          # Run with ts-node and watch mode
npm run watch        # Run with nodemon for auto-restart
npm run build        # Compile TypeScript to JavaScript
npm run clean        # Remove build artifacts
npm run test         # Run all tests
npm run test:e2e     # Run end-to-end tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate test coverage report
```

## Project Structure

```
crawli/
├── src/                    # Source code
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   ├── scrapers/          # Scraper implementations
│   │   ├── BaseScraper.ts
│   │   ├── DockerHubScraper.ts
│   │   ├── GenericScraper.ts
│   │   ├── HashiCorpScraper.ts
│   │   ├── OpkgScraper.ts
│   │   └── ScraperFactory.ts
│   ├── utils/             # Utility functions
│   │   ├── ConfigParser.ts
│   │   └── Logger.ts
│   ├── Crawler.ts         # Main crawler orchestrator
│   └── index.ts           # CLI entry point
├── tests/                 # Test files
│   ├── e2e/              # End-to-end tests
│   └── unit/             # Unit tests
├── configs/              # Configuration examples
├── docs/                 # Documentation
├── examples/             # Usage examples
├── scripts/              # Utility scripts
└── dist/                 # Compiled JavaScript (git ignored)
```

## Adding New Scrapers

### 1. Create Scraper Class
Create a new scraper by extending `BaseScraper`:

```typescript
// src/scrapers/MyNewScraper.ts
import { BaseScraper } from './BaseScraper';
import { PackageMapping, ScrapingResult, VersionInfo } from '../types';

export class MyNewScraper extends BaseScraper {
  async scrapeVersion(packageMapping: PackageMapping): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      packageName: packageMapping.name,
      url: packageMapping.url,
      scrapedAt: new Date(),
    };

    try {
      // Implement your scraping logic here
      const versionInfo = await this.extractVersion(packageMapping.url);
      
      if (versionInfo) {
        result.latestVersion = versionInfo;
      } else {
        result.error = 'No version information found';
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error occurred';
    }

    return result;
  }

  private async extractVersion(url: string): Promise<VersionInfo | null> {
    // Your implementation here
    const html = await this.fetchHtml(url);
    const $ = this.parseHtml(html);
    
    // Extract version using cheerio selectors
    const versionText = $('selector-for-version').text();
    const version = this.extractVersionFromText(versionText);
    
    if (version) {
      return {
        version,
        downloadUrl: `https://example.com/download/${version}`,
        releaseDate: this.extractDateFromElement($, 'date-selector'),
      };
    }
    
    return null;
  }
}
```

### 2. Register in ScraperFactory
Add detection logic to `ScraperFactory`:

```typescript
// src/scrapers/ScraperFactory.ts
import { MyNewScraper } from './MyNewScraper';

export class ScraperFactory {
  static createScraper(packageMapping: PackageMapping, config: CrawlerConfig): BaseScraper {
    const url = packageMapping.url;
    
    if (url.includes('hub.docker.com')) {
      return new DockerHubScraper(config);
    }
    if (url.includes('releases.hashicorp.com')) {
      return new HashiCorpScraper(config);
    }
    // Add your new scraper detection
    if (url.includes('mynewregistry.com')) {
      return new MyNewScraper(config);
    }
    
    return new GenericScraper(config);
  }
}
```

### 3. Add Tests
Create comprehensive tests for your scraper:

```typescript
// tests/unit/MyNewScraper.test.ts
import { MyNewScraper } from '../../src/scrapers/MyNewScraper';
import nock from 'nock';

describe('MyNewScraper', () => {
  let scraper: MyNewScraper;

  beforeEach(() => {
    scraper = new MyNewScraper({
      timeout: 5000,
      userAgent: 'test-agent',
      delay: 0,
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should extract version from registry page', async () => {
    // Mock the HTTP response
    nock('https://mynewregistry.com')
      .get('/package/test-package')
      .reply(200, '<html><div class="version">1.2.3</div></html>');

    const result = await scraper.scrapeVersion({
      name: 'test-package',
      url: 'https://mynewregistry.com/package/test-package'
    });

    expect(result.latestVersion?.version).toBe('1.2.3');
    expect(result.error).toBeUndefined();
  });

  it('should handle network errors gracefully', async () => {
    nock('https://mynewregistry.com')
      .get('/package/test-package')
      .replyWithError('Network error');

    const result = await scraper.scrapeVersion({
      name: 'test-package',
      url: 'https://mynewregistry.com/package/test-package'
    });

    expect(result.latestVersion).toBeUndefined();
    expect(result.error).toContain('Network error');
  });
});
```

## Code Style and Standards

### TypeScript Configuration
The project uses strict TypeScript settings:
- Strict mode enabled
- No implicit any
- Consistent null checks
- Import/export consistency

### Code Formatting
- Use 2 spaces for indentation
- Always use semicolons
- Prefer single quotes for strings
- Use trailing commas in objects/arrays

### Naming Conventions
- **Classes**: PascalCase (`DockerHubScraper`)
- **Functions/Methods**: camelCase (`scrapeVersion`)
- **Variables**: camelCase (`packageName`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Files**: PascalCase for classes, camelCase for utilities

### Error Handling
Always implement comprehensive error handling:

```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  this.logger.error(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  throw new Error(`Failed to perform operation: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

### Logging Best Practices
Use structured logging with appropriate levels:

```typescript
// Good logging practices
this.logger.debug('Starting scraping process', { packageName, url });
this.logger.info('Successfully scraped version', { packageName, version });
this.logger.warn('Falling back to alternative strategy', { reason });
this.logger.error('Scraping failed', { packageName, error: error.message });
```

## Testing Strategy

### Unit Tests
Test individual components in isolation:
- Mock external dependencies
- Test both success and failure scenarios
- Verify error handling
- Test edge cases

```typescript
describe('ConfigParser', () => {
  it('should parse valid configuration', () => {
    const config = 'package = https://example.com';
    const result = ConfigParser.parseConfigString(config);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('package');
  });

  it('should ignore comments and empty lines', () => {
    const config = `
      # This is a comment
      package1 = https://example.com
      
      # Another comment
      package2 = https://example2.com
    `;
    const result = ConfigParser.parseConfigString(config);
    expect(result).toHaveLength(2);
  });
});
```

### Integration Tests
Test component interactions:
- Test scraper factory decisions
- Test crawler orchestration
- Test configuration loading

### End-to-End Tests
Test complete workflows:
- Real scraping scenarios (with mocking)
- Configuration file processing
- Output generation

## Debugging

### VS Code Configuration
The project includes VS Code debugging configuration:

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Crawli",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/index.ts",
      "args": ["--config", "configs/test-suite.txt", "--verbose"],
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### Common Debugging Scenarios

#### Network Issues
```typescript
// Add request/response logging
const response = await axios.get(url, {
  ...config,
  onRequest: (req) => console.log('Request:', req.url),
  onResponse: (res) => console.log('Response:', res.status, res.headers)
});
```

#### Version Parsing Issues
```typescript
// Debug version extraction
const extractVersion = (text: string): string | null => {
  console.log('Parsing text:', text);
  const matches = text.match(/version-pattern/);
  console.log('Matches found:', matches);
  return matches ? matches[1] : null;
};
```

#### Scraper Selection Issues
```typescript
// Debug scraper factory decisions
console.log('URL:', url);
console.log('Selected scraper:', scraper.constructor.name);
```

## Performance Optimization

### Profiling
Use Node.js built-in profiler:

```bash
# CPU profiling
node --prof dist/index.js --config configs/large-config.txt

# Memory profiling
node --inspect dist/index.js --config configs/large-config.txt
```

### Memory Optimization
- Avoid storing large HTML strings unnecessarily
- Use streaming for large responses
- Clean up cheerio objects after use

```typescript
// Good practice - clean up after parsing
const $ = cheerio.load(html);
const version = $('.version').text();
// Don't store $ reference beyond this scope
```

### Request Optimization
- Implement intelligent caching
- Use connection pooling
- Optimize timeout values

## Release Process

### Version Bumping
```bash
# Patch version (bug fixes)
npm version patch

# Minor version (new features)
npm version minor

# Major version (breaking changes)
npm version major
```

### Release Checklist
1. Update CHANGELOG.md
2. Run full test suite
3. Update documentation
4. Build and test production bundle
5. Tag release in Git
6. Publish to npm (if applicable)

### Changelog Format
```markdown
## [1.2.0] - 2024-01-15

### Added
- New scraper for MyRegistry
- Support for custom headers

### Changed
- Improved error handling in DockerHubScraper
- Updated dependencies

### Fixed
- Fixed version parsing for edge cases
- Resolved memory leak in concurrent processing

### Deprecated
- Old configuration format (will be removed in v2.0)
```

## Contributing Guidelines

### Pull Request Process
1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass
5. Update documentation
6. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

### Code Review Checklist
- [ ] Code follows project style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No breaking changes (or properly documented)
- [ ] Performance impact considered
- [ ] Security implications reviewed

## Troubleshooting

### Common Issues

#### "Module not found" errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript compilation errors
```bash
# Clean and rebuild
npm run clean
npm run build
```

#### Test failures
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- tests/unit/DockerHubScraper.test.ts
```

#### Network timeouts
- Increase timeout values in configuration
- Check network connectivity
- Verify target URLs are accessible

#### Version parsing failures
- Check if target site structure changed
- Update selectors in scraper
- Add fallback parsing strategies
