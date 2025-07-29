import { PackageMapping, PackageType } from '../types';

export class ConfigParser {
  static parseConfigString(configString: string): PackageMapping[] {
    const lines = configString.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
    const mappings: PackageMapping[] = [];

    for (const line of lines) {
      const mapping = this.parseLine(line.trim());
      if (mapping) {
        mappings.push(mapping);
      }
    }

    return mappings;
  }

  static parseConfigFile(configData: string): PackageMapping[] {
    return this.parseConfigString(configData);
  }

  private static parseLine(line: string): PackageMapping | null {
    // Support both "name = url" and "name=url" formats
    const match = line.match(/^(.+?)\s*=\s*(.+)$/);
    
    if (!match) {
      console.warn(`Invalid config line format: ${line}`);
      return null;
    }

    const [, name, url] = match;
    const packageType = this.detectPackageType(name.trim(), url.trim());

    return {
      name: name.trim(),
      url: url.trim(),
      type: packageType,
    };
  }

  private static detectPackageType(name: string, url: string): PackageType {
    const urlLower = url.toLowerCase();
    const nameLower = name.toLowerCase();

    // URL-based detection (most reliable)
    if (urlLower.includes('hub.docker.com')) {
      return PackageType.DOCKER_HUB;
    }
    
    if (urlLower.includes('github.com') && urlLower.includes('/releases')) {
      return PackageType.GITHUB_RELEASES;
    }
    
    if (urlLower.includes('releases.hashicorp.com')) {
      return PackageType.HASHICORP;
    }
    
    if (urlLower.includes('pypi.org') || urlLower.includes('pypi.python.org')) {
      return PackageType.PYPI;
    }
    
    if (urlLower.includes('npmjs.com') || urlLower.includes('npm.org')) {
      return PackageType.NPM;
    }

    // Name-based detection
    if (nameLower.includes('opkg') || urlLower.includes('opkg')) {
      return PackageType.OPKG;
    }
    
    // HashiCorp products
    const hashicorpProducts = ['vagrant', 'terraform', 'consul', 'vault', 'nomad', 'packer', 'boundary', 'waypoint'];
    if (hashicorpProducts.some(product => nameLower.includes(product))) {
      return PackageType.HASHICORP;
    }
    
    // Docker images
    const dockerImages = ['alpine', 'ubuntu', 'fedora', 'centos', 'debian', 'nginx', 'node', 'python', 'redis', 'mysql', 'postgres', 'elixir', 'swift'];
    if (dockerImages.some(img => nameLower.includes(img))) {
      return PackageType.DOCKER_HUB;
    }

    // Default to generic
    return PackageType.GENERIC;
  }

  static validateMapping(mapping: PackageMapping): boolean {
    if (!mapping.name || !mapping.url) {
      return false;
    }

    try {
      new URL(mapping.url);
      return true;
    } catch {
      return false;
    }
  }

  static createSampleConfig(): string {
    return `# Package Configuration File
# Format: package_name = url
# 
# Examples:
opkg = https://downloads.yoctoproject.org/releases/opkg/
alpine = https://hub.docker.com/_/alpine
fedora = https://hub.docker.com/_/fedora
ubuntu = https://hub.docker.com/_/ubuntu
node = https://github.com/nodejs/node/releases
python = https://pypi.org/project/python/
react = https://www.npmjs.com/package/react

# You can also specify custom packages:
# my-custom-package = https://example.com/releases/
`;
  }
}
