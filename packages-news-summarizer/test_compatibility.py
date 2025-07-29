#!/usr/bin/env python3
"""
Simple compatibility test for Python 3.8
"""
import sys
from typing import List, Dict, Tuple, Optional

def test_type_annotations():
    """Test that type annotations work correctly"""
    test_list: List[str] = ["test"]
    test_dict: Dict[str, int] = {"test": 1}
    test_tuple: Tuple[str, int] = ("test", 1)
    test_optional: Optional[str] = None
    
    print("✓ Type annotations work correctly")
    return True

def test_imports():
    """Test that all required modules can be imported"""
    try:
        import json
        import os
        import argparse
        from collections import defaultdict
        from concurrent.futures import ThreadPoolExecutor, as_completed
        import time
        import random
        from typing import Dict, List, Tuple, Optional
        
        # Test project-specific imports
        from rss_fetcher import fetch_rss_feeds
        from gemini_integration import send_to_gemini
        
        print("✓ All imports work correctly")
        return True
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False

def main():
    """Run compatibility tests"""
    print(f"Python version: {sys.version}")
    print(f"Python version info: {sys.version_info}")
    
    if sys.version_info < (3, 8):
        print("✗ Python 3.8+ is required")
        return False
    
    print("✓ Python version is compatible")
    
    # Test type annotations
    if not test_type_annotations():
        return False
    
    # Test imports
    if not test_imports():
        return False
    
    print("\n🎉 All compatibility tests passed!")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 