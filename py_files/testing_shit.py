# predict.py (Updated with Gemini Integration)
import os
import sys
import joblib
import numpy as np
import google.generativeai as genai

# --- Local Model Imports (your existing imports) ---
try:
    from sentence_transformers import SentenceTransformer
    import xgboost as xgb
except ImportError:
    print("ERROR: Make sure sentence-transformers and xgboost are installed.")
    sys.exit(1)

# -------------------------
# --- Configuration ---
# -------------------------
# 1. CONFIGURE GEMINI API
# Load API key from environment variable
try:
    GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
    if not GOOGLE_API_KEY:
        # This will now clearly tell you if the variable wasn't found
        print("❌ ERROR: The GOOGLE_API_KEY environment variable was not found.")
        raise ValueError("GOOGLE_API_KEY environment variable not set.")

    # This print statement helps you verify the key is being loaded
    print(f"🔑 Found API Key. Starts with: '{GOOGLE_API_KEY[:4]}...', ends with: '...{GOOGLE_API_KEY[-4:]}'")

    genai.configure(api_key=GOOGLE_API_KEY)
except Exception as e:
    print(f"❌ Gemini API Error: {e}")
    print("Please make sure you have set your GOOGLE_API_KEY environment variable.")
    sys.exit(1)

# 2. LOCAL MODEL PATHS
CANDIDATE_SKLEARN_MODEL = "models/disease_classifier.pkl"
CANDIDATE_LE = "models/symptom_encoder.pkl"
CANDIDATE_EMBEDDER_DIR = "models/symptom_embedder"
TOP_K = 3 # We'll show top 3 from the local model

# -------------------------
# --- Local Model Loading and Functions ---
# -------------------------
def load_local_models():
    """Loads the XGBoost model, label encoder, and sentence embedder."""
    try:
        model = joblib.load(CANDIDATE_SKLEARN_MODEL)
        label_encoder = joblib.load(CANDIDATE_LE)
        embedder = SentenceTransformer(CANDIDATE_EMBEDDER_DIR)
        print("✅ Local XGBoost models loaded successfully.")
        return model, label_encoder, embedder
    except Exception as e:
        print(f"⚠️ Could not load local models: {e}")
        return None, None, None

def predict_with_local_model(text, model, le, embedder):
    """Generates a prediction using the local XGBoost model."""
    if not all([model, le, embedder]):
        return []
    try:
        embedding = embedder.encode([text], convert_to_numpy=True)
        proba = model.predict_proba(embedding)[0]
        top_indices = np.argsort(proba)[-TOP_K:][::-1]
        predictions = [(le.classes_[i], proba[i]) for i in top_indices]
        return predictions
    except Exception as e:
        print(f"Error during local prediction: {e}")
        return []

# -------------------------
# --- Gemini Functions ---
# -------------------------
def initialize_gemini_chat():
    """Initializes and returns a Gemini chat session with system instructions."""
    # Define safety settings for medical content
    safety_settings = {
        "HARM_CATEGORY_HARASSMENT": "BLOCK_NONE",
        "HARM_CATEGORY_HATE_SPEECH": "BLOCK_NONE",
        "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_NONE",
        "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE",
    }
    
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    # System instruction to guide the model's behavior
    system_instruction = (
        "You are an expert medical diagnostic assistant. Your role is to help a user identify potential diseases based on symptoms. "
        "1. First, provide a differential diagnosis based on the user's initial symptoms. "
        "2. Then, generate concise, targeted follow-up questions to differentiate between the top possibilities. "
        "3. When the user answers, provide an updated, refined diagnosis. "
        "4. Always present possibilities as a ranked list. "
        "5. Conclude every response with a clear disclaimer: 'This is not a medical diagnosis. Consult a healthcare professional for advice.'"
    )
    
    chat = model.start_chat(history=[
        {'role': 'user', 'parts': [system_instruction]},
        {'role': 'model', 'parts': ["Understood. I am ready to assist with medical diagnostics. Please provide the patient's symptoms."]}
    ])
    return chat

# -------------------------
# --- Main Interactive Loop ---
# -------------------------
def interactive_loop():
    print("\n🩺 Dual-Diagnosis Medical Assistant (XGBoost + Gemini)")
    print("="*55)
    
    # Load local models first
    xgb_model, le, embedder = load_local_models()
    
    # Initialize Gemini
    try:
        gemini_chat = initialize_gemini_chat()
    except Exception as e:
        print(f"❌ Failed to initialize Gemini: {e}")
        return

    # Get initial symptoms
    initial_symptoms = input("💬 Please describe the patient's symptoms: ").strip()
    if not initial_symptoms:
        print("No symptoms provided. Exiting.")
        return

    # --- 1. Get Initial Predictions ---
    print("\n" + "-"*20 + " Initial Analysis " + "-"*20)
    
    # Local XGBoost Prediction
    local_preds = predict_with_local_model(initial_symptoms, xgb_model, le, embedder)
    if local_preds:
        print("\n⚡ **Local Model Prediction (XGBoost):**")
        for disease, conf in local_preds:
            print(f"  - {disease} ({conf:.2%})")
            
    # Gemini Prediction
    print("\n🧠 **AI Assistant's Initial Thoughts (Gemini):**")
    try:
        response = gemini_chat.send_message(f"Initial symptoms: {initial_symptoms}")
        print(response.text)
    except Exception as e:
        print(f"❌ Gemini API request failed: {e}")
        return

    # --- 2. Iterative Q&A Loop ---
    print("\n" + "-"*15 + " Follow-up Investigation " + "-"*15)
    while True:
        user_answer = input("\n💬 Your answer (or type 'quit' to exit): ").strip()
        
        if user_answer.lower() in ['q', 'quit', 'exit']:
            print("\n✅ Session ended. Stay healthy!")
            break
            
        if not user_answer:
            continue
            
        print("\n🧠 **AI Assistant's Refined Diagnosis (Gemini):**")
        try:
            response = gemini_chat.send_message(user_answer)
            print(response.text)
        except Exception as e:
            print(f"❌ Gemini API request failed: {e}")
            continue

if __name__ == "__main__":
    interactive_loop()
