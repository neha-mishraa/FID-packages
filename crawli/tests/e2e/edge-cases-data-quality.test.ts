import { DockerHubScraper } from '../../src/scrapers/DockerHubScraper';
import { OpkgScraper } from '../../src/scrapers/OpkgScraper';
import { HashiCorpScraper } from '../../src/scrapers/HashiCorpScraper';
import { GenericScraper } from '../../src/scrapers/GenericScraper';
import { PackageType } from '../../src/types';
import nock from 'nock';

describe('E2E: Edge Cases and Data Quality', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Malformed Data Handling', () => {
    test('should handle malformed JSON from Docker Hub API', async () => {
      nock('https://hub.docker.com')
        .get('/v2/repositories/library/alpine/tags/')
        .query(true)
        .reply(200, '{"invalid": "json"'); // Malformed JSON

      // Should fall back to other approaches
      nock('https://hub.docker.com')
        .get('/_/alpine/tags')
        .reply(200, `
          <html>
            <body>
              <table>
                <tr><td>3.22.0</td></tr>
                <tr><td>3.21.0</td></tr>
              </table>
            </body>
          </html>
        `);

      const scraper = new DockerHubScraper();
      const result = await scraper.scrapeVersion({
        name: 'alpine',
        url: 'https://hub.docker.com/_/alpine/tags',
        type: PackageType.DOCKER_HUB
      });

      expect(result.latestVersion?.version).toBe('3.22.0');
      expect(result.error).toBeUndefined();
    });

    test('should handle HTML with no version information', async () => {
      nock('https://hub.docker.com')
        .get('/v2/repositories/library/alpine/tags/')
        .query(true)
        .times(3)
        .reply(404, 'Not Found');

      nock('https://hub.docker.com')
        .get('/_/alpine/tags')
        .reply(200, '<html><body><p>No versions found</p></body></html>');

      nock('https://hub.docker.com')
        .get('/_/alpine')
        .reply(200, '<html><body><p>Package information</p></body></html>');

      const scraper = new DockerHubScraper();
      const result = await scraper.scrapeVersion({
        name: 'alpine',
        url: 'https://hub.docker.com/_/alpine/tags',
        type: PackageType.DOCKER_HUB
      });

      expect(result.latestVersion).toBeUndefined();
      expect(result.error).toBe('No version information found');
    });
  });

  describe('Extreme Version Scenarios', () => {
    test('should handle versions with unusual formats', async () => {
      const mockVersions = [
        { name: '3.22.0-r0', last_updated: '2025-05-30T12:00:00Z' },
        { name: '3.22.0-20250530', last_updated: '2025-05-30T12:00:00Z' },
        { name: '3.22.0-git-abc123', last_updated: '2025-05-30T12:00:00Z' },
        { name: '3.23.0', last_updated: '2025-07-05T12:00:00Z' }, // Clean version
      ];

      nock('https://hub.docker.com')
        .get('/v2/repositories/library/alpine/tags/')
        .query({ page_size: 1000 })
        .reply(200, { results: mockVersions });

      const scraper = new DockerHubScraper();
      const result = await scraper.scrapeVersion({
        name: 'alpine',
        url: 'https://hub.docker.com/_/alpine/tags',
        type: PackageType.DOCKER_HUB
      });

      // Should pick the clean version, not the ones with suffixes
      expect(result.latestVersion?.version).toBe('3.23.0');
    });

    test('should handle pre-release versions correctly', async () => {
      const mockVersions = [
        { name: '1.19.0-beta.1', last_updated: '2025-07-05T12:00:00Z' },
        { name: '1.19.0-rc.1', last_updated: '2025-07-04T12:00:00Z' },
        { name: '1.18.4', last_updated: '2025-07-02T12:00:00Z' }, // Stable
        { name: '1.19.0-alpha.3', last_updated: '2025-06-30T12:00:00Z' },
      ];

      nock('https://hub.docker.com')
        .get('/v2/repositories/library/elixir/tags/')
        .query({ page_size: 1000 })
        .reply(200, { results: mockVersions });

      const scraper = new DockerHubScraper();
      const result = await scraper.scrapeVersion({
        name: 'elixir',
        url: 'https://hub.docker.com/_/elixir/tags',
        type: PackageType.DOCKER_HUB
      });

      // Should prefer stable version over pre-releases
      expect(result.latestVersion?.version).toBe('1.18.4');
      expect(result.latestVersion?.version).not.toContain('beta');
      expect(result.latestVersion?.version).not.toContain('rc');
      expect(result.latestVersion?.version).not.toContain('alpha');
    });

    test('should handle date-based version tags correctly', async () => {
      const mockVersions = [
        { name: '20250705', last_updated: '2025-07-05T12:00:00Z' }, // Date tag
        { name: '2025-07-05', last_updated: '2025-07-05T12:00:00Z' }, // Date tag
        { name: '12.11', last_updated: '2025-07-01T12:00:00Z' }, // Real version
        { name: '2025w27', last_updated: '2025-07-03T12:00:00Z' }, // Week tag
      ];

      nock('https://hub.docker.com')
        .get('/v2/repositories/library/debian/tags/')
        .query({ page_size: 1000 })
        .reply(200, { results: mockVersions });

      const scraper = new DockerHubScraper();
      const result = await scraper.scrapeVersion({
        name: 'debian',
        url: 'https://hub.docker.com/_/debian',
        type: PackageType.DOCKER_HUB
      });

      // Should ignore date-like tags and pick real version
      expect(result.latestVersion?.version).toBe('12.11');
      expect(result.latestVersion?.version).not.toBe('20250705');
      expect(result.latestVersion?.version).not.toBe('2025-07-05');
    });
  });

  describe('Network and Performance Edge Cases', () => {
    test('should handle very slow API responses', async () => {
      nock('https://hub.docker.com')
        .get('/v2/repositories/library/alpine/tags/')
        .query({ page_size: 1000 })
        .delay(8000) // 8 second delay
        .reply(200, {
          results: [
            { name: '3.22.0', last_updated: '2025-05-30T12:00:00Z' }
          ]
        });

      const scraper = new DockerHubScraper();
      
      const startTime = Date.now();
      const result = await scraper.scrapeVersion({
        name: 'alpine',
        url: 'https://hub.docker.com/_/alpine/tags',
        type: PackageType.DOCKER_HUB
      });
      const endTime = Date.now();

      // Should timeout and fall back to other approaches
      expect(endTime - startTime).toBeLessThan(12000); // Should not wait forever
      
      if (result.latestVersion) {
        expect(result.latestVersion.version).toBe('3.22.0');
      } else {
        // Timeout is acceptable in this scenario
        expect(result.error).toBeTruthy();
      }
    }, 15000);

    test('should handle response with thousands of tags efficiently', async () => {
      // Generate 2000 tags
      const hugeMockResponse = {
        results: Array.from({ length: 2000 }, (_, i) => ({
          name: i < 10 ? `3.${i}.0` : `build-${i}`,
          last_updated: `2025-07-0${(i % 5) + 1}T12:00:00Z`
        }))
      };

      // Add the actual latest version
      hugeMockResponse.results.push({
        name: '3.25.0',
        last_updated: '2025-07-05T12:00:00Z'
      });

      nock('https://hub.docker.com')
        .get('/v2/repositories/library/alpine/tags/')
        .query({ page_size: 1000 })
        .reply(200, hugeMockResponse);

      const scraper = new DockerHubScraper();
      
      const startTime = Date.now();
      const result = await scraper.scrapeVersion({
        name: 'alpine',
        url: 'https://hub.docker.com/_/alpine/tags',
        type: PackageType.DOCKER_HUB
      });
      const endTime = Date.now();

      expect(result.latestVersion?.version).toBe('3.25.0');
      expect(endTime - startTime).toBeLessThan(5000); // Should be efficient
    });
  });

  describe('Cross-Package Type Validation', () => {
    test('should handle OPKG with unusual directory structures', async () => {
      const mockHtml = `
        <html>
          <body>
            <a href="v0.6.0/">v0.6.0/</a>
            <a href="documentation/">documentation/</a>
            <a href="old-versions/">old-versions/</a>
            <a href="0.7.0/">0.7.0/</a>
            <a href="experimental/">experimental/</a>
          </body>
        </html>
      `;

      nock('https://downloads.yoctoproject.org')
        .get('/releases/opkg/')
        .reply(200, mockHtml);

      const scraper = new OpkgScraper();
      const result = await scraper.scrapeVersion({
        name: 'opkg',
        url: 'https://downloads.yoctoproject.org/releases/opkg/',
        type: PackageType.OPKG
      });

      expect(result.latestVersion?.version).toBe('0.7.0');
    });

    test('should handle HashiCorp with mixed version formats', async () => {
      const mockHtml = `
        <html>
          <body>
            <ul>
              <li><a href="/vagrant/2.4.6/">vagrant_2.4.6</a></li>
              <li><a href="/vagrant/2.4.7/">vagrant_2.4.7</a></li>
              <li><a href="/vagrant/2.5.0-beta1/">vagrant_2.5.0-beta1</a></li>
              <li><a href="/vagrant/nightly/">vagrant_nightly</a></li>
            </ul>
          </body>
        </html>
      `;

      nock('https://releases.hashicorp.com')
        .get('/vagrant/')
        .reply(200, mockHtml);

      const scraper = new HashiCorpScraper();
      const result = await scraper.scrapeVersion({
        name: 'vagrant',
        url: 'https://releases.hashicorp.com/vagrant/',
        type: PackageType.HASHICORP
      });

      // Should find the latest stable release (dynamically determined)
      expect(result.latestVersion?.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(result.latestVersion?.version).not.toContain('beta');
    });

    test('should handle GitHub releases with draft and pre-release tags', async () => {
      const mockHtml = `
        <html>
          <body>
            <div>
              <a href="/CocoaPods/CocoaPods/releases/tag/1.16.2">1.16.2</a>
              <span>Latest</span>
            </div>
            <div>
              <a href="/CocoaPods/CocoaPods/releases/tag/1.17.0-beta.1">1.17.0-beta.1</a>
              <span>Pre-release</span>
            </div>
            <div>
              <a href="/CocoaPods/CocoaPods/releases/tag/1.16.1">1.16.1</a>
            </div>
          </body>
        </html>
      `;

      nock('https://github.com')
        .get('/CocoaPods/CocoaPods/releases')
        .reply(200, mockHtml);

      const scraper = new GenericScraper();
      const result = await scraper.scrapeVersion({
        name: 'cocoapods',
        url: 'https://github.com/CocoaPods/CocoaPods/releases',
        type: PackageType.GITHUB_RELEASES
      });

      // Should get the latest stable release
      expect(result.latestVersion?.version).toBe('1.16.2');
    });
  });

  describe('Data Consistency Validation', () => {
    test('should maintain consistency across multiple runs', async () => {
      const mockResponse = {
        results: [
          { name: '3.22.0', last_updated: '2025-05-30T12:00:00Z' },
          { name: '3.21.0', last_updated: '2025-04-15T12:00:00Z' }
        ]
      };

      nock('https://hub.docker.com')
        .get('/v2/repositories/library/alpine/tags/')
        .query({ page_size: 1000 })
        .times(3)
        .reply(200, mockResponse);

      const scraper = new DockerHubScraper();
      const packageMapping = {
        name: 'alpine',
        url: 'https://hub.docker.com/_/alpine/tags',
        type: PackageType.DOCKER_HUB
      };

      const results = await Promise.all([
        scraper.scrapeVersion(packageMapping),
        scraper.scrapeVersion(packageMapping),
        scraper.scrapeVersion(packageMapping)
      ]);

      // All results should be identical
      const versions = results.map(r => r.latestVersion?.version);
      expect(new Set(versions).size).toBe(1); // All the same
      expect(versions[0]).toBe('3.22.0');
    });

    test('should handle version comparison edge cases', async () => {
      const mockVersions = [
        { name: '10.0.0', last_updated: '2025-01-01T12:00:00Z' },
        { name: '9.9.9', last_updated: '2025-01-02T12:00:00Z' },
        { name: '2.0.0', last_updated: '2025-01-03T12:00:00Z' },
        { name: '1.99.99', last_updated: '2025-01-04T12:00:00Z' }
      ];

      nock('https://hub.docker.com')
        .get('/v2/repositories/library/elixir/tags/')
        .query({ page_size: 1000 })
        .reply(200, { results: mockVersions });

      const scraper = new DockerHubScraper();
      const result = await scraper.scrapeVersion({
        name: 'elixir',
        url: 'https://hub.docker.com/_/elixir/tags',
        type: PackageType.DOCKER_HUB
      });

      // Should correctly identify 10.0.0 as highest
      expect(result.latestVersion?.version).toBe('10.0.0');
    });
  });
});
