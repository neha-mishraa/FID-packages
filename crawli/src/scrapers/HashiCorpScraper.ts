import { BaseScraper } from './BaseScraper';
import { PackageMapping, ScrapingResult, VersionInfo } from '../types';

export class HashiCorpScraper extends BaseScraper {
  async scrapeVersion(packageMapping: PackageMapping): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      packageName: packageMapping.name,
      url: packageMapping.url,
      scrapedAt: new Date(),
    };

    try {
      const html = await this.fetchHtml(packageMapping.url);
      const $ = this.parseHtml(html);
      
      const versionInfo = this.extractHashiCorpVersion($, packageMapping.url, packageMapping.name);
      
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

  private extractHashiCorpVersion($: any, url: string, packageName: string): VersionInfo | null {
    // HashiCorp releases page structure
    const versions: Array<{version: string, date?: string}> = [];

    // Look for version links in HashiCorp releases format
    const versionSelectors = [
      'a[href*="/' + packageName + '/"]',  // Links containing package name
      '.version a',                        // Version links
      'h3 a',                             // Header links
      '.release-item a',                  // Release item links
      'li a',                             // List item links
    ];

    for (const selector of versionSelectors) {
      const elements = $(selector);
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements.eq(i);
        const href = element.attr('href') || '';
        const text = element.text().trim();
        
        // Extract version from href or text
        const version = this.extractVersionFromHashiCorpLink(href, text, packageName);
        
        if (version && !versions.some(v => v.version === version)) {
          versions.push({ version });
        }
      }
    }

    // Fallback: look for version patterns in the page text
    if (versions.length === 0) {
      const pageText = $('body').text();
      const foundVersions = this.extractVersionsFromText(pageText);
      
      for (const version of foundVersions) {
        if (!versions.some(v => v.version === version)) {
          versions.push({ version });
        }
      }
    }

    if (versions.length === 0) {
      return null;
    }

    // Sort versions and get the latest
    const sortedVersions = versions.sort((a, b) => this.compareVersions(a.version, b.version));
    const latest = sortedVersions[sortedVersions.length - 1];

    return {
      version: latest.version,
      releaseDate: latest.date,
      downloadUrl: this.constructDownloadUrl(url, latest.version, packageName),
    };
  }

  private extractVersionFromHashiCorpLink(href: string, text: string, packageName: string): string | null {
    // Try to extract from href first
    const hrefPattern = new RegExp(`${packageName}/(\\d+\\.\\d+\\.\\d+(?:\\.\\d+)?)`, 'i');
    const hrefMatch = href.match(hrefPattern);
    
    if (hrefMatch) {
      return hrefMatch[1];
    }

    // Try to extract from text
    return this.extractVersionFromText(text);
  }

  private extractVersionsFromText(text: string): string[] {
    // Common version patterns for HashiCorp products
    const patterns = [
      /(\d+\.\d+\.\d+(?:\.\d+)?)/g,  // Standard version format
      /v(\d+\.\d+\.\d+(?:\.\d+)?)/g, // With 'v' prefix
    ];

    const versions: string[] = [];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const version = match.replace(/^v/, ''); // Remove 'v' prefix
          if (!versions.includes(version) && this.isValidVersion(version)) {
            versions.push(version);
          }
        }
      }
    }

    return versions;
  }

  private isValidVersion(version: string): boolean {
    // Validate that it's a proper version format
    const versionPattern = /^\d+\.\d+\.\d+(?:\.\d+)?$/;
    return versionPattern.test(version);
  }

  private constructDownloadUrl(baseUrl: string, version: string, _packageName: string): string {
    return `${baseUrl}${version}/`;
  }
}
