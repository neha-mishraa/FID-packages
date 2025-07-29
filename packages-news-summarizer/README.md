# RSS Feed Analyzer

This project fetches RSS feeds, processes the data, and sends it to OpenAI for analysis. The analysis determines if there are any updates that may affect JFrog Artifactory in terms of supporting the package manager protocol or changes on the remote registry side.

## Project Structure

- `main.py`: The main script to run the program.
- `rss_fetcher.py`: Fetches RSS feeds.
- `openai_integration.py`: Sends data to OpenAI.
- `gemini_integration.py`: Sends data to Google Gemini API.
- `feeds.json`: Contains feed URLs.
- `feeds_data.json`: Stores fetched feed data.
- `prompt.txt`: Contains the prompt template for OpenAI.
- `.env`: Stores environment variables.
- `requirements.txt`: Lists project dependencies.
- `run.sh`: Automated setup and execution script.
- `install-deps.sh`: System dependency installation script.
- `test_compatibility.py`: Python 3.8 compatibility test.
- `test_gemini.py`: Gemini API integration test.

## Requirements

- **Python**: 3.8 or higher
- **Operating System**: Linux (Ubuntu 20.04+), macOS, or Windows
- **Dependencies**: See `requirements.txt`

## Setup

### Quick Start (Recommended)

1. Clone the repository:
   ```bash
   git clone <project>
   cd packages-news-summarizer
   ```

2. Install system dependencies (if needed):
   ```bash
   ./install-deps.sh
   ```

3. Run the automated setup:
   ```bash
   ./run.sh
   ```

### Manual Setup

1. Clone the repository:
   ```bash
   git clone <project>
   cd packages-news-summarizer
   ```

2. Create a virtual environment and activate it:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file by copying the `.env.example` file:
   ```bash
   cp .env.example .env
   ```
   Then, adjust the `.env` file with your specific settings. Key variables include:
   ```
   #Use your token from Jeffry
   OPENAI_API_KEY=your_actual_api_key_here # Your OpenAI API key
   MODEL_NAME=azure_openai                 # The model to use (e.g., azure_openai)
   OPENAI_BASE_URL=https://jeffry.jfrog.org/api # The base URL for the OpenAI API
   USE_MOCK_FEED_DATA=TRUE                 # Set to TRUE to use mock data from feeds_data.json instead of fetching live RSS feeds
   #Uncomment below for debug logs
   #DEBUG=true
   
   # For Gemini integration (optional)
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-1.5-flash
   ```

5. Adjust your RSS feed URLs in `feeds.json` if needed:
   ```json
   {
     "feeds": [
       "https://example.com/rss",
       "https://anotherexample.com/rss"
     ]
   }
   ```

## Usage

### Using the automated script (Recommended)
```bash
./run.sh                          # process all teams (default 60-day window)
./run.sh --team pacnroll --days 7 # run only for team "pacnroll" looking back 7 days
```

### Manual execution
```bash
python3 main.py
```

## Testing

### Compatibility Test
Run the compatibility test to verify Python 3.8 support:
```bash
python3 test_compatibility.py
```

### Gemini Integration Test
Test the Gemini API integration:
```bash
python3 test_gemini.py
```

## Troubleshooting

### Virtual Environment Issues

If you encounter issues with virtual environment creation:

**On Debian/Ubuntu:**
```bash
sudo apt install python3-venv
```

**On RHEL/CentOS:**
```bash
sudo yum install python3-venv
```

**On macOS:**
```bash
brew install python3
```

### Missing Dependencies

If you get errors about missing packages, run:
```bash
./install-deps.sh
```

### Permission Issues

If you get permission errors, ensure the scripts are executable:
```bash
chmod +x run.sh install-deps.sh
```

### Python 3.8 Compatibility

This project is specifically tested and compatible with Python 3.8+. If you encounter type annotation errors, ensure you're using Python 3.8 or higher.

### Gemini API Issues

If you encounter Gemini API errors:

1. **API Key**: Ensure `GEMINI_API_KEY` is set in your environment
2. **Model**: The default model is `gemini-1.5-flash`. You can override with `GEMINI_MODEL`
3. **Version**: The project works with any version of `google-generativeai` (including 0.1.0rc1)
4. **Testing**: Run `python3 test_gemini.py` to verify the integration

### CI/CD Environment

For CI/CD environments (like Ubuntu 20.04), the script automatically:
- Detects missing `python3-venv` package
- Falls back to `virtualenv` if available
- Provides clear error messages for missing dependencies
- Uses Python 3.8+ compatible type annotations
- Uses direct Gemini API calls (no CLI dependency)