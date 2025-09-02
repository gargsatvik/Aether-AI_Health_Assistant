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
# Allow all origins for broader compatibility, can be restricted later if needed.
CORS(app)
load_dotenv()

# --- Firebase Initialization ---
try:
    service_account_str = os.getenv("FIREBASE_SERVICE_ACCOUNT")
    if service_account_str:
        service_account_info = json.loads(service_account_str)
        cred = credentials.Certificate(service_account_info)
    else:
        # Fallback for local development
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

# --- MODEL LOADING LOGIC ---
local_model, tokenizer, label_encoder = None, None, None
device = "cuda" if torch.cuda.is_available() else "cpu"

# --- CORRECTED MODEL REPO ID ---
# This now points to your actual, larger model repository.
repo_id = "gargsatvik31/health-ai-classifier" 
# --------------------------------

def load_models():
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
    if local_model is None:
        load_models()
    if not all([local_model, tokenizer, label_encoder]):
        return jsonify({"error": "Model could not be loaded."}), 503

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
        predictions = [{"disease": label_encoder.classes_[idx], "confidence": float(prob)} for idx, prob in zip(top_indices.cpu().numpy()[0], top_probs.cpu().numpy()[0])]
        return jsonify(predictions)
    except Exception as e:
        print(f"❌ Local prediction error: {e}")
        return jsonify({"error": "Failed to get local prediction."}), 500

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    history = data.get('history', [])
    if not history: return jsonify({"error": "Chat history not provided."}), 400

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(history)
        return jsonify({"reply": response.text})
    except Exception as e:
        print(f"❌ Gemini API error: {e}")
        return jsonify({"error": f"Gemini API request failed: {e}"}), 500

@app.route('/get_chats', methods=['POST'])
def get_chats():
    if not db: return jsonify({"error": "Firestore not initialized."}), 500
    data = request.get_json(); user_id = data.get('user_id')
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
    if not db: return jsonify({"error": "Firestore not initialized."}), 500
    data = request.get_json(); user_id = data.get('userId'); chat_data = data.get('chatData')
    if not user_id or not chat_data: return jsonify({"error": "User ID or chat data is missing."}), 400

    try:
        chat_data['timestamp'] = datetime.datetime.fromisoformat(chat_data['timestamp'].replace('Z', '+00:00'))
        chat_ref = db.collection('users').document(user_id).collection('chats').document(chat_data['id'])
        chat_ref.set(chat_data, merge=True)
        return jsonify({"success": True, "chatId": chat_data['id']})
    except Exception as e:
        print(f"❌ Firestore save_chat error: {e}")
        return jsonify({"error": f"Failed to save chat: {e}"}), 500

# --- Server Startup Block ---
if __name__ == "__main__":
    port = int(os.environ.get('PORT', 7860)) # Hugging Face Spaces uses port 7860
    app.run(host='0.0.0.0', port=port)

