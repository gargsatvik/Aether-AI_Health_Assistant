#!/usr/bin/env python3
"""
Command-line interface for the Health App disease prediction system.
Provides an interactive way to get disease predictions based on symptoms.
"""

import sys
import os
from pathlib import Path
import logging
from typing import List, Dict

# Add current directory to path for imports
sys.path.append(str(Path(__file__).parent))

from predictor import DiseasePredictor

# Set up logging
logging.basicConfig(level=logging.WARNING)  # Reduce logging noise in CLI
logger = logging.getLogger(__name__)

class HealthAppCLI:
    """Command-line interface for the Health App."""
    
    def __init__(self):
        self.predictor = DiseasePredictor()
        self.is_model_loaded = False
        
    def load_model(self) -> bool:
        """Load the trained model."""
        print("Loading disease prediction model...")
        success = self.predictor.load_model()
        
        if success:
            self.is_model_loaded = True
            model_info = self.predictor.get_model_info()
            print(f"✅ Model loaded successfully!")
            print(f"   Model type: {model_info.get('model_type', 'Unknown')}")
            print(f"   Total symptoms: {model_info.get('total_symptoms', 0)}")
            print(f"   Total diseases: {model_info.get('total_diseases', 0)}")
            return True
        else:
            print("❌ Failed to load model.")
            print("   Please ensure you have trained the model first by running:")
            print("   python train_models.py")
            return False
    
    def get_symptom_input(self) -> List[str]:
        """Get symptoms input from user."""
        print("\n" + "="*50)
        print("SYMPTOM INPUT")
        print("="*50)
        print("Enter your symptoms separated by commas.")
        print("Examples: fever, headache, fatigue")
        print("Type 'help' for available symptoms, 'quit' to exit")
        print("-" * 50)
        
        while True:
            try:
                user_input = input("\nEnter symptoms: ").strip()
                
                if user_input.lower() == 'quit':
                    return []
                elif user_input.lower() == 'help':
                    self.show_available_symptoms()
                    continue
                elif not user_input:
                    print("Please enter at least one symptom.")
                    continue
                
                # Parse symptoms
                symptoms = [s.strip() for s in user_input.split(",") if s.strip()]
                
                if not symptoms:
                    print("Please enter at least one valid symptom.")
                    continue
                
                return symptoms
                
            except KeyboardInterrupt:
                print("\n\nExiting...")
                return []
            except Exception as e:
                print(f"Error processing input: {e}")
                continue
    
    def show_available_symptoms(self):
        """Show available symptoms to help users."""
        symptoms = self.predictor.get_available_symptoms()
        
        if not symptoms:
            print("No symptoms available.")
            return
        
        print(f"\nAvailable symptoms ({len(symptoms)} total):")
        print("-" * 40)
        
        # Group symptoms by first letter for better readability
        symptoms_by_letter = {}
        for symptom in symptoms:
            first_letter = symptom[0].upper() if symptom else '?'
            if first_letter not in symptoms_by_letter:
                symptoms_by_letter[first_letter] = []
            symptoms_by_letter[first_letter].append(symptom)
        
        # Display grouped symptoms
        for letter in sorted(symptoms_by_letter.keys()):
            print(f"\n{letter}:")
            symptoms_list = symptoms_by_letter[letter]
            for i, symptom in enumerate(symptoms_list):
                if i > 0 and i % 3 == 0:
                    print()  # New line every 3 symptoms
                print(f"  {symptom:<20}", end="")
            print()  # Final new line
    
    def display_predictions(self, result: Dict):
        """Display prediction results in a user-friendly format."""
        if "error" in result:
            print(f"\n❌ Error: {result['error']}")
            if "suggestions" in result:
                print("\nSuggestions:")
                for suggestion in result["suggestions"]:
                    print(f"   • {suggestion}")
            return
        
        print("\n" + "="*50)
        print("DISEASE PREDICTIONS")
        print("="*50)
        
        # Display valid symptoms
        if result.get("valid_symptoms"):
            print(f"✅ Analyzed symptoms: {', '.join(result['valid_symptoms'])}")
        
        # Display invalid symptoms
        if result.get("invalid_symptoms"):
            print(f"⚠️  Unrecognized symptoms: {', '.join(result['invalid_symptoms'])}")
            print("   These symptoms were not used in the prediction.")
        
        print(f"\n📊 Total symptoms analyzed: {result.get('total_symptoms_analyzed', 0)}")
        print("-" * 50)
        
        # Display predictions
        predictions = result.get("predictions", [])
        if predictions:
            print("\n🏥 TOP DISEASE PREDICTIONS:")
            for i, pred in enumerate(predictions, 1):
                disease = pred["disease"]
                probability = pred["probability"]
                confidence = pred["confidence"]
                
                # Create confidence indicator
                confidence_icons = {
                    "very high": "🔴",
                    "high": "🟠", 
                    "medium": "🟡",
                    "low": "🟢",
                    "very low": "🔵"
                }
                confidence_icon = confidence_icons.get(confidence, "⚪")
                
                print(f"\n{i}. {disease}")
                print(f"   Probability: {probability}%")
                print(f"   Confidence: {confidence_icon} {confidence}")
        else:
            print("\n❌ No predictions available.")
    
    def show_menu(self):
        """Show the main menu."""
        print("\n" + "="*50)
        print("HEALTH APP - DISEASE PREDICTION")
        print("="*50)
        print("1. Get disease prediction")
        print("2. View available symptoms")
        print("3. Model information")
        print("4. Quit")
        print("-" * 50)
    
    def run(self):
        """Run the main CLI loop."""
        print("🏥 Welcome to Health App - Disease Prediction System!")
        print("Loading model...")
        
        # Load the model
        if not self.load_model():
            return
        
        # Main menu loop
        while True:
            try:
                self.show_menu()
                choice = input("\nSelect an option (1-4): ").strip()
                
                if choice == '1':
                    # Get disease prediction
                    symptoms = self.get_symptom_input()
                    if symptoms:
                        print(f"\nAnalyzing symptoms: {', '.join(symptoms)}")
                        result = self.predictor.predict_disease(symptoms)
                        self.display_predictions(result)
                        
                        # Ask if user wants to try another prediction
                        another = input("\nTry another prediction? (y/n): ").strip().lower()
                        if another not in ['y', 'yes']:
                            break
                
                elif choice == '2':
                    # View available symptoms
                    self.show_available_symptoms()
                    input("\nPress Enter to continue...")
                
                elif choice == '3':
                    # Show model information
                    model_info = self.predictor.get_model_info()
                    print("\n" + "="*50)
                    print("MODEL INFORMATION")
                    print("="*50)
                    print(f"Model type: {model_info.get('model_type', 'Unknown')}")
                    print(f"Total symptoms: {model_info.get('total_symptoms', 0)}")
                    print(f"Total diseases: {model_info.get('total_diseases', 0)}")
                    print(f"Feature scaling: {'Yes' if model_info.get('has_scaler') else 'No'}")
                    print("="*50)
                    input("\nPress Enter to continue...")
                
                elif choice == '4':
                    print("\n👋 Thank you for using Health App!")
                    break
                
                else:
                    print("❌ Invalid choice. Please select 1-4.")
                
            except KeyboardInterrupt:
                print("\n\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"\n❌ An error occurred: {e}")
                print("Please try again or contact support.")
                continue

def main():
    """Main entry point."""
    try:
        cli = HealthAppCLI()
        cli.run()
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
