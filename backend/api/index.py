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

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "message": "Health AI Backend is running 🚀"
    }), 200


# --- CORS CONFIGURATION ---
# Allow your deployed Vercel frontend and local dev
CORS(app, resources={r"/*": {"origins": [
    "https://health-app-lilac.vercel.app",
    "http://localhost:3000"
]}})

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

# --- Global variables to hold the loaded models ---
local_model, tokenizer, label_encoder = None, None, None
device = "cuda" if torch.cuda.is_available() else "cpu"

# --- Define the local paths to your files ---
MODEL_FOLDER_PATH = "./models/finetuned_model" 
LABEL_ENCODER_PATH = "./models/label_encoder.joblib"

# --- PASTE THIS NEW VERSION OF load_models() ---

def load_models():
    """
    Loads the model, tokenizer, and label encoder from local paths,
    and RETURNS a detailed error string on failure.
    """
    global local_model, tokenizer, label_encoder
    
    if local_model is not None:
        return None # <-- CHANGE HERE: Return None on success
        
    print(f"📂 First request received. Starting model loading process...")

    # --- DEBUGGING CHECKS ---
    if not os.path.isdir("./models"):
        error_msg = f"❌ DEBUG: The main 'models' directory does not exist! Contents of root: {os.listdir('./')}"
        print(error_msg)
        return error_msg # <-- CHANGE HERE

    if not os.path.isdir(MODEL_FOLDER_PATH):
        error_msg = f"❌ DEBUG: Model folder not found at '{MODEL_FOLDER_PATH}'. Contents of './models': {os.listdir('./models')}"
        print(error_msg)
        return error_msg # <-- CHANGE HERE

    if not os.path.isfile(LABEL_ENCODER_PATH):
        error_msg = f"❌ DEBUG: Label encoder file not found at '{LABEL_ENCODER_PATH}'. Contents of './models': {os.listdir('./models')}"
        print(error_msg)
        return error_msg # <-- CHANGE HERE
    
    print("✅ DEBUG: All file and folder paths verified successfully.")
    
    try:
        print(f"--> Loading model from: {MODEL_FOLDER_PATH}")
        local_model = AutoModelForSequenceClassification.from_pretrained(MODEL_FOLDER_PATH)
        tokenizer = AutoTokenizer.from_pretrained(MODEL_FOLDER_PATH)
        
        print(f"--> Loading label encoder from: {LABEL_ENCODER_PATH}")
        label_encoder = joblib.load(LABEL_ENCODER_PATH)
        
        local_model.to(device)
        local_model.eval()
        
        print(f"✅ Models loaded successfully and moved to {device}.")
        return None # <-- CHANGE HERE: Return None on success
        
    except Exception as e:
        error_msg = f"❌ CRITICAL ERROR during model loading: {e}"
        print(error_msg)
        return error_msg # <-- CHANGE HERE
    
# --- API ENDPOINTS ---


# +++ NEW: DOCTOR PERSONA PROMPT FUNCTION +++
def get_doctor_persona_prompt(user_details, local_predictions, image_provided):
    """
    Constructs a detailed system prompt for the Gemini model to adopt an empathetic,
    professional, and methodical doctor persona with advanced features.
    """
    details_text = "The user has not provided their initial details yet."
    if user_details and user_details.get('info'):
        location = user_details.get('location', 'N/A')
        info = user_details.get('info')
        details_text = f"The user's details are: {info}. They are located in {location}."
    
    predictions_text = "No initial analysis has been performed yet."
    if local_predictions:
        predictions_list = [f"- {p['disease']} (Confidence: {p['confidence']:.0%})" for p in local_predictions]
        predictions_text = "My initial diagnostic analysis based on their main symptoms suggests:\n" + "\n".join(predictions_list)

    image_context = "The user has not provided an image."
    if image_provided:
        image_context = "The user has provided an image of their symptom. You MUST acknowledge the image and use it to ask a more specific follow-up question."

    return """
    **SYSTEM INSTRUCTION: ACT AS A MEDICAL PROFESSIONAL**
    **Your Persona:** You are "Dr. Aether," an experienced, empathetic, and professional AI physician. Your tone should be reassuring and caring. Use phrases like "I understand this must be worrying," or "Thank you for sharing that, let's explore this further."
    **User Context:**
    - {details_text}
    - {image_context}
    - Current Location: Panipat, Haryana, India. Current Date: Thursday, September 4, 2025.
    **Initial Diagnostic Analysis:**
    {predictions_text}
    You must use this analysis as a starting point for your questions.
    **CRITICAL Directives & Conversational Flow:**
    1.  **Refined Emergency Detection:** Analyze the user's message for context, not just keywords. If the message clearly indicates a life-threatening situation (e.g., "I have severe, crushing chest pain," "I cannot breathe at all," "I am bleeding uncontrollably"), your ONLY response must be `[EMERGENCY]`. Do not trigger for minor mentions or hypothetical questions.
    2.  **Methodical Questioning (One at a Time):**
        - Ask clarifying questions ONE AT A TIME to understand the situation fully.
        - Acknowledge the user's answers with empathy before asking the next question.
        - If an image was provided, your first question after seeing it must relate to the image. Example: "Thank you for uploading the image. Seeing the rash helps. Could you tell me if it feels warm to the touch?"
        - Provide simple answer options using the format: `Your question text? [CHIPS: ["Option 1", "Option 2", "I'm not sure"]]`
    3.  **Comprehensive Final Summary:** After 3-4 questions, provide a final summary using this EXACT format:
        `[SUMMARY: {{
            "recap": "A brief, empathetic summary of the user's symptoms.",
            "possibilities": "Based on our conversation, this could suggest... (Discuss possibilities, never give a definitive diagnosis).",
            "homeCare": [
                "Actionable, safe home-care advice relevant to the symptoms.",
                "Another home-care suggestion."
            ],
            "recommendation": "It is highly recommended you consult a doctor in Panipat within the next 24-48 hours for a proper diagnosis. (Tailor urgency based on symptoms and age).",
            "conclusion": "I hope this has been helpful. Please remember to follow up with a healthcare professional. Is there anything else I can assist you with?"
        }}]`
    **DO NOT DEVIATE FROM THE COMMAND FORMATS. The application depends on them.**
    """

