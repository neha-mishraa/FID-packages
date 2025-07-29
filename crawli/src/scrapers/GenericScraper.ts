import { BaseScraper } from './BaseScraper';
import { PackageMapping, ScrapingResult, VersionInfo, ScrapingStrategy } from '../types';

export class GenericScraper extends BaseScraper {
  private strategy: ScrapingStrategy;

  constructor(strategy: ScrapingStrategy = {}) {
    super();
    this.strategy = strategy;
  }

  async scrapeVersion(packageMapping: PackageMapping): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      packageName: packageMapping.name,
      url: packageMapping.url,
      scrapedAt: new Date(),
    };

    try {
      const html = await this.fetchHtml(packageMapping.url);
      const $ = this.parseHtml(html);
      
      let versionInfo: VersionInfo | null = null;

      // Try custom extractor first if provided
      if (this.strategy.customExtractor) {
        versionInfo = this.strategy.customExtractor(html, packageMapping.url);
      } else {
        versionInfo = this.extractGenericVersion($, packageMapping.url);
      }
      
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

  private extractGenericVersion($: any, url: string): VersionInfo | null {
    // Special handling for GitHub releases
    if (url.includes('github.com') && url.includes('/releases')) {
      return this.extractGitHubReleasesVersion($, url);
    }
    
    let version: string | null = null;
    let releaseDate: string | null = null;
    let downloadUrl: string | null = null;

    // Try strategy-specific selectors
    if (this.strategy.versionSelector) {
      const versionElement = $(this.strategy.versionSelector).first();
      if (versionElement.length) {
        version = this.extractVersionFromText(versionElement.text());
      }
    }

    if (this.strategy.dateSelector) {
      const dateElement = $(this.strategy.dateSelector).first();
      if (dateElement.length) {
        releaseDate = this.extractDateFromText(dateElement.text());
      }
    }

    if (this.strategy.linkSelector) {
      const linkElement = $(this.strategy.linkSelector).first();
      if (linkElement.length) {
        downloadUrl = linkElement.attr('href') || null;
        if (downloadUrl && !downloadUrl.startsWith('http')) {
          downloadUrl = new URL(downloadUrl, url).href;
        }
      }
    }

    // Fallback: scan the entire page for version patterns
    if (!version) {
      version = this.findVersionInPage($);
    }

    // Apply version pattern if specified
    if (version && this.strategy.versionPattern) {
      const match = version.match(this.strategy.versionPattern);
      version = match ? match[1] || match[0] : version;
    }

    if (!version) {
      return null;
    }

    return {
      version,
      releaseDate: releaseDate || undefined,
      downloadUrl: downloadUrl || undefined,
    };
  }

  private findVersionInPage($: any): string | null {
    // Common selectors where versions might be found
    const selectors = [
      'h1, h2, h3', // Headers
      '.version, .latest, .current', // Common class names
      '[class*="version"], [class*="latest"]', // Partial class matches
      'td, th', // Table cells
      'li', // List items
      'span, div', // Generic containers
    ];

    for (const selector of selectors) {
      const elements = $(selector);
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements.eq(i);
        const text = element.text().trim();
        const version = this.extractVersionFromText(text);
        
        if (version) {
          return version;
        }
      }
    }

    // Last resort: search entire page text
    const pageText = $('body').text();
    return this.extractVersionFromText(pageText);
  }

  private extractGitHubReleasesVersion($: any, url: string): VersionInfo | null {
    // GitHub releases page - look for release entries with dates
    const releases: Array<{version: string, date?: string, downloadUrl?: string}> = [];
    
    // Try different selectors for GitHub releases
    const releaseSelectors = [
      'article[data-test-selector="release-card"]',
      '.release',
      '[class*="release"]',
      'section'
    ];
    
    for (const selector of releaseSelectors) {
      const releaseElements = $(selector);
      
      if (releaseElements.length > 0) {
        releaseElements.each((_: number, element: any) => {
          const $release = $(element);
          const titleText = $release.find('h1, h2, h3, .title, [class*="title"]').first().text();
          const dateText = $release.find('time, .date, [datetime], [class*="date"]').first().text() || 
                          $release.find('time').attr('datetime');
          const linkElement = $release.find('a[href*="tag/"], a[href*="releases/tag/"]').first();
          
          const version = this.extractVersionFromText(titleText);
          if (version) {
            releases.push({
              version,
              date: dateText || undefined,
              downloadUrl: linkElement.attr('href') || undefined
            });
          }
        });
        
        if (releases.length > 0) break; // Found releases with this selector
      }
    }
    
    if (releases.length === 0) {
      // Fallback to generic extraction
      const fallbackVersion = this.findVersionInPage($);
      return fallbackVersion ? { version: fallbackVersion } : null;
    }
    
    // Filter to recent releases (last 3 months) for better accuracy
    const filteredReleases: Array<{version: string, date?: string, downloadUrl?: string}> = this.filterRecentVersions(releases);
    
    if (filteredReleases.length === 0) {
      return null;
    }
    
    // Sort by version and get the latest
    const sortedReleases = filteredReleases.sort((a, b) => this.compareVersions(a.version, b.version));
    const latest = sortedReleases[sortedReleases.length - 1];
    
    return {
      version: latest.version,
      releaseDate: latest.date,
      downloadUrl: latest.downloadUrl ? new URL(latest.downloadUrl, url).href : undefined,
    };
  }

  updateStrategy(strategy: Partial<ScrapingStrategy>): void {
    this.strategy = { ...this.strategy, ...strategy };
  }
}
