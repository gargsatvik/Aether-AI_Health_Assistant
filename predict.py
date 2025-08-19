import pandas as pd
import joblib
import re
from difflib import get_close_matches
from nltk.corpus import wordnet
from nltk.stem import WordNetLemmatizer
import nltk

# 🔹 Make sure NLTK resources are downloaded
nltk.download('wordnet')
nltk.download('omw-1.4')

# ------------------ Load Model & Dataset ------------------
print("🔄 Loading model & embedder...")
model = joblib.load("data/disease_model_embeddings.pkl")
embedder = joblib.load("data/embedder.pkl")

# Load symptoms from your dataset
df = pd.read_csv("data/dataset.csv")  # Or wherever your master dataset is
all_symptoms = set()
for col in df.columns[1:]:  # skip Disease column
    all_symptoms.update(df[col].dropna().astype(str).str.strip().str.lower())
all_symptoms = list(all_symptoms)
print(f"✅ Loaded {len(all_symptoms)} symptoms from dataset")

# ------------------ NLTK Setup ------------------
lemmatizer = WordNetLemmatizer()

def get_synonyms(word):
    syns = set()
    for syn in wordnet.synsets(word):
        for lemma in syn.lemmas():
            syns.add(lemma.name().lower().replace("_", " "))
    return syns

# Precompute synonym mapping for all symptoms
synonym_map = {}
for symptom in all_symptoms:
    synonym_map[symptom] = get_synonyms(symptom)
    synonym_map[symptom].add(symptom)  # ensure original symptom included

# ------------------ Symptom Extraction ------------------
def normalize_word(word):
    return lemmatizer.lemmatize(word.lower())

def extract_symptoms_from_text(text):
    text = text.lower()
    recognized = set()

    # Check for multi-word symptoms first
    for symptom, syns in synonym_map.items():
        for s in syns:
            if s in text:
                recognized.add(symptom)
                text = text.replace(s, "")  # remove matched part

    # Tokenize remaining text
    words = set(re.findall(r'\w+', text))
    words = [normalize_word(w) for w in words]

    # Fuzzy match remaining words
    for word in words:
        match = get_close_matches(word, all_symptoms, n=1, cutoff=0.85)
        if match:
            recognized.add(match[0])

    return list(recognized)

# ------------------ Prediction ------------------
def predict_disease(symptom_sentence, top_n=3):
    recognized = extract_symptoms_from_text(symptom_sentence)
    if not recognized:
        return recognized, [("No recognizable symptoms found", 0)]

    # Convert sentence → embedding
    embedding = embedder.encode([symptom_sentence], convert_to_numpy=True)

    # Predict probabilities
    probs = model.predict_proba(embedding)[0]
    classes = model.classes_

    # Sort top N predictions
    top_indices = probs.argsort()[-top_n:][::-1]
    results = [(classes[i], round(probs[i], 3)) for i in top_indices]
    return recognized, results

# ------------------ Interactive Run ------------------
print("\n💬 Describe your symptoms (or type 'q' to quit)")
while True:
    text = input("> ")
    if text.lower() == "q":
        break
    recognized, preds = predict_disease(text)
    print("🔍 Recognized Symptoms:", recognized)
    print("Predictions:", preds)
