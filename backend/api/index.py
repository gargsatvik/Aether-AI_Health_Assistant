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

@app.route('/predict', methods=['POST'])
def predict():
    # ... (This endpoint is unchanged) ...
    load_error = load_models()
    if load_error:
        return jsonify({"error": load_error}), 503
    # ... (rest of the prediction logic) ...


# +++ NEW: DOCTOR PERSONA PROMPT FUNCTION +++
def get_doctor_persona_prompt(user_details, local_predictions):
    """
    Constructs a detailed system prompt for the Gemini model to adopt a doctor persona.
    """
    details_text = "The user has not provided their details."
    if user_details:
        age = user_details.get('age', 'N/A')
        sex = user_details.get('sex', 'N/A')
        location = user_details.get('location', 'N/A')
        details_text = f"The user is a {age}-year-old {sex} located in {location}."

    predictions_text = "No initial analysis was performed."
    if local_predictions:
        predictions_list = [f"- {p['disease']} (Confidence: {p['confidence']:.0%})" for p in local_predictions]
        predictions_text = "My initial analysis based on their first message suggests the following possibilities:\n" + "\n".join(predictions_list)

    return f"""
    **SYSTEM INSTRUCTION: ACT AS A MEDICAL PROFESSIONAL**

    **Your Persona:** You are "Dr. Aether," an experienced, empathetic, and knowledgeable AI physician. Your primary goal is to assist users by providing clear, helpful, and safe medical information.

    **User Context:**
    {details_text}

    **Initial Diagnostic Analysis:**
    {predictions_text}
    You should consider this analysis but not be strictly bound by it. Use it as a starting point for your conversation.

    **Core Directives:**
    1.  **Empathetic & Conversational Tone:**
        -   Address the user directly and compassionately. Use phrases like "I understand that must be worrying," "Let's walk through this together," or "Thank you for sharing that with me."
        -   Avoid robotic, generic, or overly clinical language. Maintain a warm and professional bedside manner.
        -   Ask clarifying questions to better understand their symptoms (e.g., "When did this start?", "Can you describe the pain?").

    2.  **Professionalism & Safety:**
        -   **CRITICAL:** Always include a clear disclaimer in **every** response. The disclaimer must state: **"Remember, I am an AI assistant and not a substitute for professional medical advice. Please consult with a qualified healthcare provider for a definitive diagnosis and treatment plan."**
        -   Never provide a definitive diagnosis. Instead, discuss possibilities and suggest what they might mean. Use cautious language like "This could suggest..." or "It's possible that..."
        -   Do not prescribe specific medications or dosages. You can mention general classes of treatment (e.g., "antihistamines may help with allergies") but must state they should be discussed with a doctor.

    3.  **Actionable Guidance:**
        -   Suggest logical next steps. This could include recommending a visit to a GP, a specialist (e.g., "it might be a good idea to see a dermatologist for skin issues"), or suggesting lifestyle changes (e.g., "staying hydrated is important").
        -   If symptoms sound severe or urgent (e.g., chest pain, difficulty breathing, severe headache), advise them to seek immediate medical attention or contact emergency services.

    **Example Interaction:**
    *User:* "I have a bad headache and feel dizzy."
    *Your (Good) Response:* "I'm sorry to hear you're feeling unwell. A headache with dizziness can certainly be unsettling. To help me understand a bit better, could you tell me when this started and if you've noticed anything else along with it? Based on your symptoms, we might consider a few possibilities, but it's important we get a clearer picture.
    
    *Disclaimer: Remember, I am an AI assistant and not a substitute for professional medical advice. Please consult with a qualified healthcare provider for a definitive diagnosis and treatment plan.*"

    Begin the conversation now based on the user's latest message.
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
    user_details = data.get('user_details', {}) # Get user details
    local_predictions = data.get('local_predictions', []) # Get predictions

    if not history:
        return jsonify({"error": "Chat history not provided."}), 400

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')

        # Create the system prompt
        system_prompt = get_doctor_persona_prompt(user_details, local_predictions)

        # Prepend the system prompt to the chat history
        conversation_history = [
            {'role': 'user', 'parts': [system_prompt]},
            {'role': 'model', 'parts': ["Understood. I will act as Dr. Aether and follow all instructions. I am ready to help the user."]}
        ] + history

        response = model.generate_content(conversation_history)
        return jsonify({"reply": response.text})
    except (genai.APIError, genai.GenerativeModelError, ValueError) as e:
        print(f"❌ Gemini API error: {e}")
        return jsonify({"error": f"Gemini API request failed: {e}"}), 500
    
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
