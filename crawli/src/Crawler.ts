import { PackageMapping, ScrapingResult, ScraperConfig } from './types';
import { ScraperFactory } from './scrapers/ScraperFactory';
import { Logger } from './utils/Logger';

export class Crawler {
  private config: ScraperConfig;
  private results: ScrapingResult[] = [];

  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = {
      userAgent: 'Crawli/1.0.0 (AI Package Version Scraper)',
      timeout: 10000,
      retries: 3,
      delay: 1000,
      useHeadless: true,
      ...config,
    };
  }

  async crawlPackages(packageMappings: PackageMapping[]): Promise<ScrapingResult[]> {
    Logger.info(`Starting crawl for ${packageMappings.length} packages`);
    this.results = [];

    const promises = packageMappings.map(async (mapping, index) => {
      // Add delay between requests to be respectful
      if (index > 0) {
        await this.delay(this.config.delay);
      }
      
      return this.crawlSinglePackage(mapping);
    });

    // Process packages with some concurrency but not too much
    const concurrency = 3;
    const results: ScrapingResult[] = [];
    
    for (let i = 0; i < promises.length; i += concurrency) {
      const batch = promises.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(batch);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          this.results.push(result.value);
        } else {
          Logger.error('Failed to process package:', result.reason);
        }
      }
    }

    Logger.info(`Crawl completed. Processed ${results.length} packages`);
    return results;
  }

  async crawlSinglePackage(packageMapping: PackageMapping): Promise<ScrapingResult> {
    Logger.info(`Crawling package: ${packageMapping.name} (${packageMapping.type})`);
    
    const scraper = ScraperFactory.createScraper(packageMapping);
    let attempt = 1;
    
    while (attempt <= this.config.retries) {
      try {
        const result = await scraper.scrapeVersion(packageMapping);
        
        if (result.latestVersion) {
          Logger.info(`✓ Found version ${result.latestVersion.version} for ${packageMapping.name}`);
        } else {
          Logger.warn(`⚠ No version found for ${packageMapping.name}: ${result.error}`);
        }
        
        return result;
      } catch (error) {
        Logger.warn(`Attempt ${attempt}/${this.config.retries} failed for ${packageMapping.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        if (attempt === this.config.retries) {
          return {
            packageName: packageMapping.name,
            url: packageMapping.url,
            error: `Failed after ${this.config.retries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
            scrapedAt: new Date(),
          };
        }
        
        attempt++;
        await this.delay(this.config.delay * attempt); // Exponential backoff
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Unexpected error in crawlSinglePackage');
  }

  getResults(): ScrapingResult[] {
    return [...this.results];
  }

  getSuccessfulResults(): ScrapingResult[] {
    return this.results.filter(result => result.latestVersion && !result.error);
  }

  getFailedResults(): ScrapingResult[] {
    return this.results.filter(result => result.error);
  }

  generateReport(): string {
    const total = this.results.length;
    const successful = this.getSuccessfulResults().length;
    const failed = this.getFailedResults().length;

    let report = `\n=== Crawl Report ===\n`;
    report += `Total packages: ${total}\n`;
    report += `Successful: ${successful}\n`;
    report += `Failed: ${failed}\n\n`;

    if (successful > 0) {
      report += `=== Successful Results ===\n`;
      for (const result of this.getSuccessfulResults()) {
        report += `${result.packageName}: ${result.latestVersion?.version}`;
        if (result.latestVersion?.releaseDate) {
          report += ` (${result.latestVersion.releaseDate})`;
        }
        report += `\n`;
      }
      report += `\n`;
    }

    if (failed > 0) {
      report += `=== Failed Results ===\n`;
      for (const result of this.getFailedResults()) {
        report += `${result.packageName}: ${result.error}\n`;
      }
    }

    return report;
  }

  exportToJson(): string {
    return JSON.stringify({
      metadata: {
        crawledAt: new Date().toISOString(),
        totalPackages: this.results.length,
        successful: this.getSuccessfulResults().length,
        failed: this.getFailedResults().length,
      },
      results: this.results,
    }, null, 2);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
