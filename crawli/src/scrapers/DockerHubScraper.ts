import { BaseScraper } from './BaseScraper';
import { PackageMapping, ScrapingResult, VersionInfo } from '../types';

/**
 * Docker Hub scraper with intelligent version filtering
 * 
 * Features:
 * - Multi-layered fallback (API → HTML → alternative sources)
 * - Package-specific version validation (Alpine 3.x.x, Fedora xx, Ubuntu YY.MM, etc.)
 * - Development/testing tag filtering (excludes rawhide, branched, alpha, beta, etc.)
 * - Build variant filtering (excludes -alpine, -slim, -otp suffixes)
 * - RPM-specific filtering (excludes Fedora rawhide and branched development tags)
 */
export class DockerHubScraper extends BaseScraper {
  async scrapeVersion(packageMapping: PackageMapping): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      packageName: packageMapping.name,
      url: packageMapping.url,
      scrapedAt: new Date(),
    };

    try {
      // For Docker Hub, we need to navigate to the tags page
      const tagsUrl = this.getTagsUrl(packageMapping.url);
      
      // Try multiple approaches for reliability
      // Docker Hub API expects lowercase package names
      const dockerPackageName = packageMapping.name.toLowerCase();
      const versionInfo = await this.tryMultipleApproaches(tagsUrl, dockerPackageName);
      
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

  private async tryMultipleApproaches(url: string, packageName: string): Promise<VersionInfo | null> {
    const approaches = [
      () => this.approachDockerHubAPI(packageName),
      () => this.approachHTMLScraping(url, packageName),
      () => this.approachFallbackScraping(url, packageName),
    ];

    for (const approach of approaches) {
      try {
        const result = await approach();
        if (result) {
          return result;
        }
      } catch (error) {
        // Continue to next approach
        console.warn(`Approach failed for ${packageName}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return null;
  }

  private async approachDockerHubAPI(packageName: string): Promise<VersionInfo | null> {
    try {
      // Prioritize comprehensive coverage first, then recent releases as fallback
      const apiQueries = [
        // Get as many tags as possible to ensure we capture the latest
        `https://hub.docker.com/v2/repositories/library/${packageName}/tags/?page_size=1000`,
        // Try recent updates as secondary approach
        `https://hub.docker.com/v2/repositories/library/${packageName}/tags/?page_size=500&ordering=-last_updated`,
        // Alphabetical fallback
        `https://hub.docker.com/v2/repositories/library/${packageName}/tags/?page_size=500&ordering=-name`
      ];
      
      for (const apiUrl of apiQueries) {
        try {
          const response = await this.fetchJson(apiUrl);
          
          if (response && response.results && Array.isArray(response.results)) {
            // For future-proofing, add smart filtering based on release frequency
            // This approach combines comprehensive coverage with recency bias
            
            // First, check for Fedora-specific development tags before general filtering
            let hasRawhideIndicators = false;
            if (packageName.toLowerCase() === 'fedora') {
              hasRawhideIndicators = response.results.some((tag: any) => 
                tag.name && (
                  tag.name.toLowerCase().includes('rawhide') || 
                  tag.name.toLowerCase().includes('branched') ||
                  tag.name.toLowerCase().includes('devel')
                )
              );
            }

            const validTags = response.results
              .filter((tag: any) => tag.name && this.isValidVersionTag(tag.name, packageName))
              .map((tag: any) => ({
                name: tag.name,
                last_updated: tag.last_updated,
                extractedVersion: this.extractVersionFromDockerTag(tag.name, packageName)
              }))
              .filter((tag: any) => tag.extractedVersion); // Only keep tags where we could extract a version

            // Apply Fedora-specific filtering before sorting
            let finalValidTags = validTags;
            if (packageName.toLowerCase() === 'fedora') {
              finalValidTags = this.filterFedoraStableVersions(validTags, hasRawhideIndicators);
            }

            finalValidTags.sort((a: any, b: any) => {
              // Sort by the extracted version, not the tag name
              return this.compareVersions(a.extractedVersion, b.extractedVersion);
            });

            if (finalValidTags.length > 0) {
              const latest = finalValidTags[finalValidTags.length - 1];
              
              // Future enhancement: For packages with frequent releases, 
              // we could add logic here to validate that the latest version
              // is reasonably recent (within last 6 months) to catch edge cases
              
              if (latest.extractedVersion) {
                return {
                  version: latest.extractedVersion,
                  releaseDate: latest.last_updated ? new Date(latest.last_updated).toISOString().split('T')[0] : undefined,
                  downloadUrl: `docker pull ${packageName}:${latest.name}`,
                };
              }
            }
          }
        } catch (error) {
          console.warn(`API query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          continue; // Try next query
        }
      }
    } catch (error) {
      console.warn(`Docker Hub API failed for ${packageName}:`, error instanceof Error ? error.message : 'Unknown error');
    }

    return null;
  }

  private async fetchJson(url: string): Promise<any> {
    try {
      const axios = require('axios');
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'application/json',
        },
        timeout: this.config.timeout,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch JSON from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async approachHTMLScraping(url: string, packageName: string): Promise<VersionInfo | null> {
    const html = await this.fetchHtml(url);
    const $ = this.parseHtml(html);
    
    return this.extractDockerVersion($, url, packageName);
  }

  private async approachFallbackScraping(url: string, packageName: string): Promise<VersionInfo | null> {
    // Try the main Docker Hub page instead of tags page
    const mainUrl = url.replace('/tags', '');
    const html = await this.fetchHtml(mainUrl);
    const $ = this.parseHtml(html);
    
    return this.fallbackVersionExtraction($, packageName);
  }

  private getTagsUrl(originalUrl: string): string {
    // Ensure we're using the tags URL
    if (originalUrl.includes('hub.docker.com')) {
      if (originalUrl.includes('/tags')) {
        return originalUrl;
      }
      return originalUrl.endsWith('/') ? 
        `${originalUrl}tags` : 
        `${originalUrl}/tags`;
    }
    return originalUrl;
  }

  private extractDockerVersion($: any, url: string, packageName: string): VersionInfo | null {
    // Enhanced selectors for Docker Hub
    const tagSelectors = [
      '[data-testid*="tag"]',
      '[class*="tag"]',
      'tr[data-testid]',
      '.MuiTableRow-root',
      '.tag-list-item',
      '.tag-item',
      'tbody tr',
      'table tr',
    ];
    
    let tagElements: any[] = [];
    
    for (const selector of tagSelectors) {
      tagElements = $(selector).toArray();
      if (tagElements.length > 0) break;
    }
    
    if (tagElements.length === 0) {
      return this.fallbackVersionExtraction($, packageName);
    }

    const versions: Array<{version: string, date?: string, isStable: boolean}> = [];

    for (const element of tagElements) {
      const elementText = $(element).text();
      const version = this.extractVersionFromDockerTag(elementText, packageName);
      
      if (version) {
        const dateText = $(element).find('[class*="date"], [class*="time"], time').text();
        const releaseDate = this.extractDateFromText(dateText);
        const isStable = this.isStableVersion(version);
        
        versions.push({
          version,
          date: releaseDate || undefined,
          isStable
        });
      }
    }

    if (versions.length === 0) {
      return this.fallbackVersionExtraction($, packageName);
    }

    // Enhanced sorting: prefer stable versions, then by version
    const sortedVersions = versions.sort((a, b) => {
      if (a.isStable !== b.isStable) {
        return a.isStable ? 1 : -1;
      }
      return this.compareVersions(a.version, b.version);
    });

    const latest = sortedVersions[sortedVersions.length - 1];
    
    return {
      version: latest.version,
      releaseDate: latest.date,
      downloadUrl: `docker pull ${packageName}:${latest.version}`,
    };
  }

  private extractVersionFromDockerTag(tagText: string, packageName: string): string | null {
    const cleanText = tagText.replace(/\s+/g, ' ').trim();
    
    // Skip common non-version tags
    const skipTags = ['latest', 'edge', 'devel', 'beta', 'alpha', 'rc', 'snapshot', 'nightly', 'master', 'main'];
    const lowerText = cleanText.toLowerCase();
    
    if (skipTags.some(skip => lowerText.includes(skip))) {
      return null;
    }

    // Enhanced package-specific version extraction
    switch (packageName.toLowerCase()) {
      case 'alpine':
        return this.extractAlpineVersion(cleanText);
      case 'fedora':
        return this.extractFedoraVersion(cleanText);
      case 'ubuntu':
        return this.extractUbuntuVersion(cleanText);
      case 'debian':
        return this.extractDebianVersion(cleanText);
      case 'elixir':
        return this.extractElixirVersion(cleanText);
      case 'swift':
        return this.extractSwiftVersion(cleanText);
      default:
        return this.extractVersionFromText(cleanText);
    }
  }

  private extractAlpineVersion(text: string): string | null {
    const patterns = [
      /^(\d+\.\d+(?:\.\d+)?)$/,                    // "3.22", "3.22.0"
      /alpine[:\s-]*(\d+\.\d+(?:\.\d+)?)/i,       // "alpine 3.22"
      /(\d+\.\d+\.\d+)/,                          // "3.22.0"
      /(\d+\.\d+)/,                               // "3.22"
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const version = match[1];
        // Validate Alpine version range - Alpine versions are typically 3.x
        const versionParts = version.split('.').map(Number);
        if (versionParts[0] === 3 && versionParts[1] >= 0 && versionParts[1] <= 50) {
          return version;
        }
      }
    }
    return null;
  }

  private extractFedoraVersion(text: string): string | null {
    // Skip rawhide and other testing/development branches
    const lowerText = text.toLowerCase();
    if (lowerText.includes('rawhide') || lowerText.includes('branched') || 
        lowerText.includes('devel') || lowerText.includes('test')) {
      return null;
    }

    const patterns = [
      /^(\d{2,3})$/,                               // "39", "40", "42", "44"
      /fedora[:\s-]*(\d{2,3})/i,                  // "fedora 42"
      /^f(\d{2,3})$/i,                            // "f42"
      /(\d{2,3})/,                                // Any 2-3 digit number
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const version = match[1];
        // Validate Fedora version range (allowing reasonable future stable releases)
        const versionNum = parseInt(version);
        if (versionNum >= 30 && versionNum <= 50) {
          return version;
        }
      }
    }
    return null;
  }

  private extractUbuntuVersion(text: string): string | null {
    const patterns = [
      /(\d{2}\.\d{2})/,                           // "22.04", "24.04", "25.10"
      /ubuntu[:\s-]*(\d{2}\.\d{2})/i,            // "ubuntu 25.10"
      /(jammy|focal|bionic|xenial|trusty|noble|oracular)/i, // Codenames
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const version = match[1];
        // Map codenames to versions
        const codenameMap: {[key: string]: string} = {
          'oracular': '24.10',
          'noble': '24.04',
          'jammy': '22.04',
          'focal': '20.04',
          'bionic': '18.04',
          'xenial': '16.04',
          'trusty': '14.04',
        };
        
        return codenameMap[version.toLowerCase()] || version;
      }
    }
    return null;
  }

  private extractDebianVersion(text: string): string | null {
    const patterns = [
      /^(\d{1,2}(?:\.\d{1,2})?)$/,               // Exact match: "12", "12.11"
      /^debian[:\s-]*(\d{1,2}(?:\.\d{1,2})?)$/i, // "debian 12.11"
      /^(bookworm|bullseye|buster|stretch|jessie)$/i, // Exact codename match
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const version = match[1];
        // Map codenames to versions
        const codenameMap: {[key: string]: string} = {
          'bookworm': '12',
          'bullseye': '11',
          'buster': '10',
          'stretch': '9',
          'jessie': '8',
        };
        
        return codenameMap[version.toLowerCase()] || version;
      }
    }
    return null;
  }

  private extractElixirVersion(text: string): string | null {
    const patterns = [
      /^(\d+\.\d+\.\d+)$/,                        // Pure semantic version "1.18.4"
      /^(\d+\.\d+\.\d+)-(?:otp|erlang)/i,        // "1.18.4-otp-26" -> extract "1.18.4"
      /elixir[:\s-]*(\d+\.\d+\.\d+)/i,           // "elixir 1.18.4"
      /^(\d+\.\d+)$/,                             // "1.18"
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const version = match[1];
        // Only return if it's a clean semantic version (no suffixes like -alpine, -slim, etc.)
        if (/^\d+\.\d+(?:\.\d+)?$/.test(version)) {
          return version;
        }
      }
    }
    return null;
  }

  private extractSwiftVersion(text: string): string | null {
    const patterns = [
      /(\d+\.\d+(?:\.\d+)?)/,                     // "6.1.2", "6.1"
      /swift[:\s-]*(\d+\.\d+(?:\.\d+)?)/i,       // "swift 6.1.2"
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  private isValidVersionTag(tagName: string, packageName: string): boolean {
    if (!tagName) return false;
    
    const skipTags = ['latest', 'edge', 'devel', 'beta', 'alpha', 'rc', 'snapshot', 'nightly', 'master', 'main', 'rawhide', 'branched'];
    const lowerTag = tagName.toLowerCase();
    
    if (skipTags.some(skip => lowerTag.includes(skip))) {
      return false;
    }

    // Skip Fedora rawhide (testing/development branch)
    if (packageName.toLowerCase() === 'fedora' && lowerTag.includes('rawhide')) {
      return false;
    }

    // Skip build variants and platform-specific tags, but be more selective
    const buildVariants = ['alpine', 'slim', 'otp', 'erlang', 'windowsservercore', 'nanoserver'];
    
    // Only skip build variants for packages that commonly have them (like Elixir, Node, etc.)
    const packagesWithVariants = ['elixir', 'node', 'python', 'ruby'];
    if (packagesWithVariants.includes(packageName.toLowerCase())) {
      if (buildVariants.some(variant => lowerTag.includes(variant))) {
        return false;
      }
    }

    // Package-specific validation with stricter criteria
    const extractedVersion = this.extractVersionFromDockerTag(tagName, packageName);
    if (!extractedVersion) return false;

    // Ensure it's a valid version format based on package conventions
    // Different packages have different version schemes
    let versionPattern: RegExp;
    
    switch (packageName.toLowerCase()) {
      case 'fedora':
        // Fedora uses release numbers: "42", "44" (stable releases, excluding rawhide/devel)
        versionPattern = /^\d{2}$/;
        break;
      case 'debian':
        // Debian uses major.minor: "12.11", "12", "11.11"
        versionPattern = /^\d{1,2}(?:\.\d{1,2})?$/;
        break;
      case 'ubuntu':
        // Ubuntu uses YY.MM format: "25.10", "24.04"
        versionPattern = /^\d{2}\.\d{2}$/;
        break;
      case 'alpine':
        // Alpine uses semantic-like but starts with 3: "3.22.0", "3.22"
        versionPattern = /^3\.\d+(?:\.\d+)?$/;
        break;
      case 'swift':
      case 'elixir':
        // These use semantic versioning: "1.18.4", "6.1.2"
        versionPattern = /^\d+\.\d+(?:\.\d+)?$/;
        break;
      default:
        // Default to flexible semantic versioning
        versionPattern = /^\d+(?:\.\d+)*$/;
    }
    
    if (!versionPattern.test(extractedVersion)) {
      return false;
    }

    // Additional validation for Alpine to ensure we get proper version numbers
    if (packageName.toLowerCase() === 'alpine') {
      // Alpine versions should be in format x.y or x.y.z where x is typically 3
      const versionPattern = /^3\.\d+(\.\d+)?$/;
      return versionPattern.test(extractedVersion);
    }

    return true;
  }

  private isStableVersion(version: string): boolean {
    const unstableKeywords = ['beta', 'alpha', 'rc', 'dev', 'test', 'snapshot', 'nightly', 'pre'];
    const lowerVersion = version.toLowerCase();
    return !unstableKeywords.some(keyword => lowerVersion.includes(keyword));
  }

  private fallbackVersionExtraction($: any, packageName: string): VersionInfo | null {
    const pageText = $('body').text();
    const versions = this.extractVersionsFromText(pageText, packageName);
    
    if (versions.length > 0) {
      const sortedVersions = this.sortVersions(versions);
      const latestVersion = sortedVersions[sortedVersions.length - 1];
      
      return {
        version: latestVersion,
        downloadUrl: `docker pull ${packageName}:${latestVersion}`,
      };
    }
    
    return null;
  }

  private extractVersionsFromText(text: string, packageName: string): string[] {
    const versionPattern = /\b(\d+\.\d+(?:\.\d+)?)\b/g;
    const matches = text.match(versionPattern) || [];
    
    const validVersions: string[] = [];
    
    for (const match of matches) {
      if (this.extractVersionFromDockerTag(match, packageName)) {
        validVersions.push(match);
      }
    }
    
    return [...new Set(validVersions)]; // Remove duplicates
  }

  private sortVersions(versions: string[]): string[] {
    return versions.sort((a, b) => this.compareVersions(a, b));
  }

  private async tryCrossSourceValidation(packageName: string, foundVersion: string | null): Promise<VersionInfo | null> {
    // If we found a version, try to validate it against alternative sources
    if (!foundVersion) return null;
    
    const alternativeSources = this.getAlternativeSources(packageName);
    
    for (const altSource of alternativeSources) {
      try {
        const altVersion = await this.fetchAlternativeVersion(altSource, packageName);
        if (altVersion && this.compareVersions(altVersion, foundVersion) > 0) {
          // Alternative source has a newer version, use it
          return {
            version: altVersion,
            downloadUrl: `docker pull ${packageName}:${altVersion}`,
            note: `Cross-validated from ${altSource.name}`,
          };
        }
      } catch {
        // Continue if alternative source fails
        continue;
      }
    }
    
    return null;
  }

  private getAlternativeSources(_packageName: string): Array<{name: string, url: string}> {
    const sources: Array<{name: string, url: string}> = [];
    
    switch (_packageName.toLowerCase()) {
      case 'alpine':
        sources.push({ name: 'Alpine Linux', url: 'https://alpinelinux.org/releases/' });
        break;
      case 'debian':
        sources.push({ name: 'Debian Releases', url: 'https://www.debian.org/releases/' });
        break;
      case 'ubuntu':
        sources.push({ name: 'Ubuntu Releases', url: 'https://releases.ubuntu.com/' });
        break;
      case 'fedora':
        sources.push({ name: 'Fedora Releases', url: 'https://fedoraproject.org/wiki/Releases' });
        break;
    }
    
    return sources;
  }

  private async fetchAlternativeVersion(source: {name: string, url: string}, _packageName: string): Promise<string | null> {
    try {
      const html = await this.fetchHtml(source.url);
      const $ = this.parseHtml(html);
      const pageText = $('body').text();
      
      return this.extractVersionFromDockerTag(pageText, _packageName);
    } catch {
      return null;
    }
  }

  /**
   * Filter Fedora versions to exclude development/rawhide releases
   * This uses contextual analysis to determine which versions are stable
   */
  private filterFedoraStableVersions(tags: any[], hasRawhideIndicators: boolean = false): any[] {
    // Look for patterns that suggest development vs stable releases
    const allVersions = tags.map(tag => parseInt(tag.extractedVersion)).filter(v => !isNaN(v)).sort((a, b) => a - b);
    
    if (allVersions.length === 0) {
      return tags;
    }

    const maxVersion = Math.max(...allVersions);
    const minVersion = Math.min(...allVersions);
    
    // If we detect explicit rawhide indicators, be more conservative
    if (hasRawhideIndicators) {
      // Filter out the highest version if it might be development
      // This handles the case where version 43 exists alongside rawhide tags
      return tags.filter(tag => {
        const version = parseInt(tag.extractedVersion);
        // If the highest version appears isolated or there are development tags, exclude it
        if (version === maxVersion && maxVersion > minVersion + 1) {
          return false;
        }
        return true;
      });
    }

    // If no explicit rawhide tags, allow all versions (future stable releases)
    // This handles the case where version 44 is a legitimate new stable release
    return tags;
  }

}
