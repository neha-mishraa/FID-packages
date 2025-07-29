<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Crawli - AI Web Scraper Instructions

This is a TypeScript Node.js project for web scraping package versions from various repositories.

## Project Structure
- `src/types/` - TypeScript type definitions
- `src/scrapers/` - Web scraper implementations for different package types
- `src/utils/` - Utility functions for configuration parsing and logging
- `src/Crawler.ts` - Main crawler orchestrator
- `src/index.ts` - CLI entry point

## Key Features
- Supports multiple package types: Docker Hub, OPKG, GitHub Releases, NPM, PyPI
- Extensible scraper architecture with strategy pattern
- Configurable via simple text files
- Robust error handling and retry logic
- JSON and text output formats

## When working on this project:
- Follow the existing TypeScript patterns and interfaces
- Add new package types by extending BaseScraper
- Use the ScraperFactory for creating appropriate scrapers
- Maintain backwards compatibility with existing configuration format
