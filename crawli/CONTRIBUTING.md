# Contributing to Crawli

Thank you for your interest in contributing to Crawli! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Git
- TypeScript knowledge
- Familiarity with web scraping concepts

### Development Setup

1. **Clone the Repository**
   ```bash
   git clone <internal-repo-url>
   cd crawli
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build and Test**
   ```bash
   npm run build
   npm test
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

## 📋 Development Guidelines

### Code Style

We use TypeScript with strict type checking. Please follow these guidelines:

- **Use TypeScript**: All code should be written in TypeScript
- **Type Safety**: Prefer explicit types over `any`
- **Documentation**: Add JSDoc comments for public methods
- **Naming**: Use descriptive variable and function names
- **Formatting**: Use 2 spaces for indentation

### Project Structure

```
src/
├── types/           # TypeScript type definitions
├── scrapers/        # Scraper implementations
│   ├── BaseScraper.ts
│   ├── DockerHubScraper.ts
│   └── ...
├── utils/           # Utility functions
├── Crawler.ts       # Main orchestrator
└── index.ts         # CLI entry point

tests/
├── e2e/             # End-to-end tests
└── unit/            # Unit tests

docs/                # Documentation
configs/             # Example configurations
scripts/             # Build and utility scripts
```

## 🔧 Adding New Package Types

### 1. Create Scraper Class

Create a new scraper class extending `BaseScraper`:

```typescript
// src/scrapers/MyPackageScraper.ts
import { BaseScraper } from './BaseScraper';
import { PackageMapping, ScrapingResult, VersionInfo } from '../types';

export class MyPackageScraper extends BaseScraper {
  async scrapeVersion(packageMapping: PackageMapping): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      packageName: packageMapping.name,
      url: packageMapping.url,
      scrapedAt: new Date(),
    };

    try {
      // Your scraping logic here
      const versionInfo = await this.extractVersion(packageMapping.url);
      
      if (versionInfo) {
        result.latestVersion = versionInfo;
      } else {
        result.error = 'No version information found';
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  private async extractVersion(url: string): Promise<VersionInfo | null> {
    // Implementation specific to your package type
    const html = await this.fetchHtml(url);
    const $ = this.parseHtml(html);
    
    // Extract version information
    const version = this.extractVersionFromText($('body').text());
    
    if (version) {
      return {
        version,
        downloadUrl: `https://example.com/download/${version}`,
      };
    }
    
    return null;
  }
}
```

### 2. Update Types

Add your package type to the enum:

```typescript
// src/types/index.ts
export enum PackageType {
  // ... existing types
  MY_PACKAGE = 'my-package',
}
```

### 3. Update ScraperFactory

Register your scraper in the factory:

```typescript
// src/scrapers/ScraperFactory.ts
import { MyPackageScraper } from './MyPackageScraper';

export class ScraperFactory {
  static createScraper(packageMapping: PackageMapping, config: Partial<ScraperConfig> = {}): BaseScraper {
    switch (packageMapping.type) {
      // ... existing cases
      case PackageType.MY_PACKAGE:
        return new MyPackageScraper(config);
      default:
        return new GenericScraper(config);
    }
  }
}
```

### 4. Update ConfigParser

Add URL detection pattern:

```typescript
// src/utils/ConfigParser.ts
private static detectPackageType(name: string, url: string): PackageType {
  const urlLower = url.toLowerCase();
  
  // ... existing detection logic
  
  if (urlLower.includes('mypackage.com')) {
    return PackageType.MY_PACKAGE;
  }
  
  return PackageType.GENERIC;
}
```

### 5. Add Tests

Create comprehensive tests:

```typescript
// tests/unit/MyPackageScraper.test.ts
import { MyPackageScraper } from '../../src/scrapers/MyPackageScraper';
import { PackageType } from '../../src/types';

