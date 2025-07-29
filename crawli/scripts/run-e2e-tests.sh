#!/bin/bash

# E2E Test Runner for Crawli Web Scraper
# This script runs comprehensive end-to-end tests to validate robustness

echo "🧪 Starting Comprehensive E2E Test Suite for Crawli"
echo "=================================================="

# Build the project first
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Exiting."
    exit 1
fi

echo "✅ Build successful"
echo ""

# Run the test suites
echo "🔍 Running E2E Tests..."
echo ""

# Test 1: Version Release Scenarios
echo "🚀 Test Suite 1: Version Release Scenarios"
echo "Testing new version detection, format variations, and edge cases..."
npm test -- --testPathPattern=version-release-scenarios --verbose

# Test 2: Real-World Integration
echo ""
echo "🌐 Test Suite 2: Real-World Integration"
echo "Testing live API integration and stress scenarios..."
npm test -- --testPathPattern=real-world-integration --verbose

# Test 3: Edge Cases and Data Quality
echo ""
echo "🎯 Test Suite 3: Edge Cases and Data Quality" 
echo "Testing malformed data, extreme scenarios, and consistency..."
npm test -- --testPathPattern=edge-cases-data-quality --verbose

# Generate coverage report
echo ""
echo "📊 Generating Test Coverage Report..."
npm run test:coverage

echo ""
echo "🎉 E2E Test Suite Complete!"
echo "Check the coverage report above for detailed results."
