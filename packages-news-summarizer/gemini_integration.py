#!/usr/bin/env python3
"""
Gemini integration using direct REST API calls.
This is compatible with Python 3.8+ and works with the current Gemini API.
"""

import os
import json
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

_GEMINI_TOKEN = os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_TOKEN")
_GEMINI_MODEL = os.getenv("GEMINI_MODEL")

def send_to_gemini(prompt: str, data: Dict[str, Any]) -> str:
    """
    Send a prompt to Gemini and return the response.
    
    Args:
        prompt: The prompt template string with {data} placeholder
        data: Dictionary to be formatted into the prompt
        
    Returns:
        The text response from Gemini
        
    Raises:
        RuntimeError: If API key is missing or API call fails
    """
    # Format the prompt with the data
    rendered_prompt = prompt.format(data=json.dumps(data, indent=2))
    print(f"[DEBUG] Sending prompt to Gemini (length: {len(rendered_prompt)} chars)")
    
    # Get the response from Gemini
    return _generate_with_gemini_api(rendered_prompt)

def _generate_with_gemini_api(rendered_prompt: str) -> str:
    """
    Generate text using direct REST API calls to the Gemini API.
    
    Args:
        rendered_prompt: The formatted prompt to send to Gemini
        
    Returns:
        The text response from Gemini
        
    Raises:
        RuntimeError: If API key is missing or API call fails
    """
    try:
        import requests
    except ImportError as e:
        raise RuntimeError("requests package not found. Please install it with: pip install requests") from e
    
    # Get API key
    api_key = _GEMINI_TOKEN or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Set GEMINI_API_KEY or GEMINI_TOKEN to use the Gemini API.")
    
    print(f"[DEBUG] Using API key starting with: {api_key[:8]}..." if api_key else "[DEBUG] No API key found")

    # Get model name - default to gemini-1.5-flash if not specified
    model_name = _GEMINI_MODEL or "gemini-1.5-flash"
    print(f"[DEBUG] Using model: {model_name}")
    
    # Prepare the API request
    url = f"https://generativelanguage.googleapis.com/v1/models/{model_name}:generateContent"
    headers = {
        "Content-Type": "application/json",
    }
    
    # Build the request payload
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": rendered_prompt
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "topP": 0.8,
            "topK": 40,
            "maxOutputTokens": 2048
        }
    }
    
    try:
        print("[DEBUG] Making REST API call to Gemini...")
        print(f"[DEBUG] URL: {url}")
        print(f"[DEBUG] Payload size: {len(json.dumps(payload))} bytes")
        
        # Make the API call with API key as query parameter
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            params={"key": api_key},
            timeout=30
        )
        
        print(f"[DEBUG] Response status: {response.status_code}")
        
        # Check for HTTP errors
        if response.status_code != 200:
            error_msg = f"HTTP {response.status_code}: {response.text}"
            print(f"[DEBUG] API error response: {error_msg}")
            raise RuntimeError(f"Gemini API error: {error_msg}")
        
        # Parse the response
        response_data = response.json()
        print(f"[DEBUG] Received response data: {json.dumps(response_data, indent=2)[:500]}...")
        
        # Extract the text from the response
        if "candidates" in response_data and len(response_data["candidates"]) > 0:
            candidate = response_data["candidates"][0]
            if "content" in candidate and "parts" in candidate["content"]:
                parts = candidate["content"]["parts"]
                if len(parts) > 0 and "text" in parts[0]:
                    result = parts[0]["text"].strip()
                    print(f"[DEBUG] ✅ SUCCESS! Got response (length: {len(result)} chars)")
                    return result
        
        # Fallback: convert entire response to string
        result = json.dumps(response_data, indent=2)
        print(f"[DEBUG] ⚠️ Using fallback JSON response (length: {len(result)} chars)")
        return result
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Network error calling Gemini API: {str(e)}"
        print(f"[DEBUG] ❌ NETWORK ERROR: {error_msg}")
        raise RuntimeError(error_msg) from e
    except json.JSONDecodeError as e:
        error_msg = f"Failed to parse Gemini API response: {str(e)}"
        print(f"[DEBUG] ❌ JSON ERROR: {error_msg}")
        raise RuntimeError(error_msg) from e
    except Exception as e:
        error_msg = f"Unexpected error calling Gemini API: {str(e)}"
        print(f"[DEBUG] ❌ UNEXPECTED ERROR: {error_msg}")
        raise RuntimeError(error_msg) from e 