describe('MyPackageScraper', () => {
  let scraper: MyPackageScraper;

  beforeEach(() => {
    scraper = new MyPackageScraper();
  });

  test('should extract version correctly', async () => {
    const result = await scraper.scrapeVersion({
      name: 'TestPackage',
      url: 'https://mypackage.com/releases',
      type: PackageType.MY_PACKAGE
    });

    expect(result.latestVersion?.version).toBeDefined();
    expect(result.error).toBeUndefined();
  });
});
```

## 🧪 Testing Guidelines

### Writing Tests

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete workflows
- **Mock External Services**: Use `nock` for HTTP mocking

### Test Structure

```typescript
describe('Component Name', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  test('should do something specific', async () => {
    // Arrange
    const input = 'test data';
    
    // Act
    const result = await component.method(input);
    
    // Assert
    expect(result).toBe('expected output');
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test -- MyPackageScraper.test.ts

# E2E tests only
npm run test:e2e

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 🐛 Bug Reports

### Before Submitting

1. Check existing issues
2. Try the latest version
3. Test with minimal reproduction case

### Bug Report Template

```markdown
**Bug Description**
A clear description of the bug.

**Steps to Reproduce**
1. Step one
2. Step two
3. ...

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: [e.g., macOS 12.6]
- Node.js version: [e.g., 18.17.0]
- Crawli version: [e.g., 1.0.0]

**Configuration**
```txt
Package = https://example.com
```

**Error Logs**
```
Paste any error logs here
```
```

## ✨ Feature Requests

### Feature Request Template

```markdown
**Feature Description**
A clear description of the feature you'd like.

**Use Case**
Describe the problem this feature would solve.

**Proposed Solution**
Describe how you envision this feature working.

**Alternatives Considered**
Any alternative solutions you've considered.

**Additional Context**
Any other context or screenshots.
```

## 📝 Documentation

### Documentation Guidelines

- **Clear Examples**: Provide working code examples
- **Step-by-Step**: Break complex processes into steps
- **Cross-References**: Link related sections
- **Keep Updated**: Update docs with code changes

### Documentation Types

- **README.md**: Project overview and quick start
- **API Documentation**: Generated from JSDoc comments
- **Guides**: Step-by-step tutorials
- **Examples**: Working code samples

## 🔍 Code Review Process

### Submitting Pull Requests

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```
3. **Make Changes**
4. **Add Tests**
5. **Update Documentation**
6. **Submit PR**

### PR Guidelines

- **Clear Title**: Descriptive PR title
- **Description**: Explain what and why
- **Tests**: Include relevant tests
- **Documentation**: Update docs if needed
- **Small Changes**: Keep PRs focused and small

### Review Criteria

- ✅ Code follows style guidelines
- ✅ Tests pass and coverage is maintained
- ✅ Documentation is updated
- ✅ No breaking changes (or properly documented)
- ✅ Performance impact is considered

## 🏷️ Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Git tag created
- [ ] Release notes published

## 💬 Communication

### Getting Help

- **Internal Issues**: Bug reports and feature requests
- **Internal Discussions**: Questions and general discussion
- **Email**: maintainers@crawli.dev

### Community Guidelines

- **Be Respectful**: Treat everyone with respect
- **Be Constructive**: Provide helpful feedback
- **Be Patient**: Allow time for responses
- **Be Clear**: Communicate clearly and concisely

## 🎯 Development Priorities

### High Priority
- Performance optimizations
- New package type support
- Bug fixes and stability

### Medium Priority
- API improvements
- Additional output formats
- Enhanced error handling

### Low Priority
- Nice-to-have features
- Code refactoring
- Documentation improvements

## 📚 Resources

### Learning Resources
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Web Scraping Best Practices](https://scrapingbee.com/blog/web-scraping-best-practices/)

### Tools
- [VSCode](https://code.visualstudio.com/) - Recommended editor
- [Postman](https://www.postman.com/) - API testing
- [nock](https://github.com/nock/nock) - HTTP mocking

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Annual contributor highlights

Thank you for contributing to Crawli! 🚀
