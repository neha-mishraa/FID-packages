#!/bin/bash
# JFrog Artifactory Package Version Monitor
# CI/CD Pipeline Integration Script

set -e

# Configuration
CONFIG_FILE="${CONFIG_FILE:-configs/artifactory-monitoring.txt}"
OUTPUT_DIR="${OUTPUT_DIR:-./reports}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="${OUTPUT_DIR}/package_versions_${TIMESTAMP}.json"
SUMMARY_FILE="${OUTPUT_DIR}/version_summary.txt"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "🔍 JFrog Artifactory Package Version Monitor"
echo "================================================"
echo "Config: $CONFIG_FILE"
echo "Report: $REPORT_FILE"
echo "Timestamp: $(date)"
echo ""

# Run the crawler
echo "📦 Scanning package versions..."
node dist/index.js --config "$CONFIG_FILE" --format json --output "$REPORT_FILE"

# Extract key information for CI logs
echo ""
echo "📊 Version Summary"
echo "=================="

# Parse JSON and create summary
if command -v jq &> /dev/null; then
    # If jq is available, use it for better formatting
    TOTAL=$(jq -r '.metadata.totalPackages' "$REPORT_FILE")
    SUCCESSFUL=$(jq -r '.metadata.successful' "$REPORT_FILE")
    FAILED=$(jq -r '.metadata.failed' "$REPORT_FILE")
    
    echo "Total packages checked: $TOTAL"
    echo "Successfully retrieved: $SUCCESSFUL"
    echo "Failed: $FAILED"
    echo ""
    
    # Create detailed summary
    echo "Package Versions:" > "$SUMMARY_FILE"
    echo "=================" >> "$SUMMARY_FILE"
    jq -r '.results[] | "\(.packageName): \(.latestVersion.version // "N/A")"' "$REPORT_FILE" >> "$SUMMARY_FILE"
    
    # Show recent versions in CI log
    echo "Recent Package Versions:"
    jq -r '.results[] | "  • \(.packageName): \(.latestVersion.version // "ERROR")"' "$REPORT_FILE"
    
    # Check for any failures
    if [ "$FAILED" -gt 0 ]; then
        echo ""
        echo "⚠️  Warning: $FAILED package(s) failed to retrieve versions"
        jq -r '.results[] | select(.error != null) | "  ❌ \(.packageName): \(.error)"' "$REPORT_FILE"
    fi
else
    # Fallback if jq is not available
    echo "Note: Install 'jq' for enhanced JSON parsing"
    grep -o '"packageName":"[^"]*"' "$REPORT_FILE" | cut -d'"' -f4 | head -10
fi

echo ""
echo "✅ Report saved to: $REPORT_FILE"
echo "📄 Summary saved to: $SUMMARY_FILE"

# Exit with appropriate code
FAILED_COUNT=$(jq -r '.metadata.failed // 0' "$REPORT_FILE" 2>/dev/null || echo "0")
if [ "$FAILED_COUNT" -gt 0 ]; then
    echo ""
    echo "⚠️  Pipeline warning: Some packages failed to retrieve versions"
    exit 1
else
    echo ""
    echo "🎉 All packages successfully checked!"
    exit 0
fi
