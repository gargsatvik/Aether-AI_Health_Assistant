# py_files/server.py
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

# ==============================================================================
# --- INITIALIZATION ---
# ==============================================================================

# --- 1. Initialize Flask App ---
app = Flask(__name__)
CORS(app) # Allow requests from your React frontend

# --- 2. Load Environment Variables ---
load_dotenv()
print("🔑 Loading environment variables...")

# --- 3. Initialize Firebase Admin SDK ---
try:
    cred = credentials.Certificate("firebase_key.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("🔥 Firebase initialized successfully.")
except Exception as e:
    print(f"❌ Firebase initialization failed: {e}")
    db = None

# --- 4. Configure Gemini API ---
try:
    gemini_api_key = os.getenv("GOOGLE_API_KEY")
    if not gemini_api_key:
        raise ValueError("GOOGLE_API_KEY not found in .env file.")
    genai.configure(api_key=gemini_api_key)
    print("✨ Gemini API configured.")
except Exception as e:
    print(f"❌ Gemini configuration failed: {e}")

# --- 5. Load Fine-Tuned Local Model ---
local_model = None
tokenizer = None
label_encoder = None
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"💪 Using device: {device.upper()} for local model.")

def load_local_models():
    """Loads the fine-tuned model, tokenizer, and label encoder."""
    global local_model, tokenizer, label_encoder
    model_path = "models/finetuned_model"
    le_path = "models/label_encoder.joblib"
    
    print(f"📂 Attempting to load local models...")
    try:
        if os.path.exists(model_path) and os.path.exists(le_path):
            local_model = AutoModelForSequenceClassification.from_pretrained(model_path)
            tokenizer = AutoTokenizer.from_pretrained(model_path)
            label_encoder = joblib.load(le_path)
            
            local_model.to(device)
            local_model.eval()
            print("✅ Fine-tuned model, tokenizer, and label encoder loaded.")
        else:
            print(f"⚠️  Local model files not found. Please check paths exist: '{model_path}', '{le_path}'")
    except Exception as e:
        print(f"❌ Error loading local models: {e}")

# ==============================================================================
# --- API ENDPOINTS ---
# ==============================================================================

@app.route('/predict', methods=['POST'])
def predict():
    """Endpoint for the initial 'quick scan' using the local fine-tuned model."""
    if not all([local_model, tokenizer, label_encoder]):
        return jsonify({"error": "Local model is not available."}), 500

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
        
        top_indices = top_indices.cpu().numpy()[0]
        top_probs = top_probs.cpu().numpy()[0]

        predictions = [
            {"disease": label_encoder.classes_[idx], "confidence": float(prob)}
            for idx, prob in zip(top_indices, top_probs)
        ]
        return jsonify(predictions)
    except Exception as e:
        print(f"❌ Local prediction error: {e}")
        return jsonify({"error": "Failed to get local prediction."}), 500

@app.route('/chat', methods=['POST'])
def chat():
    """Endpoint for the main conversational diagnosis, enhanced by Gemini."""
    data = request.get_json()
    history = data.get('history', [])
    local_preds = data.get('local_predictions', [])
    location = data.get('location', 'an unknown location')
    
    if not history:
        return jsonify({"error": "Chat history not provided."}), 400

    try:
        # Construct the context-aware prompt for Gemini
        # This happens only on the first turn of the conversation from the user
        if len(history) == 2: # [System Intro, First User Symptom]
            symptoms = history[1]['parts'][0]
            local_pred_text = ", ".join([p['disease'] for p in local_preds]) if local_preds else "No strong predictions"
            
            # This is the crucial prompt that prioritizes your model
            enhanced_prompt = (
                f"My specialized local model analyzed the user's symptoms and provided the following top predictions: **{local_pred_text}**. "
                f"The user is located in **{location}**. "
                f"Based on this context and the user's symptoms described as '{symptoms}', please provide a detailed differential diagnosis. "
                "Explain why these conditions are possibilities and ask targeted follow-up questions to help narrow down the diagnosis. "
                "Always conclude with a clear medical disclaimer."
            )
            history[1]['parts'][0] = enhanced_prompt # Replace the simple symptoms with our enhanced prompt

        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(history)
        return jsonify({"reply": response.text})
    except Exception as e:
        print(f"❌ Gemini API error: {e}")
        return jsonify({"error": f"Gemini API request failed: {e}"}), 500

@app.route('/get_chats', methods=['POST'])
def get_chats():
    """Endpoint to retrieve all chat histories for a specific user."""
    if not db: return jsonify({"error": "Firestore is not initialized."}), 500
    data = request.get_json(); user_id = data.get('userId')
    if not user_id: return jsonify({"error": "User ID not provided."}), 400

    try:
        chats_ref = db.collection('users').document(user_id).collection('chats')
        query = chats_ref.order_by("timestamp", direction=firestore.Query.DESCENDING)
        chats = [doc.to_dict() for doc in query.stream()]
        return jsonify(chats)
    except Exception as e:
        print(f"❌ Firestore get_chats error: {e}")
        return jsonify({"error": f"Failed to retrieve chats: {e}"}), 500

@app.route('/save_chat', methods=['POST'])
def save_chat():
    """Endpoint to save a chat history for a specific user."""
    if not db: return jsonify({"error": "Firestore is not initialized."}), 500
    data = request.get_json(); user_id = data.get('userId'); chat_data = data.get('chatData')
    if not user_id or not chat_data or not chat_data.get('id'):
        return jsonify({"error": "User ID or chat data is missing."}), 400

    try:
        # Ensure timestamp is a proper datetime object for Firestore ordering
        chat_data['timestamp'] = datetime.datetime.fromisoformat(chat_data['timestamp'])
        chat_ref = db.collection('users').document(user_id).collection('chats').document(chat_data['id'])
        chat_ref.set(chat_data)
        return jsonify({"success": True})
    except Exception as e:
        print(f"❌ Firestore save_chat error: {e}")
        return jsonify({"error": f"Failed to save chat: {e}"}), 500

# ==============================================================================
# --- MAIN EXECUTION ---
# ==============================================================================
if __name__ == '__main__':
    load_local_models()
    app.run(host='0.0.0.0', port=5000)

