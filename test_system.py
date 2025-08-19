#!/usr/bin/env python3
"""
Test script for the Health App system.
This script tests the main components to ensure they work correctly.
"""

import sys
import os
from pathlib import Path
import logging

# Add current directory to path for imports
sys.path.append(str(Path(__file__).parent))

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_imports():
    """Test that all modules can be imported."""
    print("Testing imports...")
    
    try:
        from data_processor import HealthDataProcessor
        print("✅ HealthDataProcessor imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import HealthDataProcessor: {e}")
        return False
    
    try:
        from model_trainer import HealthModelTrainer
        print("✅ HealthModelTrainer imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import HealthModelTrainer: {e}")
        return False
    
    try:
        from predictor import DiseasePredictor
        print("✅ DiseasePredictor imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import DiseasePredictor: {e}")
        return False
    
    try:
        from api import app
        print("✅ FastAPI app imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import FastAPI app: {e}")
        return False
    
    return True

def test_data_processor():
    """Test the data processor module."""
    print("\nTesting data processor...")
    
    try:
        from data_processor import HealthDataProcessor
        
        # Check if data directory exists
        if not os.path.exists("data"):
            print("⚠️  Data directory not found. Skipping data processor test.")
            return True
        
        processor = HealthDataProcessor()
        
        # Test getting symptom info
        symptom_info = processor.get_symptom_info()
        print(f"✅ Symptom info retrieved: {symptom_info['total_symptoms']} symptoms")
        
        return True
        
    except Exception as e:
        print(f"❌ Data processor test failed: {e}")
        return False

def test_predictor():
    """Test the predictor module."""
    print("\nTesting predictor...")
    
    try:
        from predictor import DiseasePredictor
        
        predictor = DiseasePredictor()
        
        # Test model info (should fail if no model is loaded)
        model_info = predictor.get_model_info()
        if "error" in model_info:
            print("⚠️  No model loaded (expected if not trained yet)")
        else:
            print("✅ Model info retrieved successfully")
        
        # Test available symptoms
        symptoms = predictor.get_available_symptoms()
        print(f"✅ Available symptoms: {len(symptoms)} symptoms")
        
        return True
        
    except Exception as e:
        print(f"❌ Predictor test failed: {e}")
        return False

def test_api():
    """Test the API module."""
    print("\nTesting API...")
    
    try:
        from api import app
        
        # Check if app has expected endpoints
        routes = [route.path for route in app.routes]
        expected_routes = ["/", "/health", "/predict", "/model/info", "/symptoms"]
        
        missing_routes = [route for route in expected_routes if route not in routes]
        
        if missing_routes:
            print(f"⚠️  Missing API routes: {missing_routes}")
        else:
            print("✅ All expected API routes found")
        
        print(f"✅ API has {len(routes)} total routes")
        
        return True
        
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False

def test_file_structure():
    """Test that all expected files exist."""
    print("\nTesting file structure...")
    
    expected_files = [
        "data_processor.py",
        "model_trainer.py", 
        "predictor.py",
        "api.py",
        "cli.py",
        "train_models.py",
        "requirements.txt",
        "README.md"
    ]
    
    missing_files = []
    for file in expected_files:
        if not os.path.exists(file):
            missing_files.append(file)
    
    if missing_files:
        print(f"❌ Missing files: {missing_files}")
        return False
    else:
        print("✅ All expected files found")
        return True

def test_data_files():
    """Test that data files exist."""
    print("\nTesting data files...")
    
    if not os.path.exists("data"):
        print("⚠️  Data directory not found")
        return False
    
    data_files = os.listdir("data")
    print(f"✅ Data directory contains {len(data_files)} files")
    
    # Check for key files
    key_files = ["dataset.csv", "Symptom-severity.csv"]
    for file in key_files:
        if file in data_files:
            print(f"✅ Found {file}")
        else:
            print(f"⚠️  Missing {file}")
    
    return True

def main():
    """Run all tests."""
    print("🧪 Health App System Test")
    print("=" * 40)
    
    tests = [
        ("File Structure", test_file_structure),
        ("Data Files", test_data_files),
        ("Imports", test_imports),
        ("Data Processor", test_data_processor),
        ("Predictor", test_predictor),
        ("API", test_api)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 40)
    print("TEST SUMMARY")
    print("=" * 40)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The system is ready to use.")
        print("\nNext steps:")
        print("1. Train the models: python train_models.py")
        print("2. Use the CLI: python cli.py")
        print("3. Start the API: python api.py")
    else:
        print("⚠️  Some tests failed. Please check the issues above.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
