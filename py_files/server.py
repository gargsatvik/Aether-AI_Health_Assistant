# server.py
import os
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
import google.generativeai as genai

# --- Configuration ---
# Set your Gemini API key as an environment variable
# export GEMINI_API_KEY="YOUR_API_KEY"
try:
    GOOGLE_API_KEY = "AIzaSyCtHrqkezyDKxg5l3MiU4CpnrMeVd2XOfk"
    if not GOOGLE_API_KEY:
        # This will now clearly tell you if the variable wasn't found
        print("❌ ERROR: The GOOGLE_API_KEY environment variable was not found.")
        raise ValueError("GOOGLE_API_KEY environment variable not set.")

    # This print statement helps you verify the key is being loaded
    print(f"🔑 Found API Key. Starts with: '{GOOGLE_API_KEY[:4]}...', ends with: '...{GOOGLE_API_KEY[-4:]}'")

    genai.configure(api_key=GOOGLE_API_KEY)
except AttributeError:
    print("\nERROR: Gemini API Key not found.")
    print("Please set the GEMINI_API_KEY environment variable.\n")
    exit()

# --- Initialize Flask App ---
app = Flask(__name__)
CORS(app) # Enable Cross-Origin Resource Sharing

# --- Global Variables to hold models ---
local_model = None
embedder = None
gemini_chat_sessions = {} # Store chat sessions by a unique ID

# --- Helper Functions ---
def load_models():
    """Load the ML model and embedder from disk into memory."""
    global local_model, embedder
    try:
        model_path = "models/disease_classifier.pkl"
        embedder_path = "models/symptom_embedder"
        
        if os.path.exists(model_path):
            local_model = joblib.load(model_path)
            print("✅ Classifier loaded successfully.")
        else:
            print(f"⚠️ Model not found at {model_path}")

        if os.path.exists(embedder_path):
            embedder = SentenceTransformer(embedder_path)
            print("✅ Sentence embedder loaded successfully.")
        else:
            print(f"⚠️ Embedder not found at {embedder_path}")

    except Exception as e:
        print(f"❌ Error loading models: {e}")

def get_gemini_chat(session_id):
    """Initializes or retrieves a Gemini chat session."""
    if session_id not in gemini_chat_sessions:
        model = genai.GenerativeModel('gemini-1.5-flash')
        system_instruction = (
            "You are an expert medical diagnostic assistant. Your role is to help a user identify potential diseases based on symptoms. "
            "1. First, provide a differential diagnosis based on the user's initial symptoms. "
            "2. Then, generate concise, targeted follow-up questions to differentiate between the top possibilities. "
            "3. When the user answers, provide an updated, refined diagnosis. "
            "4. Always present possibilities as a ranked list. "
            "5. Format your responses using simple Markdown. Use bolding for disease names and bullet points for lists. "
            "6. Conclude every response with a clear disclaimer: '*This is not a medical diagnosis. Consult a healthcare professional for advice.*'"
        )
        gemini_chat_sessions[session_id] = model.start_chat(history=[
            {'role': 'user', 'parts': [system_instruction]},
            {'role': 'model', 'parts': ["Understood. I am ready to assist. Please provide the patient's symptoms."]}
        ])
    return gemini_chat_sessions[session_id]

# --- API Endpoints ---
@app.route('/predict', methods=['POST'])
def predict():
    """Endpoint for the local ML model prediction."""
    if not local_model or not embedder:
        return jsonify({"error": "Models not loaded"}), 500
        
    data = request.get_json()
    symptoms = data.get('symptoms', '')
    if not symptoms:
        return jsonify({"error": "Symptoms not provided"}), 400

    try:
        embedding = embedder.encode([symptoms], convert_to_numpy=True)
        proba = local_model.predict_proba(embedding)[0]
        classes = local_model.classes_
        
        top_indices = np.argsort(proba)[-3:][::-1] # Top 3
        predictions = [{"disease": classes[i], "confidence": float(proba[i])} for i in top_indices]
        
        return jsonify(predictions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# In server.py, replace the old /chat function

@app.route('/chat', methods=['POST'])
def chat():
    """Endpoint for the conversational Gemini AI."""
    data = request.get_json()
    message = data.get('message', '')
    session_id = data.get('session_id', 'default_session')
    
    if not message:
        return jsonify({"error": "Message not provided"}), 400
        
    try:
        chat_session = get_gemini_chat(session_id)
        response = chat_session.send_message(message)
        return jsonify({"reply": response.text})
    except Exception as e:
        # --- IMPROVED ERROR LOGGING ---
        # This will print the detailed error from Google to your backend terminal
        print(f"❌ An error occurred while calling the Gemini API: {e}") 
        
        # This sends a more descriptive error back to the frontend
        return jsonify({"error": f"Gemini API request failed: {str(e)}"}), 500

# --- Main Execution ---
if __name__ == '__main__':
    load_models()
    app.run(host='0.0.0.0', port=5000)
