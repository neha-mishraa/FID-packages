export interface PackageMapping {
  name: string;
  url: string;
  type: PackageType;
}

export interface VersionInfo {
  version: string;
  releaseDate?: string;
  downloadUrl?: string;
  changelog?: string;
  note?: string;
}

export interface ScrapingResult {
  packageName: string;
  url: string;
  latestVersion?: VersionInfo;
  error?: string;
  scrapedAt: Date;
}

export enum PackageType {
  OPKG = 'opkg',
  ALPINE = 'alpine',
  DOCKER_HUB = 'docker-hub',
  NPM = 'npm',
  PYPI = 'pypi',
  GITHUB_RELEASES = 'github-releases',
  HASHICORP = 'hashicorp',
  GENERIC = 'generic'
}

export interface ScraperConfig {
  userAgent: string;
  timeout: number;
  retries: number;
  delay: number;
  useHeadless: boolean;
  circuitBreakerFailureThreshold?: number;
  circuitBreakerRecoveryTime?: number;
}

export interface ScrapingStrategy {
  versionSelector?: string;
  versionPattern?: RegExp;
  dateSelector?: string;
  linkSelector?: string;
  customExtractor?: (html: string, url: string) => VersionInfo | null;
}
