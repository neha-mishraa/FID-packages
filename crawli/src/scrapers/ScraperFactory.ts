import { PackageType, PackageMapping, ScrapingStrategy } from '../types';
import { BaseScraper } from './BaseScraper';
import { OpkgScraper } from './OpkgScraper';
import { DockerHubScraper } from './DockerHubScraper';
import { HashiCorpScraper } from './HashiCorpScraper';
import { GenericScraper } from './GenericScraper';

export class ScraperFactory {
  private static strategies: Map<PackageType, ScrapingStrategy> = new Map([
    [PackageType.GITHUB_RELEASES, {
      versionSelector: '.release-header .f1 a, .Box-row .f4 a, [data-testid="release-name"] a, .release-entry .release-header a',
      dateSelector: '.release-header relative-time, .Box-row relative-time, [data-testid="release-date"] relative-time',
      linkSelector: '.release-header .f1 a, .Box-row .f4 a, [data-testid="release-name"] a',
      customExtractor: (html: string, url: string) => {
        const cheerio = require('cheerio');
        const $ = cheerio.load(html);
        
        // Try multiple GitHub release page selectors
        const selectors = [
          '.release-entry .release-header a',
          '[data-testid="release-name"] a',
          '.Box-row .f4 a',
          '.release-header .f1 a',
          'h1 a[href*="/releases/tag/"]',
          'a[href*="/releases/tag/"]'
        ];
        
        for (const selector of selectors) {
          const element = $(selector).first();
          if (element.length) {
            const text = element.text().trim();
            const versionMatch = text.match(/v?(\d+\.\d+\.\d+(?:\.\d+)?(?:-[\w\.-]+)?)/);
            if (versionMatch) {
              const dateElement = element.closest('.release-entry, .Box-row').find('relative-time, [datetime]');
              const dateTime = dateElement.attr('datetime');
              return {
                version: versionMatch[1],
                releaseDate: dateTime ? new Date(dateTime).toISOString().split('T')[0] : undefined,
                downloadUrl: new URL(element.attr('href') || '', url).href
              };
            }
          }
        }
        
        return null;
      }
    }],
    [PackageType.NPM, {
      customExtractor: (html: string, _url: string) => {
        const versionMatch = html.match(/"version"\s*:\s*"([^"]+)"/);
        return versionMatch ? { version: versionMatch[1] } : null;
      }
    }],
    [PackageType.PYPI, {
      versionSelector: '.package-header h1, .package-description h1',
      customExtractor: (html: string, _url: string) => {
        const versionMatch = html.match(/class="package-header__name">([^<]+)<\/span>\s*([^<]+)/);
        return versionMatch ? { version: versionMatch[2].trim() } : null;
      }
    }],
  ]);

  static createScraper(packageMapping: PackageMapping): BaseScraper {
    switch (packageMapping.type) {
      case PackageType.OPKG:
        return new OpkgScraper();
      
      case PackageType.ALPINE:
      case PackageType.DOCKER_HUB:
        return new DockerHubScraper();
      
      case PackageType.HASHICORP:
        return new HashiCorpScraper();
      
      case PackageType.GITHUB_RELEASES:
      case PackageType.NPM:
      case PackageType.PYPI:
      case PackageType.GENERIC:
      default:
        const strategy = this.strategies.get(packageMapping.type) || {};
        return new GenericScraper(strategy);
    }
  }

  static registerStrategy(packageType: PackageType, strategy: ScrapingStrategy): void {
    this.strategies.set(packageType, strategy);
  }

  static getStrategy(packageType: PackageType): ScrapingStrategy | undefined {
    return this.strategies.get(packageType);
  }
}
