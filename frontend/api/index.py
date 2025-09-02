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

# --- INITIALIZATION ---
app = Flask(__name__)
CORS(app)  # Allow requests from your React frontend

load_dotenv()
print("🔑 Loading environment variables...")

# --- Initialize Firebase Admin SDK ---
try:
    # Ensure you have your 'firebase_key.json' in the same directory
    cred = credentials.Certificate("firebase_key.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("🔥 Firebase initialized successfully.")
except Exception as e:
    print(f"❌ Firebase initialization failed: {e}")
    db = None

# --- Configure Gemini API ---
try:
    gemini_api_key = os.getenv("GOOGLE_API_KEY")
    if not gemini_api_key:
        raise ValueError("GOOGLE_API_KEY not found in .env file.")
    genai.configure(api_key=gemini_api_key)
    print("✨ Gemini API configured.")
except Exception as e:
    print(f"❌ Gemini configuration failed: {e}")

# --- Load Fine-Tuned Local Model ---
local_model, tokenizer, label_encoder = None, None, None
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"💪 Using device: {device.upper()} for local model.")

def load_local_models():
    global local_model, tokenizer, label_encoder
    model_path = "models/finetuned_model"
    le_path = "models/label_encoder.joblib"
    
    print("📂 Attempting to load local models...")
    try:
        if os.path.exists(model_path) and os.path.exists(le_path):
            local_model = AutoModelForSequenceClassification.from_pretrained(model_path)
            tokenizer = AutoTokenizer.from_pretrained(model_path)
            label_encoder = joblib.load(le_path)
            local_model.to(device)
            local_model.eval()
            print("✅ Fine-tuned models loaded.")
        else:
            print(f"⚠️ Local model files not found. Check paths: '{model_path}', '{le_path}'")
    except Exception as e:
        print(f"❌ Error loading local models: {e}")

# --- API ENDPOINTS ---

@app.route('/predict', methods=['POST'])
def predict():
    if not all([local_model, tokenizer, label_encoder]):
        return jsonify({"error": "Local model not available."}), 500

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
        
        predictions = [{
            "disease": label_encoder.classes_[idx], 
            "confidence": float(prob)
        } for idx, prob in zip(top_indices[0].cpu().numpy(), top_probs[0].cpu().numpy())]
        
        return jsonify(predictions)
    except Exception as e:
        print(f"❌ Local prediction error: {e}")
        return jsonify({"error": "Failed to get local prediction."}), 500

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    history = data.get('history', [])
    local_preds = data.get('local_predictions', [])
    location = data.get('location', 'an unknown location')

    if not history:
        return jsonify({"error": "Chat history not provided."}), 400

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(history)
        
        return jsonify({
            "reply": response.text,
            "local_predictions": local_preds
        })
    except Exception as e:
        print(f"❌ Gemini API error: {e}")
        return jsonify({"error": f"Gemini API request failed: {e}"}), 500

@app.route('/get_chats', methods=['POST'])
def get_chats():
    if not db: return jsonify({"error": "Firestore is not initialized."}), 500
    
    data = request.get_json()
    # ✅ Match the key sent from the frontend ('user_id')
    user_id = data.get('user_id')
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
    if not db: return jsonify({"error": "Firestore is not initialized."}), 500
    
    data = request.get_json()
    # ✅ These keys now match the corrected api.js payload
    user_id = data.get('userId')
    chat_data = data.get('chatData')
    if not user_id or not chat_data or not chat_data.get('id'):
        return jsonify({"error": "User ID or chat data is missing."}), 400

    try:
        # Convert ISO string timestamp from client back to datetime for Firestore
        chat_data['timestamp'] = datetime.datetime.fromisoformat(chat_data['timestamp'].replace('Z', '+00:00'))
        
        chat_ref = db.collection('users').document(user_id).collection('chats').document(chat_data['id'])
        chat_ref.set(chat_data, merge=True) # Use merge=True to update existing docs
        return jsonify({"success": True, "chatId": chat_data['id']})
    except Exception as e:
        print(f"❌ Firestore save_chat error: {e}")
        return jsonify({"error": f"Failed to save chat: {e}"}), 500