import pandas as pd
import numpy as np
import joblib
import logging
from typing import List, Dict, Tuple, Optional
from difflib import get_close_matches
import os

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DiseasePredictor:
    """Handles disease predictions based on user-reported symptoms."""
    
    def __init__(self, models_dir: str = "models"):
        self.models_dir = models_dir
        self.model = None
        self.scaler = None
        self.feature_names = []
        self.all_symptoms = []
        self.symptom_weights = {}
        self.is_loaded = False
        
    def load_model(self) -> bool:
        """Load the trained model and related components."""
        try:
            # Load the best model
            best_model_path = os.path.join(self.models_dir, "best_model.pkl")
            if not os.path.exists(best_model_path):
                logger.error("Best model not found. Please train the model first.")
                return False
            
            self.model = joblib.load(best_model_path)
            logger.info("Loaded disease prediction model")
            
            # Load the scaler
            scaler_path = os.path.join(self.models_dir, "scaler.pkl")
            if os.path.exists(scaler_path):
                self.scaler = joblib.load(scaler_path)
                logger.info("Loaded feature scaler")
            
            # Load symptom information
            self._load_symptom_info()
            
            self.is_loaded = True
            logger.info("Disease predictor loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return False
    
    def _load_symptom_info(self):
        """Load symptom information from the model metadata."""
        try:
            # Try to load feature names from model metadata
            metadata_path = os.path.join(self.models_dir, "model_metadata.pkl")
            if os.path.exists(metadata_path):
                metadata = joblib.load(metadata_path)
                if 'feature_names' in metadata and metadata['feature_names']:
                    self.all_symptoms = metadata['feature_names']
                    logger.info(f"Loaded {len(self.all_symptoms)} symptoms from model metadata")
                    
                    # Also load symptom weights for validation
                    symptom_file = os.path.join("data", "Symptom-severity.csv")
                    if os.path.exists(symptom_file):
                        weights_df = pd.read_csv(symptom_file)
                        weights_df["Symptom"] = (
                            weights_df["Symptom"].str.strip().str.lower().str.replace("_", " ")
                        )
                        self.symptom_weights = dict(zip(weights_df["Symptom"], weights_df["weight"]))
                        logger.info(f"Loaded symptom weights for validation")
                else:
                    logger.warning("No feature names in model metadata. Using symptom severity file.")
                    self._load_symptoms_from_file()
            else:
                logger.warning("No model metadata found. Using symptom severity file.")
                self._load_symptoms_from_file()
                
        except Exception as e:
            logger.error(f"Error loading symptom info: {e}")
            self._load_symptoms_from_file()
    
    def _load_symptoms_from_file(self):
        """Load symptom information from the symptom severity file."""
        try:
            symptom_file = os.path.join("data", "Symptom-severity.csv")
            if os.path.exists(symptom_file):
                weights_df = pd.read_csv(symptom_file)
                weights_df["Symptom"] = (
                    weights_df["Symptom"].str.strip().str.lower().str.replace("_", " ")
                )
                self.symptom_weights = dict(zip(weights_df["Symptom"], weights_df["weight"]))
                self.all_symptoms = list(self.symptom_weights.keys())
                logger.info(f"Loaded {len(self.all_symptoms)} symptoms with weights from file")
            else:
                logger.warning("Symptom severity file not found. Using empty symptom list.")
                self.all_symptoms = []
                self.symptom_weights = {}
        except Exception as e:
            logger.error(f"Error loading symptoms from file: {e}")
            self.all_symptoms = []
            self.symptom_weights = {}
    
    def validate_symptoms(self, symptoms: List[str]) -> Tuple[List[str], List[str]]:
        """Validate and normalize user-reported symptoms."""
        try:
            valid_symptoms = []
            invalid_symptoms = []
            
            for symptom in symptoms:
                symptom = symptom.strip().lower()
                if not symptom:
                    continue
                
                # Try to find a close match
                if self.all_symptoms:
                    match = get_close_matches(symptom, self.all_symptoms, n=1, cutoff=0.6)
                    if match:
                        valid_symptoms.append(match[0])
                    else:
                        invalid_symptoms.append(symptom)
                else:
                    # If no symptom list available, accept all
                    valid_symptoms.append(symptom)
            
            # Remove duplicates while preserving order
            valid_symptoms = list(dict.fromkeys(valid_symptoms))
            
            logger.info(f"Validated symptoms: {len(valid_symptoms)} valid, {len(invalid_symptoms)} invalid")
            return valid_symptoms, invalid_symptoms
            
        except Exception as e:
            logger.error(f"Error validating symptoms: {e}")
            return [], symptoms
    
    def prepare_symptom_vector(self, symptoms: List[str]) -> np.ndarray:
        """Convert symptoms list to feature vector for prediction."""
        try:
            if not self.all_symptoms:
                logger.warning("No symptom list available. Cannot prepare feature vector.")
                return np.array([])
            
            # Create binary vector
            symptom_vector = np.zeros(len(self.all_symptoms))
            
            for symptom in symptoms:
                if symptom in self.all_symptoms:
                    idx = self.all_symptoms.index(symptom)
                    # Apply weight if available
                    weight = self.symptom_weights.get(symptom, 1.0)
                    symptom_vector[idx] = weight
            
            # Reshape for single prediction
            symptom_vector = symptom_vector.reshape(1, -1)
            
            # Scale if scaler is available
            if self.scaler is not None:
                symptom_vector = self.scaler.transform(symptom_vector)
            
            return symptom_vector
            
        except Exception as e:
            logger.error(f"Error preparing symptom vector: {e}")
            return np.array([])
    
    def predict_disease(self, symptoms: List[str], top_n: int = 3) -> Dict:
        """Predict diseases based on reported symptoms."""
        try:
            if not self.is_loaded:
                return {"error": "Model not loaded. Please load the model first."}
            
            if not symptoms:
                return {"error": "No symptoms provided."}
            
            # Validate symptoms
            valid_symptoms, invalid_symptoms = self.validate_symptoms(symptoms)
            
            if not valid_symptoms:
                return {
                    "error": "No valid symptoms found.",
                    "invalid_symptoms": invalid_symptoms,
                    "suggestions": self._get_symptom_suggestions(invalid_symptoms)
                }
            
            # Prepare feature vector
            symptom_vector = self.prepare_symptom_vector(valid_symptoms)
            
            if symptom_vector.size == 0:
                return {"error": "Failed to prepare symptom vector."}
            
            # Make prediction
            if hasattr(self.model, 'predict_proba'):
                probabilities = self.model.predict_proba(symptom_vector)[0]
                top_indices = probabilities.argsort()[-top_n:][::-1]
                
                predictions = []
                for idx in top_indices:
                    disease = self.model.classes_[idx]
                    probability = round(probabilities[idx] * 100, 2)
                    predictions.append({
                        "disease": disease,
                        "probability": probability,
                        "confidence": self._get_confidence_level(probability)
                    })
            else:
                # For models without predict_proba
                prediction = self.model.predict(symptom_vector)[0]
                predictions = [{
                    "disease": prediction,
                    "probability": 100.0,
                    "confidence": "high"
                }]
            
            return {
                "predictions": predictions,
                "valid_symptoms": valid_symptoms,
                "invalid_symptoms": invalid_symptoms,
                "total_symptoms_analyzed": len(valid_symptoms)
            }
            
        except Exception as e:
            logger.error(f"Error in disease prediction: {e}")
            return {"error": f"Prediction failed: {str(e)}"}
    
    def _get_confidence_level(self, probability: float) -> str:
        """Convert probability to confidence level."""
        if probability >= 80:
            return "very high"
        elif probability >= 60:
            return "high"
        elif probability >= 40:
            return "medium"
        elif probability >= 20:
            return "low"
        else:
            return "very low"
    
    def _get_symptom_suggestions(self, invalid_symptoms: List[str]) -> List[str]:
        """Get suggestions for invalid symptoms."""
        suggestions = []
        
        for symptom in invalid_symptoms:
            if self.all_symptoms:
                # Find similar symptoms
                similar = get_close_matches(symptom, self.all_symptoms, n=3, cutoff=0.4)
                if similar:
                    suggestions.append(f"'{symptom}' might be: {', '.join(similar)}")
                else:
                    suggestions.append(f"'{symptom}' not recognized. Please check spelling.")
            else:
                suggestions.append(f"'{symptom}' not recognized.")
        
        return suggestions
    
    def get_available_symptoms(self) -> List[str]:
        """Get list of all available symptoms."""
        return self.all_symptoms.copy()
    
    def get_symptom_weights(self) -> Dict[str, float]:
        """Get symptom weights dictionary."""
        return self.symptom_weights.copy()
    
    def get_model_info(self) -> Dict:
        """Get information about the loaded model."""
        if not self.is_loaded:
            return {"error": "Model not loaded"}
        
        info = {
            "model_type": type(self.model).__name__,
            "is_loaded": self.is_loaded,
            "total_symptoms": len(self.all_symptoms),
            "has_scaler": self.scaler is not None
        }
        
        if hasattr(self.model, 'classes_'):
            info["total_diseases"] = len(self.model.classes_)
            info["disease_classes"] = self.model.classes_.tolist()
        
        return info
