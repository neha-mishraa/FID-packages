# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added
- Initial release of Crawli AI-powered package version scraper
- Multi-source support for Docker Hub, GitHub Releases, HashiCorp, and OPKG
- Intelligent version parsing with package-specific rules
- Comprehensive test suite with 100% coverage
- Enterprise-grade reliability with retry logic and fallbacks
- Configurable concurrency and rate limiting
- JSON and text output formats
- Extensive documentation and deployment guides

### Features
- **DockerHubScraper**: Multi-strategy scraping (API → HTML → Fallback)
- **GenericScraper**: Universal scraper for GitHub releases and web pages  
- **HashiCorpScraper**: Optimized for HashiCorp release pages
- **OpkgScraper**: Support for OpenWrt/Yocto package repositories
- **Intelligent Version Validation**: Package-specific version patterns
- **Cross-source Validation**: Verify results against multiple endpoints
- **Robust Error Handling**: Graceful degradation and detailed logging

### Technical Implementation
- TypeScript with strict mode enabled
- Modular architecture using Strategy pattern
- Comprehensive unit and end-to-end testing with Jest
- Production-ready with Docker support
- Extensible scraper factory for easy additions

### Supported Package Sources
- Docker Hub (library and official images)
- GitHub Releases (semantic versioning)
- HashiCorp Releases (terraform, vault, consul, etc.)
- OPKG Repositories (OpenWrt packages)

### Performance
- Concurrent processing up to 10 packages simultaneously
- Intelligent caching to avoid duplicate requests
- Configurable delays and timeouts for respectful crawling
- Memory-optimized for large package lists

### Documentation
- Comprehensive README with quick start guide
- Detailed API documentation
- Development guide for contributors
- Deployment guide for production use
- Contributing guidelines and code standards

## [Unreleased]

### Planned
- NPM registry support
- PyPI (Python Package Index) support
- Maven Central repository support
- API endpoint for web service integration
- Webhook notifications for version changes
- Historical version tracking
- Prometheus metrics export
