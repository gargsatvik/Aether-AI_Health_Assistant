import os
import joblib
import torch
from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import google.generativeai as genai
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
import datetime
import json
from huggingface_hub import hf_hub_download

# --- App and Environment Initialization ---
app = Flask(__name__)
CORS(app)
load_dotenv()

# --- Firebase Initialization ---
try:
    service_account_str = os.getenv("FIREBASE_SERVICE_ACCOUNT")
    if service_account_str:
        service_account_info = json.loads(service_account_str)
        cred = credentials.Certificate(service_account_info)
    else:
        cred = credentials.Certificate("firebase_key.json")
    
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    print("✅ Firebase initialized successfully.")
except Exception as e:
    print(f"❌ Firebase initialization failed: {e}")
    db = None

# --- Gemini API Configuration ---
try:
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    print("✨ Gemini API configured.")
except Exception as e:
    print(f"❌ Gemini configuration failed: {e}")

# --- MODEL LOADING LOGIC (MODIFIED) ---
# Initialize model variables to None. They will be loaded on the first request.
local_model = None
tokenizer = None
label_encoder = None
device = "cuda" if torch.cuda.is_available() else "cpu"
repo_id = "gargsatvik31/health-ai-classifier"

def load_models():
    """
    This function loads the models from Hugging Face and will be called only once.
    """
    # Use 'global' to modify the variables defined outside this function
    global local_model, tokenizer, label_encoder
    
    print(f"📂 First request received. Loading models from Hugging Face Hub: {repo_id}...")
    try:
        local_model = AutoModelForSequenceClassification.from_pretrained(repo_id)
        tokenizer = AutoTokenizer.from_pretrained(repo_id)
        
        label_encoder_path = hf_hub_download(repo_id=repo_id, filename="label_encoder.joblib")
        label_encoder = joblib.load(label_encoder_path)
        
        local_model.to(device)
        local_model.eval()
        print("✅ Models and label encoder loaded and ready.")
    except Exception as e:
        print(f"❌ Error loading models from Hugging Face Hub: {e}")

# --- API ENDPOINTS ---

@app.route('/predict', methods=['POST'])
def predict():
    global local_model, tokenizer, label_encoder
    
    # --- ON-DEMAND LOADING CHECK ---
    # Check if the models are loaded. If not, call the load function.
    if local_model is None or tokenizer is None or label_encoder is None:
        load_models()

    # If loading still fails, return an error
    if not all([local_model, tokenizer, label_encoder]):
        return jsonify({"error": "Model could not be loaded. Please try again in a moment."}), 503

    data = request.get_json()
    symptoms = data.get('symptoms', '')
    if not symptoms:
        return jsonify({"error": "Symptoms not provided."}), 400

    try:
        inputs = tokenizer(symptoms, return_tensors="pt", truncation=True, padding=True).to(device)
        with torch.no_grad():
            outputs = local_model(**inputs)
        
        probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)
        top_probs, top_indices = torch.topk(probabilities, 3)
        
        top_indices_np = top_indices.cpu().numpy()[0]
        top_probs_np = top_probs.cpu().numpy()[0]

        predictions = [
            {"disease": label_encoder.classes_[idx], "confidence": float(prob)}
            for idx, prob in zip(top_indices_np, top_probs_np)
        ]
        return jsonify(predictions)
    except Exception as e:
        print(f"❌ Local prediction error: {e}")
        return jsonify({"error": "Failed to get local prediction."}), 500

# (Your other routes remain the same)
@app.route('/chat', methods=['POST'])
def chat():
    # ... your chat logic ...
    return jsonify({"reply": "This is a placeholder reply."})
# ... etc.

