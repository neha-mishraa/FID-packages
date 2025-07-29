#!/usr/bin/env bash
# Simple automation script for the News Summarizer project.
#
# Usage examples:
#   ./run.sh                          # process all teams (default 60-day window)
#   ./run.sh --team pacnroll --days 7 # run only for team "pacnroll" looking back 7 days
#
# Prerequisites:
#   • Bash 4+ and Python 3.8+ on PATH
#   • GEMINI_API_KEY or GEMINI_TOKEN exported for the Gemini API (and optional GEMINI_MODEL)
#
# The script will create (or reuse) a virtual environment in ".venv", install
# dependencies, and forward any additional CLI arguments directly to main.py.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

VENV_DIR=".venv"
PYTHON="python3"

# ---------------------------------------------------------------------------
# Parse optional CLI flags for Gemini credentials and collect remaining args
# ---------------------------------------------------------------------------

GEMINI_API_KEY_OVERRIDE=""
GEMINI_MODEL_OVERRIDE=""
CLI_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --gemini-api-key)
      GEMINI_API_KEY_OVERRIDE="$2"
      shift 2
      ;;
    --gemini-model)
      GEMINI_MODEL_OVERRIDE="$2"
      shift 2
      ;;
    *)
      CLI_ARGS+=("$1")
      shift
      ;;
  esac
done

# Export overrides if provided so that downstream processes can access them
if [[ -n "$GEMINI_API_KEY_OVERRIDE" ]]; then
  export GEMINI_API_KEY="$GEMINI_API_KEY_OVERRIDE"
fi

if [[ -n "$GEMINI_MODEL_OVERRIDE" ]]; then
  export GEMINI_MODEL="$GEMINI_MODEL_OVERRIDE"
fi

echo "[INFO] Starting News Summarizer setup..."

# Check if virtual environment exists, if not create it
if [[ ! -d "$VENV_DIR" ]]; then
  echo "[INFO] Creating virtual environment in $VENV_DIR …"
  
  # Try to create virtual environment with different methods
  if command -v "$PYTHON" >/dev/null 2>&1; then
    echo "[INFO] Python version: $($PYTHON --version)"
    
    # First try the standard venv module
    if "$PYTHON" -m venv "$VENV_DIR" 2>/dev/null; then
      echo "[INFO] Virtual environment created successfully with venv"
    else
      # Fallback: try with virtualenv if available
      if command -v virtualenv >/dev/null 2>&1; then
        echo "[INFO] Using virtualenv as fallback..."
        virtualenv -p "$PYTHON" "$VENV_DIR"
        echo "[INFO] Virtual environment created successfully with virtualenv"
      else
        echo "[ERROR] Failed to create virtual environment. Please install python3-venv:"
        echo "  apt install python3-venv  # On Debian/Ubuntu"
        echo "  yum install python3-venv  # On RHEL/CentOS"
        echo "  brew install python3       # On macOS"
        exit 1
      fi
    fi
  else
    echo "[ERROR] Python3 not found. Please install Python 3.8+"
    exit 1
  fi
else
  echo "[INFO] Using existing virtual environment in $VENV_DIR"
fi

# Activate virtual environment
if [[ -f "$VENV_DIR/bin/activate" ]]; then
  echo "[INFO] Activating virtual environment..."
  # shellcheck disable=SC1090
  source "$VENV_DIR/bin/activate"
elif [[ -f "$VENV_DIR/Scripts/activate" ]]; then
  # Windows compatibility
  echo "[INFO] Activating virtual environment (Windows)..."
  source "$VENV_DIR/Scripts/activate"
else
  echo "[ERROR] Virtual environment activation script not found"
  exit 1
fi

# Verify Python is available after activation
if ! command -v python3 >/dev/null 2>&1; then
  echo "[ERROR] Python3 not found after virtual environment activation"
  exit 1
fi

echo "[INFO] Python version in virtual environment: $(python3 --version)"

# Upgrade pip quietly if needed
echo "[INFO] Upgrading pip..."
python3 -m pip install --quiet --upgrade pip

# Install (or update) project requirements
echo "[INFO] Installing project dependencies..."
python3 -m pip install --quiet -r requirements.txt

echo "[INFO] Setup complete. Running main script..."

# Forward remaining args to the Python entry point
python3 main.py "${CLI_ARGS[@]}" 