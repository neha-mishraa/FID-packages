# Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability within Crawli, please follow these steps:

### 1. Do Not Report Security Issues Publicly
Please do not report security vulnerabilities through public channels or forums.

### 2. Send a Private Report
Instead, please contact your internal security team or email:
- **Security Team**: [Your internal security email]
- **Subject Line**: `[SECURITY] Vulnerability Report - Crawli`

### 3. Include Detailed Information
Please include as much of the following information as possible:
- Type of vulnerability (e.g., remote code execution, injection, etc.)
- Location of the affected source code (file path and line numbers)
- Special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact assessment of the vulnerability

### 4. Response Timeline
- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days with an initial assessment
- **Fix Timeline**: Critical issues within 30 days, others within 90 days

## Security Measures

### Code Security
- All dependencies are regularly audited using `npm audit`
- We use Snyk for continuous security monitoring
- Code is scanned for vulnerabilities in our CI/CD pipeline

### Runtime Security
- Docker images use non-root users
- Minimal attack surface with Alpine Linux base images
- Security headers and input validation implemented

### Network Security
- All external requests use HTTPS
- Rate limiting prevents abuse
- Configurable timeouts prevent hanging connections

### Data Protection
- No sensitive data is logged or stored
- Configuration files should not contain secrets
- Environment variables used for sensitive configuration

## Best Practices for Users

### Secure Configuration
```bash
# Use environment variables for sensitive data
export CRAWLI_API_KEY="your-api-key"

# Don't commit configuration files with secrets
echo "private-config.txt" >> .gitignore
```

### Docker Security
```dockerfile
# Run as non-root user
USER crawli

# Use specific image tags, not 'latest'
FROM crawli:1.0.0

# Scan images for vulnerabilities
docker scout cves crawli:1.0.0
```

### Network Security
```bash
# Use private networks in production
docker network create crawli-private

# Limit network access
docker run --network crawli-private crawli:1.0.0
```

## Security Updates

Security updates will be:
1. Released as patch versions (e.g., 1.0.1)
2. Announced via GitHub releases
3. Documented in the CHANGELOG.md
4. Tagged with `security` label

## Vulnerability Disclosure

We follow responsible disclosure practices:

1. **Private Coordination**: Work with reporters to understand and fix issues
2. **Public Disclosure**: After fixes are released and users have time to update
3. **Credit**: Security researchers will be credited (unless they prefer anonymity)

## Security Tools Integration

### GitHub Security Features
- Dependabot for dependency updates
- CodeQL for code analysis
- Secret scanning for leaked credentials

### Third-party Tools
- Snyk for vulnerability scanning
- Docker Scout for container security
- npm audit for dependency auditing

## Contact

For security-related questions or concerns:
- **Email**: security@crawli.dev
- **PGP Key**: Available on request
- **Response Time**: Within 48 hours

---

**Note**: This security policy is subject to updates. Please check back regularly for the latest version.
