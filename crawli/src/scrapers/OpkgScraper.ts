import { BaseScraper } from './BaseScraper';
import { PackageMapping, ScrapingResult, VersionInfo } from '../types';

export class OpkgScraper extends BaseScraper {
  async scrapeVersion(packageMapping: PackageMapping): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      packageName: packageMapping.name,
      url: packageMapping.url,
      scrapedAt: new Date(),
    };

    try {
      const html = await this.fetchHtml(packageMapping.url);
      const $ = this.parseHtml(html);
      
      // Look for version links or directories
      const versionInfo = this.extractOpkgVersion($, packageMapping.url);
      
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

  private extractOpkgVersion($: any, baseUrl: string): VersionInfo | null {
    // Look for directory listings with version numbers
    const links = $('a').toArray();
    const versions: string[] = [];

    for (const link of links) {
      const href = $(link).attr('href');
      const text = $(link).text().trim();
      
      if (href && text) {
        const version = this.extractVersionFromText(text);
        if (version && !versions.includes(version)) {
          versions.push(version);
        }
      }
    }

    if (versions.length === 0) {
      return null;
    }

    // Sort versions and get the latest
    const sortedVersions = this.sortVersions(versions);
    const latestVersion = sortedVersions[sortedVersions.length - 1];

    return {
      version: latestVersion,
      downloadUrl: this.constructDownloadUrl(baseUrl, latestVersion),
    };
  }

  private sortVersions(versions: string[]): string[] {
    return versions.sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;
        
        if (aPart !== bPart) {
          return aPart - bPart;
        }
      }
      
      return 0;
    });
  }

  private constructDownloadUrl(baseUrl: string, version: string): string {
    return `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}${version}/`;
  }
}
