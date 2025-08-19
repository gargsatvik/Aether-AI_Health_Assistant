from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import logging
import uvicorn
from predictor import DiseasePredictor
import os

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Health App - Disease Prediction API",
    description="A machine learning API for predicting diseases based on symptoms",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize predictor
predictor = DiseasePredictor()

# Pydantic models for request/response
class SymptomRequest(BaseModel):
    symptoms: List[str]
    top_n: Optional[int] = 3

class PredictionResponse(BaseModel):
    predictions: List[Dict]
    valid_symptoms: List[str]
    invalid_symptoms: List[str]
    total_symptoms_analyzed: int

class ErrorResponse(BaseModel):
    error: str
    details: Optional[str] = None

class ModelInfoResponse(BaseModel):
    model_type: str
    is_loaded: bool
    total_symptoms: int
    total_diseases: Optional[int]
    has_scaler: bool

@app.on_event("startup")
async def startup_event():
    """Load the model when the application starts."""
    try:
        success = predictor.load_model()
        if success:
            logger.info("Model loaded successfully on startup")
        else:
            logger.warning("Failed to load model on startup")
    except Exception as e:
        logger.error(f"Error during startup: {e}")

@app.get("/", tags=["Health Check"])
async def root():
    """Health check endpoint."""
    return {
        "message": "Health App - Disease Prediction API is running",
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/health", tags=["Health Check"])
async def health_check():
    """Detailed health check endpoint."""
    model_info = predictor.get_model_info()
    
    return {
        "status": "healthy",
        "model_loaded": model_info.get("is_loaded", False),
        "total_symptoms": model_info.get("total_symptoms", 0),
        "total_diseases": model_info.get("total_diseases", 0)
    }

@app.get("/model/info", response_model=ModelInfoResponse, tags=["Model"])
async def get_model_info():
    """Get information about the loaded model."""
    try:
        info = predictor.get_model_info()
        if "error" in info:
            raise HTTPException(status_code=500, detail=info["error"])
        return info
    except Exception as e:
        logger.error(f"Error getting model info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/symptoms", tags=["Symptoms"])
async def get_available_symptoms():
    """Get list of all available symptoms."""
    try:
        symptoms = predictor.get_available_symptoms()
        return {
            "symptoms": symptoms,
            "total_count": len(symptoms)
        }
    except Exception as e:
        logger.error(f"Error getting symptoms: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/symptoms/weights", tags=["Symptoms"])
async def get_symptom_weights():
    """Get symptom weights dictionary."""
    try:
        weights = predictor.get_symptom_weights()
        return {
            "symptom_weights": weights,
            "total_count": len(weights)
        }
    except Exception as e:
        logger.error(f"Error getting symptom weights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
async def predict_disease(request: SymptomRequest):
    """Predict diseases based on reported symptoms."""
    try:
        if not request.symptoms:
            raise HTTPException(status_code=400, detail="No symptoms provided")
        
        if request.top_n < 1 or request.top_n > 10:
            raise HTTPException(status_code=400, detail="top_n must be between 1 and 10")
        
        # Make prediction
        result = predictor.predict_disease(request.symptoms, request.top_n)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.get("/predict", tags=["Prediction"])
async def predict_disease_get(
    symptoms: str = Query(..., description="Comma-separated list of symptoms"),
    top_n: int = Query(3, ge=1, le=10, description="Number of top predictions to return")
):
    """Predict diseases based on symptoms (GET endpoint for simple queries)."""
    try:
        # Parse comma-separated symptoms
        symptom_list = [s.strip() for s in symptoms.split(",") if s.strip()]
        
        if not symptom_list:
            raise HTTPException(status_code=400, detail="No valid symptoms provided")
        
        # Make prediction
        result = predictor.predict_disease(symptom_list, top_n)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.get("/symptoms/search", tags=["Symptoms"])
async def search_symptoms(
    query: str = Query(..., description="Symptom search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results")
):
    """Search for symptoms by name."""
    try:
        from difflib import get_close_matches
        
        all_symptoms = predictor.get_available_symptoms()
        if not all_symptoms:
            return {"symptoms": [], "total_count": 0}
        
        # Find close matches
        matches = get_close_matches(query.lower(), [s.lower() for s in all_symptoms], n=limit, cutoff=0.3)
        
        # Get original symptom names with weights
        weights = predictor.get_symptom_weights()
        results = []
        
        for match in matches:
            # Find original symptom name
            original_name = next((s for s in all_symptoms if s.lower() == match), match)
            weight = weights.get(original_name, 0)
            results.append({
                "symptom": original_name,
                "weight": weight,
                "relevance_score": 1.0  # Could be enhanced with actual similarity scores
            })
        
        return {
            "symptoms": results,
            "total_count": len(results),
            "query": query
        }
        
    except Exception as e:
        logger.error(f"Error searching symptoms: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Check if model exists before starting
    if not os.path.exists("models/best_model.pkl"):
        logger.warning("No trained model found. Please train the model first.")
        logger.info("You can train the model by running: python train_models.py")
    
    # Start the server
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
