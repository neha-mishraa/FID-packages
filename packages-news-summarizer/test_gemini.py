#!/usr/bin/env python3
"""
Simple test script to verify Gemini integration is working properly.
Usage: python test_gemini.py
"""

import os
import sys
from gemini_integration import send_to_gemini

def test_gemini_integration():
    """Test basic Gemini functionality."""
    
    # Check if API key is available
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_TOKEN")
    if not api_key:
        print("❌ ERROR: No GEMINI_API_KEY or GEMINI_TOKEN found in environment")
        print("Set GEMINI_API_KEY before running this test")
        return False
    
    print(f"✅ API key found (starts with: {api_key[:8]}...)")
    
    # Check model name
    model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    print(f"✅ Using model: {model_name}")
    
    # Test simple prompt
    test_prompt = "Respond with exactly: 'Gemini integration test successful'"
    test_data = {"test": "simple test"}
    
    try:
        print("🔄 Testing Gemini integration...")
        response = send_to_gemini(test_prompt, test_data)
        print(f"✅ SUCCESS: Gemini responded with: {response}")
        return True
        
    except Exception as e:
        print(f"❌ ERROR: Gemini integration failed: {e}")
        print(f"Error type: {type(e).__name__}")
        return False

if __name__ == "__main__":
    print("=== Gemini Integration Test ===")
    success = test_gemini_integration()
    sys.exit(0 if success else 1) 