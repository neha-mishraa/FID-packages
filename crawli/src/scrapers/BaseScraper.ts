import axios from 'axios';
import { load } from 'cheerio';
import { ScraperConfig, ScrapingResult, PackageMapping } from '../types';

export abstract class BaseScraper {
  protected config: ScraperConfig;

  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      timeout: 10000,
      retries: 3,
      delay: 1000,
      useHeadless: true,
      ...config
    };
  }

  abstract scrapeVersion(packageMapping: PackageMapping): Promise<ScrapingResult>;

  protected async fetchHtml(url: string): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': this.config.userAgent,
          },
          timeout: this.config.timeout,
          // Handle SSL issues for some repositories
          httpsAgent: new (require('https')).Agent({
            rejectUnauthorized: false
          })
        });
        return response.data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.config.retries) {
          // Exponential backoff for network requests
          await this.delay(this.config.delay * attempt);
          continue;
        }
      }
    }
    
    throw new Error(`Failed to fetch ${url} after ${this.config.retries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  protected parseHtml(html: string) {
    return load(html);
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected extractVersionFromText(text: string): string | null {
    // Common version patterns
    const patterns = [
      /v?(\d+\.\d+\.\d+(?:\.\d+)?(?:-[\w\.-]+)?)/i, // Standard semver
      /(\d+\.\d+(?:\.\d+)?(?:-[\w\.-]+)?)/i,        // Simpler version
      /version[:\s]+(\d+\.\d+\.\d+)/i,              // "Version: x.y.z"
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  protected extractDateFromText(text: string): string | null {
    // Common date patterns
    const patterns = [
      /(\d{4}-\d{2}-\d{2})/,                        // YYYY-MM-DD
      /(\d{2}\/\d{2}\/\d{4})/,                      // MM/DD/YYYY
      /(\d{1,2}\s+\w+\s+\d{4})/,                    // D Month YYYY
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }
  
  protected getThreeMonthsAgo(): Date {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return threeMonthsAgo;
  }
  
  protected isRecentRelease(dateString: string | null, thresholdDate: Date = this.getThreeMonthsAgo()): boolean {
    if (!dateString) return true; // Include if no date info available
    
    const releaseDate = this.extractDateFromText(dateString);
    if (!releaseDate) return true; // Include if date parsing fails
    
    const parsedDate = new Date(releaseDate);
    return parsedDate >= thresholdDate;
  }
  
  protected filterRecentVersions<T extends {version: string, date?: string}>(versions: T[], minCount: number = 5): T[] {
    // Only apply recent filtering if we have many versions to begin with
    if (versions.length < 20) {
      return versions; // Don't filter if dataset is small
    }
    
    const thresholdDate = this.getThreeMonthsAgo();
    const recentVersions = versions.filter(v => this.isRecentRelease(v.date || null, thresholdDate));
    
    // If we don't have enough recent versions, fall back to all versions
    return recentVersions.length >= minCount ? recentVersions : versions;
  }
  
  protected compareVersions(a: string, b: string): number {
    // Handle empty or null versions
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;

    // Split versions and convert to numbers, handling non-numeric parts
    const aParts = a.split('.').map(part => {
      const num = parseInt(part.replace(/[^\d]/g, ''));
      return isNaN(num) ? 0 : num;
    });
    const bParts = b.split('.').map(part => {
      const num = parseInt(part.replace(/[^\d]/g, ''));
      return isNaN(num) ? 0 : num;
    });
    
    // Compare each part numerically
    const maxLength = Math.max(aParts.length, bParts.length);
    for (let i = 0; i < maxLength; i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart !== bPart) {
        return aPart - bPart;
      }
    }
    
    // If versions are numerically equal, prefer the more specific one (e.g., 3.22.0 over 3.22)
    // But only if the main version numbers are actually the same
    if (aParts.slice(0, 2).join('.') === bParts.slice(0, 2).join('.')) {
      return a.length - b.length; // Longer version strings (more specific) come later
    }
    
    return 0;
  }
}