# --- PASTE THIS NEW VERSION OF predict() ---

@app.route('/predict', methods=['POST'])
def predict():
    # Call load_models() and capture the potential error message
    load_error = load_models() # <-- CHANGE HERE
    
    # If load_models() returned an error, send it back immediately
    if load_error: # <-- CHANGE HERE
        return jsonify({"error": load_error}), 503

    # This is a fallback, but the check above should catch everything
    if not all([local_model, tokenizer, label_encoder]):
        return jsonify({"error": "Model is not loaded for an unknown reason."}), 503

    # --- (The rest of your prediction logic remains the same) ---
    data = request.get_json() or {}
    symptoms = data.get('symptoms', '')
    if not symptoms:
        return jsonify({"error": "Symptoms not provided."}), 400

    try:
        inputs = tokenizer(symptoms, return_tensors="pt", truncation=True, padding=True).to(device)
        with torch.no_grad():
            outputs = local_model(**inputs)
        probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)
        top_probs, top_indices = torch.topk(probabilities, 3)
        predictions = [
            {"disease": label_encoder.classes_[idx], "confidence": float(prob)}
            for idx, prob in zip(top_indices.cpu().numpy()[0], top_probs.cpu().numpy()[0])
        ]
        return jsonify(predictions)
    except Exception as e:
        print(f"❌ Local prediction error: {e}")
        return jsonify({"error": "Failed to get local prediction."}), 500

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json() or {}
    history = data.get('history', [])
    user_details = data.get('user_details', {})
    local_predictions = data.get('local_predictions', [])
    # 1. Get the new 'image_provided' flag from the request
    image_provided = data.get('image_provided', False) 

    if not history:
        return jsonify({"error": "Chat history not provided."}), 400

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')

        # 2. Pass the 'image_provided' flag to the prompt function
        system_prompt = get_doctor_persona_prompt(user_details, local_predictions, image_provided)

        conversation_history = [
            {'role': 'user', 'parts': [system_prompt]},
            {'role': 'model', 'parts': ["Understood. I will act as Dr. Aether and follow all instructions."]}
        ] + history

        response = model.generate_content(conversation_history)
        return jsonify({"reply": response.text})
    # 3. Use a more general exception to avoid the AttributeError
    except Exception as e:
        print(f"❌ Gemini API error: {e}")
        return jsonify({"error": f"An error occurred with the AI service: {e}"}), 500
    
@app.route('/get_chats', methods=['POST'])
def get_chats():
    if not db:
        return jsonify({"error": "Firestore not initialized."}), 500
    data = request.get_json() or {}
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({"error": "User ID not provided."}), 400

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
    if not db:
        return jsonify({"error": "Firestore is not initialized."}), 500
    data = request.get_json() or {}
    user_id = data.get('userId')
    chat_data = data.get('chatData')
    if not user_id or not chat_data:
        return jsonify({"error": "User ID or chat data is missing."}), 400

    try:
        chat_data['timestamp'] = datetime.datetime.fromisoformat(
            chat_data['timestamp'].replace('Z', '+00:00')
        )
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