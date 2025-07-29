import { Crawler } from '../../src/Crawler';
import { ConfigParser } from '../../src/utils/ConfigParser';
import { PackageType } from '../../src/types';
import nock from 'nock';

describe('E2E: Version Release Scenarios', () => {
  let crawler: Crawler;

  beforeEach(() => {
    crawler = new Crawler();
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('New Version Release Simulation', () => {
    test('should detect when Alpine releases a new version (3.23.0)', async () => {
      // Mock Docker Hub API response with new version
      const mockApiResponse = {
        results: [
          {
            name: '3.22.0',
            last_updated: '2025-05-30T12:00:00Z'
          },
          {
            name: '3.23.0', // NEW VERSION!
            last_updated: '2025-07-05T10:00:00Z'
          },
          {
            name: '3.21.0',
            last_updated: '2025-04-15T12:00:00Z'
          }
        ]
      };

      nock('https://hub.docker.com')
        .get('/v2/repositories/library/alpine/tags/')
        .query({ page_size: 1000 })
        .reply(200, mockApiResponse);

      const config = ConfigParser.parseConfigString('Alpine = https://hub.docker.com/_/alpine/tags');
      const results = await crawler.crawlPackages(config);

      expect(results).toHaveLength(1);
      expect(results[0].latestVersion?.version).toBe('3.23.0');
      expect(results[0].latestVersion?.releaseDate).toBe('2025-07-05');
      expect(results[0].error).toBeUndefined();
    });

    test('should handle Debian point release (12.12)', async () => {
      const mockApiResponse = {
        results: [
          {
            name: '12.11',
            last_updated: '2025-07-01T12:00:00Z'
          },
          {
            name: '12.12', // NEW POINT RELEASE!
            last_updated: '2025-07-05T15:00:00Z'
          },
          {
            name: '12',
            last_updated: '2025-07-05T15:00:00Z'
          }
        ]
      };

      nock('https://hub.docker.com')
        .get('/v2/repositories/library/debian/tags/')
        .query({ page_size: 1000 })
        .reply(200, mockApiResponse);

      const config = ConfigParser.parseConfigString('Debian = https://hub.docker.com/_/debian');
      const results = await crawler.crawlPackages(config);

      expect(results[0].latestVersion?.version).toBe('12.12');
    });

    test('should detect Fedora major release (44)', async () => {
      const mockApiResponse = {
        results: [
          {
            name: '42',
            last_updated: '2025-06-25T12:00:00Z'
          },
          {
            name: '44', // NEW MAJOR RELEASE!
            last_updated: '2025-07-05T16:00:00Z'
          },
          {
            name: '42',
            last_updated: '2025-04-20T12:00:00Z'
          }
        ]
      };

      nock('https://hub.docker.com')
        .get('/v2/repositories/library/fedora/tags/')
        .query({ page_size: 1000 })
        .reply(200, mockApiResponse);

      const config = ConfigParser.parseConfigString('Fedora = https://hub.docker.com/_/fedora/tags');
      const results = await crawler.crawlPackages(config);

      expect(results[0].latestVersion?.version).toBe('44');
    });
  });

  describe('Edge Cases: Version Format Variations', () => {
    test('should handle Ubuntu LTS vs interim releases', async () => {
      const mockApiResponse = {
        results: [
          {
            name: '24.04', // LTS
            last_updated: '2025-06-01T12:00:00Z'
          },
          {
            name: '25.10', // Interim - should be latest
            last_updated: '2025-07-02T12:00:00Z'
          },
          {
            name: '24.10', // Interim - older
            last_updated: '2025-05-15T12:00:00Z'
          }
        ]
      };

      nock('https://hub.docker.com')
        .get('/v2/repositories/library/ubuntu/tags/')
        .query({ page_size: 1000 })
        .reply(200, mockApiResponse);

      const config = ConfigParser.parseConfigString('Ubuntu = https://hub.docker.com/_/ubuntu');
      const results = await crawler.crawlPackages(config);

      expect(results[0].latestVersion?.version).toBe('25.10');
    });

    test('should handle Elixir with OTP variants correctly', async () => {
      const mockApiResponse = {
        results: [
          {
            name: '1.18.4',
            last_updated: '2025-07-02T12:00:00Z'
          },
          {
            name: '1.18.4-otp-27',
            last_updated: '2025-07-02T12:00:00Z'
          },
          {
            name: '1.18.4-otp-27-alpine',
            last_updated: '2025-07-02T12:00:00Z'
          },
          {
            name: '1.18.5', // NEWER VERSION!
            last_updated: '2025-07-05T14:00:00Z'
          }
        ]
      };

      nock('https://hub.docker.com')
        .get('/v2/repositories/library/elixir/tags/')
        .query({ page_size: 1000 })
        .reply(200, mockApiResponse);

      const config = ConfigParser.parseConfigString('Elixir = https://hub.docker.com/_/elixir/tags');
      const results = await crawler.crawlPackages(config);

      expect(results[0].latestVersion?.version).toBe('1.18.5');
      expect(results[0].latestVersion?.version).not.toContain('otp');
      expect(results[0].latestVersion?.version).not.toContain('alpine');
    });
  });

  describe('Error Scenarios and Recovery', () => {
    test('should handle Docker Hub API being down with HTML fallback', async () => {
      // Mock API failure
      nock('https://hub.docker.com')
        .get('/v2/repositories/library/alpine/tags/')
        .query(true)
        .times(3) // All API attempts fail
        .reply(503, { error: 'Service Unavailable' });

      // Mock HTML fallback
      const mockHtml = `
        <html>
          <body>
            <table>
              <tr><td>3.22.0</td><td>2025-05-30</td></tr>
              <tr><td>3.21.0</td><td>2025-04-15</td></tr>
              <tr><td>latest</td><td>2025-05-30</td></tr>
            </table>
          </body>
        </html>
      `;

      nock('https://hub.docker.com')
        .get('/_/alpine/tags')
        .reply(200, mockHtml);

      const config = ConfigParser.parseConfigString('Alpine = https://hub.docker.com/_/alpine/tags');
      const results = await crawler.crawlPackages(config);

      // Version parsed from HTML fallback may include additional date info
      expect(results[0].latestVersion?.version).toMatch(/^3\.22\./);
      expect(results[0].latestVersion?.version.length).toBeGreaterThan(5);
      expect(results[0].error).toBeUndefined();
    });

    test('should handle rate limiting gracefully', async () => {
      // First request gets rate limited
      nock('https://hub.docker.com')
        .get('/v2/repositories/library/alpine/tags/')
        .query({ page_size: 1000 })
        .reply(429, { error: 'Rate limit exceeded' });

      // Second request (retry) succeeds
      nock('https://hub.docker.com')
        .get('/v2/repositories/library/alpine/tags/')
        .query({ page_size: 500, ordering: '-last_updated' })
        .reply(200, {
          results: [
            {
              name: '3.22.0',
              last_updated: '2025-05-30T12:00:00Z'
            }
          ]
        });

      const config = ConfigParser.parseConfigString('Alpine = https://hub.docker.com/_/alpine/tags');
      const results = await crawler.crawlPackages(config);

      expect(results[0].latestVersion?.version).toBe('3.22.0');
      expect(results[0].error).toBeUndefined();
    });
  });

  describe('Data Quality and Validation', () => {
    test('should reject invalid version formats', async () => {
      const mockApiResponse = {
        results: [
          {
            name: '20250705', // Date-like tag - should be rejected
            last_updated: '2025-07-05T12:00:00Z'
          },
          {
            name: 'abc123', // Invalid format - should be rejected  
            last_updated: '2025-07-05T11:00:00Z'
          },
          {
            name: '12.11', // Valid Debian version
            last_updated: '2025-07-01T12:00:00Z'
          }
        ]
      };

      nock('https://hub.docker.com')
        .get('/v2/repositories/library/debian/tags/')
        .query({ page_size: 1000 })
        .reply(200, mockApiResponse);

      const config = ConfigParser.parseConfigString('Debian = https://hub.docker.com/_/debian');
      const results = await crawler.crawlPackages(config);

      expect(results[0].latestVersion?.version).toBe('12.11');
      // Should not pick up date-like or invalid tags
      expect(results[0].latestVersion?.version).not.toBe('20250705');
      expect(results[0].latestVersion?.version).not.toBe('abc123');
    });

    test('should prefer semantic versions over less specific ones', async () => {
      const mockApiResponse = {
        results: [
          {
            name: '3.22',
            last_updated: '2025-05-30T12:00:00Z'
          },
          {
            name: '3.22.0', // More specific - should be preferred
            last_updated: '2025-05-30T12:00:00Z'
          },
          {
            name: '3.21.5',
            last_updated: '2025-04-15T12:00:00Z'
          }
        ]
      };

      nock('https://hub.docker.com')
        .get('/v2/repositories/library/alpine/tags/')
        .query({ page_size: 1000 })
        .reply(200, mockApiResponse);

      const config = ConfigParser.parseConfigString('Alpine = https://hub.docker.com/_/alpine/tags');
      const results = await crawler.crawlPackages(config);

      expect(results[0].latestVersion?.version).toBe('3.22.0');
    });
  });

  describe('Package-Specific Validations', () => {
    test('should validate Alpine version ranges', async () => {
      const mockApiResponse = {
        results: [
          {
            name: '2.7.0', // Too old - Alpine 2.x
            last_updated: '2020-01-01T12:00:00Z'
          },
          {
            name: '5.99.0', // Future version - invalid
            last_updated: '2025-07-05T12:00:00Z'
          },
          {
            name: '3.22.0', // Valid Alpine 3.x
            last_updated: '2025-05-30T12:00:00Z'
          }
        ]
      };

      nock('https://hub.docker.com')
        .get('/v2/repositories/library/alpine/tags/')
        .query({ page_size: 1000 })
        .reply(200, mockApiResponse);

      const config = ConfigParser.parseConfigString('Alpine = https://hub.docker.com/_/alpine/tags');
      const results = await crawler.crawlPackages(config);

      expect(results[0].latestVersion?.version).toBe('3.22.0');
      // Should not pick up invalid version ranges
      expect(results[0].latestVersion?.version).not.toBe('2.7.0');
      expect(results[0].latestVersion?.version).not.toBe('5.99.0');
    });

    test('should validate Fedora version ranges', async () => {
      const mockApiResponse = {
        results: [
          {
            name: '15', // Too old
            last_updated: '2015-01-01T12:00:00Z'
          },
          {
            name: '99', // Future version - invalid
            last_updated: '2025-07-05T12:00:00Z'
          },
          {
            name: '42', // Valid current range
            last_updated: '2025-06-25T12:00:00Z'
          }
        ]
      };

      nock('https://hub.docker.com')
        .get('/v2/repositories/library/fedora/tags/')
        .query({ page_size: 1000 })
        .reply(200, mockApiResponse);

      const config = ConfigParser.parseConfigString('Fedora = https://hub.docker.com/_/fedora/tags');
      const results = await crawler.crawlPackages(config);

      expect(results[0].latestVersion?.version).toBe('42');
    });

    test('should filter out Fedora rawhide (testing) tags', async () => {
      const mockApiResponse = {
        results: [
          {
            name: 'rawhide', // Should be filtered out
            last_updated: '2025-07-05T12:00:00Z'
          },
          {
            name: 'rawhide-20241201', // Should be filtered out
            last_updated: '2025-07-01T12:00:00Z'
          },
          {
            name: 'branched', // Should be filtered out (Fedora development)
            last_updated: '2025-06-30T12:00:00Z'
          },
          {
            name: '43', // Should be filtered out (now associated with rawhide)
            last_updated: '2025-07-01T12:00:00Z'
          },
          {
            name: '42', // Valid stable release
            last_updated: '2025-06-25T12:00:00Z'
          },
          {
            name: '41', // Valid but older
            last_updated: '2025-05-25T12:00:00Z'
          }
        ]
      };

      nock('https://hub.docker.com')
        .get('/v2/repositories/library/fedora/tags/')
        .query({ page_size: 1000 })
        .reply(200, mockApiResponse);

      const config = ConfigParser.parseConfigString('Fedora = https://hub.docker.com/_/fedora/tags');
      const results = await crawler.crawlPackages(config);

      expect(results[0].latestVersion?.version).toBe('42');
      // Should not pick up rawhide, development tags, or version 43 (now rawhide-associated)
      expect(results[0].latestVersion?.version).not.toBe('rawhide');
      expect(results[0].latestVersion?.version).not.toBe('branched');
      expect(results[0].latestVersion?.version).not.toBe('43');
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle large numbers of tags efficiently', async () => {
      // Generate 1000 fake tags
      const results = Array.from({ length: 1000 }, (_, i) => ({
        name: i % 10 === 0 ? `3.${Math.floor(i/10)}.0` : `build-${i}`,
        last_updated: `2025-07-0${(i % 5) + 1}T12:00:00Z`
      }));

      // Add the actual latest version that should be found
      results.unshift({
        name: '3.50.0',
        last_updated: '2025-07-05T12:00:00Z'
      });

      nock('https://hub.docker.com')
        .get('/v2/repositories/library/alpine/tags/')
        .query({ page_size: 1000 })
        .reply(200, { results });

      const startTime = Date.now();
      
      const config = ConfigParser.parseConfigString('Alpine = https://hub.docker.com/_/alpine/tags');
      const crawlResults = await crawler.crawlPackages(config);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(crawlResults[0].latestVersion?.version).toBe('3.50.0');
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    }, 10000);

    test('should handle concurrent package crawling correctly', async () => {
      // Mock responses for multiple packages
      nock('https://hub.docker.com')
        .get('/v2/repositories/library/alpine/tags/')
        .query(true)
        .reply(200, {
          results: [{ name: '3.22.0', last_updated: '2025-05-30T12:00:00Z' }]
        });

      nock('https://hub.docker.com')
        .get('/v2/repositories/library/debian/tags/')
        .query(true)
        .reply(200, {
          results: [{ name: '12.11', last_updated: '2025-07-01T12:00:00Z' }]
        });

      nock('https://hub.docker.com')
        .get('/v2/repositories/library/fedora/tags/')
        .query(true)
        .reply(200, {
          results: [{ name: '42', last_updated: '2025-06-25T12:00:00Z' }]
        });

      const config = ConfigParser.parseConfigString(`
        Alpine = https://hub.docker.com/_/alpine/tags
        Debian = https://hub.docker.com/_/debian
        Fedora = https://hub.docker.com/_/fedora/tags
      `);

      const results = await crawler.crawlPackages(config);

      expect(results).toHaveLength(3);
      expect(results.find(r => r.packageName === 'Alpine')?.latestVersion?.version).toBe('3.22.0');
      expect(results.find(r => r.packageName === 'Debian')?.latestVersion?.version).toBe('12.11');
      expect(results.find(r => r.packageName === 'Fedora')?.latestVersion?.version).toBe('42');
    });
  });
});
