#!/usr/bin/env bash
# Script to install system dependencies for the News Summarizer project

set -e

echo "Installing system dependencies for News Summarizer..."

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v apt-get >/dev/null 2>&1; then
        # Debian/Ubuntu
        echo "Detected Debian/Ubuntu system"
        sudo apt-get update
        sudo apt-get install -y python3 python3-venv python3-pip
    elif command -v yum >/dev/null 2>&1; then
        # RHEL/CentOS
        echo "Detected RHEL/CentOS system"
        sudo yum install -y python3 python3-venv python3-pip
    elif command -v dnf >/dev/null 2>&1; then
        # Fedora
        echo "Detected Fedora system"
        sudo dnf install -y python3 python3-venv python3-pip
    else
        echo "Unsupported Linux distribution. Please install python3, python3-venv, and python3-pip manually."
        exit 1
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "Detected macOS system"
    if command -v brew >/dev/null 2>&1; then
        brew install python3
    else
        echo "Homebrew not found. Please install Homebrew first:"
        echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        echo "Then run: brew install python3"
        exit 1
    fi
else
    echo "Unsupported operating system: $OSTYPE"
    echo "Please install Python 3.8+ and python3-venv manually."
    exit 1
fi

echo "System dependencies installed successfully!"
echo "You can now run ./run.sh" 