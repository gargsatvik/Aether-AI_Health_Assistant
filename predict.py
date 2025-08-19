import pandas as pd
import joblib
import spacy
from nltk.corpus import wordnet
from sklearn.metrics.pairwise import cosine_similarity
from difflib import get_close_matches
# ------------------
# LOAD MODEL & ENCODER
# ------------------
model = joblib.load("data/disease_model.pkl")
mlb = joblib.load("data/symptom_encoder.pkl")
all_symptoms = mlb.classes_

# Load spaCy model
nlp = spacy.load("en_core_web_md")

# Precompute embeddings for all known symptoms
symptom_embeddings = {s: nlp(s.replace("_", " ")).vector for s in all_symptoms}


# ------------------
# SYNONYM LOOKUP (WordNet)
# ------------------
def get_synonyms(word):
    synonyms = set()
    for syn in wordnet.synsets(word):
        for lemma in syn.lemmas():
            synonyms.add(lemma.name().replace("_", " "))
    return synonyms


# ------------------
# MATCH USER TEXT TO KNOWN SYMPTOM
# ------------------
def best_match_symptom(user_text, threshold=0.65):
    user_text = user_text.lower().strip()
    doc = nlp(user_text)

    # 1. Exact match
    if user_text in all_symptoms:
        return user_text

    # 2. Fuzzy string match
    fuzzy = get_close_matches(user_text, all_symptoms, n=1, cutoff=0.8)
    if fuzzy:
        return fuzzy[0]

    # 3. Synonym check (WordNet)
    for symptom in all_symptoms:
        for syn in get_synonyms(symptom.replace("_", " ")):
            if user_text == syn.lower():
                return symptom

    # 4. Semantic similarity (spaCy embeddings)
    vec = doc.vector
    best, score = None, 0
    for symptom, svec in symptom_embeddings.items():
        sim = cosine_similarity([vec], [svec])[0][0]
        if sim > score:
            best, score = symptom, sim
    if score >= threshold:
        return best

    return None


# ------------------
# PREDICTION FUNCTION
# ------------------
def predict_disease(user_sentence, top_n=3):
    # Break sentence into tokens/noun chunks
    doc = nlp(user_sentence)
    candidate_symptoms = set()

    # Try noun chunks (like "chest pain", "high fever")
    for chunk in doc.noun_chunks:
        match = best_match_symptom(chunk.text)
        if match:
            candidate_symptoms.add(match)

    # Try individual tokens (like "fever", "cough")
    for token in doc:
        if not token.is_stop and token.is_alpha:
            match = best_match_symptom(token.text)
            if match:
                candidate_symptoms.add(match)

    if not candidate_symptoms:
        return [("No matching symptoms found", 0)]

    # Encode
    X_user = mlb.transform([list(candidate_symptoms)])

    # Predict probabilities
    probs = model.predict_proba(X_user)[0]
    top_indices = probs.argsort()[-top_n:][::-1]

    results = [(model.classes_[i], round(probs[i] * 100, 2)) for i in top_indices]
    return results


# ------------------
# INTERACTIVE LOOP
# ------------------
if __name__ == "__main__":
    while True:
        user_input = input("\nDescribe your symptoms (or 'quit'): ")
        if user_input.lower() == "quit":
            break

        predictions = predict_disease(user_input)
        print("Predictions:")
        for disease, prob in predictions:
            print(f"- {disease} ({prob}%)")
