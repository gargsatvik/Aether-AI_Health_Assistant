# server.py
import os
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

# --- Configuration ---
load_dotenv()

# --- Initialize Firebase Admin SDK ---
try:
    cred = credentials.Certificate("firebase_key.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase connection successful.")
except Exception as e:
    print(f"❌ Firebase connection failed: {e}")
    db = None

# --- Initialize Gemini API ---
try:
    genai.configure(api_key="AIzaSyCtHrqkezyDKxg5l3MiU4CpnrMeVd2XOfk")
except Exception as e:
    print(f"❌ Gemini API Key not found: {e}")

# --- Initialize Flask App ---
app = Flask(__name__)
CORS(app)

# --- Global Variables for ML Models ---
local_model, embedder, label_encoder = None, None, None

# --- Helper Functions ---
def load_models():
    """Load ML models from disk."""
    global local_model, embedder, label_encoder
    try:
        local_model = joblib.load("new_models/disease_classifier.pkl")
        embedder = SentenceTransformer("new_models/symptom_embedder")
        label_encoder = joblib.load("new_models/label_encoder.joblib")
        print("✅ All local models loaded successfully.")
    except Exception as e:
        print(f"❌ Error loading local models: {e}")

# --- API Endpoints ---
@app.route('/predict', methods=['POST'])
def predict():
    # (This function remains the same)
    if not all([local_model, embedder, label_encoder]):
        return jsonify({"error": "Models not loaded"}), 500
    data = request.get_json()
    symptoms = data.get('symptoms', '')
    try:
        embedding = embedder.encode([symptoms], convert_to_numpy=True)
        proba = local_model.predict_proba(embedding)[0]
        top_indices = np.argsort(proba)[-3:][::-1]
        predictions = [{"disease": label_encoder.classes_[i], "confidence": float(proba[i])} for i in top_indices]
        return jsonify(predictions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    # (This function remains the same)
    data = request.get_json()
    history = data.get('history', [])
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(history)
        return jsonify({"reply": response.text})
    except Exception as e:
        print(f"❌ Gemini API Error: {e}")
        return jsonify({"error": f"Gemini API request failed: {str(e)}"}), 500

@app.route('/get_chats', methods=['POST'])
def get_chats():
    """Retrieve all chat histories for a user."""
    if not db: return jsonify({"error": "Database not configured"}), 500
    data = request.get_json()
    user_id = data.get('userId')
    try:
        chats_ref = db.collection('users').document(user_id).collection('chats').order_by('timestamp', direction=firestore.Query.DESCENDING).stream()
        chats = [chat.to_dict() for chat in chats_ref]
        return jsonify(chats)
    except Exception as e:
        print(f"❌ Firestore get_chats Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/save_chat', methods=['POST'])
def save_chat():
    """Save a chat history for a user."""
    if not db: return jsonify({"error": "Database not configured"}), 500
    data = request.get_json()
    user_id = data.get('userId')
    chat_data = data.get('chatData')
    try:
        chat_ref = db.collection('users').document(user_id).collection('chats').document(chat_data['id'])
        chat_ref.set(chat_data)
        return jsonify({"success": True, "id": chat_data['id']})
    except Exception as e:
        print(f"❌ Firestore save_chat Error: {e}")
        return jsonify({"error": str(e)}), 500

# --- Main Execution ---
if __name__ == '__main__':
    load_models()
    app.run(host='0.0.0.0', port=5000)
