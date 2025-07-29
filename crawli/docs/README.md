# Documentation Index

Welcome to the Crawli documentation! This directory contains comprehensive guides for using, developing, and deploying Crawli.

## 📚 Available Documentation

### For Users
- **[README.md](../README.md)** - Quick start guide and basic usage
- **[API.md](./API.md)** - Detailed API documentation and architecture overview

### For Developers  
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development setup, coding standards, and contributing guidelines
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - How to contribute to the project

### For Operations
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guides for Docker, Kubernetes, and cloud platforms

### Testing & Validation
- **[E2E_TEST_DOCUMENTATION.md](./E2E_TEST_DOCUMENTATION.md)** - End-to-end testing strategy and results
- **[FINAL_E2E_VALIDATION_REPORT.md](./FINAL_E2E_VALIDATION_REPORT.md)** - Comprehensive validation report

## 🔗 Quick Navigation

### Getting Started
1. [Installation](../README.md#installation) - Install Crawli locally or via Docker
2. [Basic Usage](../README.md#basic-usage) - Run your first crawl
3. [Configuration](../README.md#configuration) - Set up package lists

### Development
1. [Development Setup](./DEVELOPMENT.md#setup-development-environment) - Local development environment
2. [Adding Scrapers](./DEVELOPMENT.md#adding-new-scrapers) - Extend Crawli with new package sources
3. [Testing](./DEVELOPMENT.md#testing-strategy) - Run and write tests

### Production Deployment
1. [Docker Deployment](./DEPLOYMENT.md#docker-deployment) - Containerized deployment
2. [Kubernetes](./DEPLOYMENT.md#kubernetes-deployment) - Orchestrated deployment
3. [Cloud Functions](./DEPLOYMENT.md#cloud-functions) - Serverless deployment

### Architecture
1. [Core Components](./API.md#core-components) - Understanding the codebase
2. [Scraper Architecture](./API.md#scraper-implementations) - How scrapers work
3. [Configuration System](./API.md#configuration-system) - Package configuration format

## 📋 Project Structure Overview

```
crawli/
├── src/                    # Source code
│   ├── scrapers/          # Package-specific scrapers
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript definitions
├── tests/                 # Test suites
├── configs/               # Configuration examples
├── docs/                  # This documentation
├── examples/              # Usage examples
├── scripts/               # Deployment and utility scripts
└── dist/                  # Compiled output
```

## 🤝 Contributing

Want to contribute? Start with our [Contributing Guide](../CONTRIBUTING.md) and [Development Documentation](./DEVELOPMENT.md).

## 📞 Support

- **Issues**: Contact your internal development team
- **Discussions**: Use your organization's preferred communication channels
- **Security**: [Security Policy](../SECURITY.md)

## 📄 License

Crawli is released under the [MIT License](../LICENSE).
