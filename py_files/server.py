# server.py
import os
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
from dotenv import load_dotenv # <-- Import the library

# --- Configuration ---
load_dotenv() # <-- Load variables from .env file

try:
    # This will now read the key loaded from the .env file
    genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))
except AttributeError:
    print("\nERROR: Gemini API Key not found in .env file or environment.")
    exit()

# --- Initialize Flask App ---
app = Flask(__name__)
CORS(app) 

# --- Global Variables to hold models ---
local_model = None
embedder = None
label_encoder = None

# --- Helper Functions ---
def load_models():
    """Load the ML model, embedder, and label encoder from disk."""
    global local_model, embedder, label_encoder
    try:
        local_model = joblib.load("models/disease_classifier.pkl")
        embedder = SentenceTransformer("models/symptom_embedder")
        label_encoder = joblib.load("models/label_encoder_huge.joblib")
        print("✅ All models loaded successfully.")
    except Exception as e:
        print(f"❌ Error loading models: {e}")

# --- API Endpoints ---
@app.route('/predict', methods=['POST'])
def predict():
    """Endpoint for the local ML model prediction with enhanced logging."""
    print("\n--- Received request for local model prediction ---")
    if not all([local_model, embedder, label_encoder]):
        print("❌ PREDICT ERROR: One or more models are not loaded.")
        return jsonify({"error": "Models not loaded"}), 500
        
    data = request.get_json()
    symptoms = data.get('symptoms', '')
    if not symptoms:
        print("❌ PREDICT ERROR: No symptoms provided in the request.")
        return jsonify({"error": "Symptoms not provided"}), 400

    print(f"🔍 Symptoms received: '{symptoms}'")
    
    try:
        print("1. Encoding symptoms into embedding...")
        embedding = embedder.encode([symptoms], convert_to_numpy=True)
        print(f"   - Embedding created with shape: {embedding.shape}")

        print("2. Getting probability predictions from the model...")
        proba = local_model.predict_proba(embedding)[0]
        print(f"   - Probabilities received. Shape: {proba.shape}")
        
        print("3. Identifying top 3 predictions...")
        top_indices = np.argsort(proba)[-3:][::-1]
        
        predictions = [{"disease": label_encoder.classes_[i], "confidence": float(proba[i])} for i in top_indices]
        print(f"✅ Top 3 predictions generated: {predictions}")
        
        return jsonify(predictions)
    except Exception as e:
        print(f"❌ PREDICT ERROR: An exception occurred during prediction: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    """Endpoint for the conversational Gemini AI. Now stateless."""
    data = request.get_json()
    history = data.get('history', [])
    
    if not history:
        return jsonify({"error": "Chat history not provided"}), 400
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # This is the correct way to handle a stateless, multi-turn chat
        # by sending the entire history to the model at once.
        response = model.generate_content(history)
        
        return jsonify({"reply": response.text})
    except Exception as e:
        # This improved logging will show the specific error from the API
        print(f"❌ An error occurred while calling the Gemini API: {e}") 
        return jsonify({"error": f"Gemini API request failed: {str(e)}"}), 500

# --- Main Execution ---
if __name__ == '__main__':
    load_models()
    app.run(host='0.0.0.0', port=5000)
