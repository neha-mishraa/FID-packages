#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { Crawler } from './Crawler';
import { ConfigParser } from './utils/ConfigParser';
import { Logger, LogLevel } from './utils/Logger';

interface CLIOptions {
  config?: string;
  output?: string;
  format?: 'json' | 'text';
  verbose?: boolean;
  sample?: boolean;
  help?: boolean;
}

function parseArguments(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '-c':
      case '--config':
        options.config = args[++i];
        break;
      case '-o':
      case '--output':
        options.output = args[++i];
        break;
      case '-f':
      case '--format':
        options.format = args[++i] as 'json' | 'text';
        break;
      case '-v':
      case '--verbose':
        options.verbose = true;
        break;
      case '-s':
      case '--sample':
        options.sample = true;
        break;
      case '-h':
      case '--help':
        options.help = true;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
Crawli - AI-powered web scraper for package versions

Usage: npm run dev [options]

Options:
  -c, --config <file>    Configuration file path (default: ./config.txt)
  -o, --output <file>    Output file path (optional)
  -f, --format <type>    Output format: json or text (default: text)
  -v, --verbose          Enable verbose logging
  -s, --sample           Generate sample configuration file
  -h, --help             Show this help message

Configuration File Format:
  package_name = url

Examples:
  opkg = https://downloads.yoctoproject.org/releases/opkg/
  alpine = https://hub.docker.com/_/alpine
  node = https://github.com/nodejs/node/releases

For more information, visit: https://github.com/yourusername/crawli
`);
}

async function generateSampleConfig(): Promise<void> {
  const samplePath = path.join(process.cwd(), 'config.sample.txt');
  const sampleConfig = ConfigParser.createSampleConfig();
  
  fs.writeFileSync(samplePath, sampleConfig);
  console.log(`Sample configuration file generated: ${samplePath}`);
}

async function loadConfiguration(configPath: string): Promise<string> {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }
  
  return fs.readFileSync(configPath, 'utf-8');
}

async function saveOutput(content: string, outputPath: string): Promise<void> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, content);
  Logger.info(`Output saved to: ${outputPath}`);
}

async function main(): Promise<void> {
  try {
    const options = parseArguments();

    if (options.help) {
      showHelp();
      return;
    }

    if (options.sample) {
      await generateSampleConfig();
      return;
    }

    // Set log level
    if (options.verbose) {
      Logger.setLevel(LogLevel.DEBUG);
    }

    // Determine config file path
    const configPath = options.config || path.join(process.cwd(), 'config.txt');
    
    if (!fs.existsSync(configPath)) {
      console.error(`Configuration file not found: ${configPath}`);
      console.log('Use --sample to generate a sample configuration file.');
      process.exit(1);
    }

    // Load and parse configuration
    Logger.info(`Loading configuration from: ${configPath}`);
    const configData = await loadConfiguration(configPath);
    const packageMappings = ConfigParser.parseConfigFile(configData);

    if (packageMappings.length === 0) {
      console.error('No valid package mappings found in configuration file.');
      process.exit(1);
    }

    Logger.info(`Found ${packageMappings.length} package(s) to crawl`);

    // Create crawler and start crawling
    const crawler = new Crawler();
    const results = await crawler.crawlPackages(packageMappings);

    // Generate output
    const format = options.format || 'text';
    let output: string;

    if (format === 'json') {
      output = crawler.exportToJson();
    } else {
      output = crawler.generateReport();
    }

    // Save or display output
    if (options.output) {
      await saveOutput(output, options.output);
    } else {
      console.log(output);
    }

    // Exit with appropriate code
    const failed = crawler.getFailedResults().length;
    if (failed > 0) {
      Logger.warn(`${failed} package(s) failed to crawl`);
      process.exit(1);
    }

  } catch (error) {
    Logger.error('Application error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the application
if (require.main === module) {
  main();
}
