# py_files/cli.py
import os
import joblib
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# --- Global Variables for Models ---
model = None
tokenizer = None
label_encoder = None
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"💪 Using device: {device.upper()}")

# --- Helper Functions ---
def load_models():
    """Load the fine-tuned model, tokenizer, and label encoder."""
    global model, tokenizer, label_encoder
    
    # --- CORRECTED AND FINAL FILE PATHS ---
    model_path = "models/finetuned_model"
    le_path = "models/label_encoder .joblib" # <-- THIS FILENAME IS NOW CORRECT
    
    try:
        if os.path.exists(model_path) and os.path.exists(le_path):
            model = AutoModelForSequenceClassification.from_pretrained(model_path)
            tokenizer = AutoTokenizer.from_pretrained(model_path)
            label_encoder = joblib.load(le_path)
            
            model.to(device)
            model.eval()
            
            print("✅ Fine-tuned model, tokenizer, and label encoder loaded successfully.")
        else:
            print(f"⚠️ Model or Label Encoder not found. Please check paths exist: '{model_path}', '{le_path}'")
    except Exception as e:
        print(f"❌ Error loading models: {e}")

def get_prediction(symptoms_text):
    """Generates predictions using the loaded fine-tuned model."""
    if not all([model, tokenizer, label_encoder]):
        raise RuntimeError("Models are not loaded. Cannot make a prediction.")

    inputs = tokenizer(symptoms_text, return_tensors="pt", truncation=True, padding=True).to(device)
    
    with torch.no_grad():
        outputs = model(**inputs)
    
    probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)
    top_probs, top_indices = torch.topk(probabilities, 3)
    
    top_indices = top_indices.cpu().numpy()[0]
    top_probs = top_probs.cpu().numpy()[0]

    predictions = [
        {"disease": label_encoder.classes_[idx], "confidence": float(prob)}
        for idx, prob in zip(top_indices, top_probs)
    ]
    return predictions

def run_cli():
    """Starts an interactive command-line loop for testing the local model."""
    print("\n--- CLI Mode: Enter symptoms to test model ---")
    print("Type 'quit' or 'exit' to stop.")
    while True:
        symptoms = input("Symptoms > ").strip()
        if symptoms.lower() in ['quit', 'exit']:
            break
        if not symptoms:
            continue
        
        try:
            predictions = get_prediction(symptoms)
            print("--- Predictions ---")
            for pred in predictions:
                print(f"- {pred['disease']}: {pred['confidence']:.2%}")
            print("-" * 19)
        except Exception as e:
            print(f"An error occurred: {e}")

# --- Main Execution ---
if __name__ == '__main__':
    load_models()
    if all([model, tokenizer, label_encoder]):
        run_cli()
    else:
        print("Could not start CLI because models failed to load.")

