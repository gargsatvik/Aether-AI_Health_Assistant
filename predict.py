# predict.py
"""
Unified predict.py:
- Loads (or trains if missing) an ML model that maps symptom-sets -> disease.
- Accepts free-text symptom descriptions, extracts candidate symptoms robustly,
  and predicts top diseases with probabilities.
- Uses: sentence-transformers embeddings, spaCy (if available), NLTK WordNet,
  fuzzy matching (difflib/rapidfuzz), optional spell correction.
- Prints recognized symptoms and an explanation (feature importances & symptom list).
"""

import os
import sys
import re
import joblib
import math
import warnings
from collections import Counter, defaultdict

import pandas as pd
import numpy as np
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.ensemble import RandomForestClassifier

# Optional / helpful libs
try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None

try:
    import spacy
    SPACY_AVAILABLE = True
except Exception:
    spacy = None
    SPACY_AVAILABLE = False

try:
    import nltk
    from nltk.corpus import wordnet
    nltk.data.find("corpora/wordnet")
    WORDNET_AVAILABLE = True
except Exception:
    WORDNET_AVAILABLE = False

try:
    from spellchecker import SpellChecker
    SPELLCHECK_AVAILABLE = True
except Exception:
    SPELLCHECK_AVAILABLE = False

from difflib import get_close_matches
try:
    from rapidfuzz import process as rf_process, fuzz as rf_fuzz
    RAPIDFUZZ_AVAILABLE = True
except Exception:
    RAPIDFUZZ_AVAILABLE = False

# -----------------------
# Paths & config
# -----------------------
MODEL_FILE = "models/disease_model.pkl"
ENCODER_FILE = "models/symptom_encoder.pkl"
EMBEDDER_FILE = "models/embedder.pkl"   # will save SentenceTransformer here (joblib)
SYN_EMB_CACHE_FILE = "models/symptom_embeddings.pkl"

SYNTHETIC_DATA = "data/synthetic_patient_data.csv"   # your synthetic patient CSV (disease,Symptoms)
MERGED_DATA = "data/merged.csv"                      # optional merged weighted dataset

# semantic similarity threshold (0-1). tune as needed
SEMANTIC_SIM_THRESHOLD = 0.65

# -----------------------
# Utility init / messages
# -----------------------
def print_install_hints():
    print("\nIf something failed due to missing packages, install recommended packages:")
    print("  pip install scikit-learn pandas joblib sentence-transformers spacy nltk pyspellchecker rapidfuzz")
    print("  python -m spacy download en_core_web_sm\n")

if not WORDNET_AVAILABLE:
    try:
        import nltk
        print("Downloading NLTK wordnet (one-time)...")
        nltk.download("wordnet")
        nltk.download("omw-1.4")
        from nltk.corpus import wordnet
        WORDNET_AVAILABLE = True
    except Exception:
        WORDNET_AVAILABLE = False
        warnings.warn("NLTK/WordNet unavailable. Synonym lookup will be limited.")

if SPELLCHECK_AVAILABLE:
    spell = SpellChecker()
else:
    spell = None

# -----------------------
# TRAIN / LOAD model
# -----------------------
def train_and_save_from_synthetic(synthetic_csv=SYNTHETIC_DATA):
    """Train model from synthetic_patient_data.csv (expects 'Disease' and 'Symptoms' columns).
       Symptoms column is a comma-separated string.
    """
    print("Training model from synthetic data:", synthetic_csv)
    df = pd.read_csv(synthetic_csv)

    if "Symptoms" not in df.columns:
        raise RuntimeError("Synthetic CSV must have 'Symptoms' column (comma-separated symptom strings).")

    df["Symptoms"] = df["Symptoms"].apply(lambda x: [s.strip().lower() for s in str(x).split(",") if s.strip()])

    mlb = MultiLabelBinarizer()
    X = mlb.fit_transform(df["Symptoms"])
    y = df["Disease"]

    model = RandomForestClassifier(n_estimators=200, random_state=42)
    model.fit(X, y)

    os.makedirs("models", exist_ok=True)
    joblib.dump(model, MODEL_FILE)
    joblib.dump(mlb, ENCODER_FILE)

    print("Training complete — model saved to", MODEL_FILE)
    return model, mlb

def load_or_train_model():
    if os.path.exists(MODEL_FILE) and os.path.exists(ENCODER_FILE):
        print("Loading model and symptom encoder...")
        model = joblib.load(MODEL_FILE)
        mlb = joblib.load(ENCODER_FILE)
        print("Model loaded.")
    else:
        if not os.path.exists(SYNTHETIC_DATA):
            raise FileNotFoundError(f"No model found and synthetic data missing: {SYNTHETIC_DATA}")
        model, mlb = train_and_save_from_synthetic(SYNTHETIC_DATA)
    return model, mlb

# -----------------------
# Load embedder & spaCy (optional)
# -----------------------
def load_sentence_embedder(model_name="all-MiniLM-L6-v2"):
    if SentenceTransformer is None:
        print("SentenceTransformer not available. Install sentence-transformers for semantic matching.")
        return None
    try:
        print("Loading sentence-transformer embedder (this may take a moment)...")
        embedder = SentenceTransformer(model_name)
        joblib.dump(embedder, EMBEDDER_FILE)   # save for quicker load next time (object can be large)
        return embedder
    except Exception as e:
        warnings.warn(f"Failed to load sentence-transformer: {e}")
        return None

def load_spacy_model(name="en_core_web_sm"):
    if not SPACY_AVAILABLE:
        return None
    try:
        nlp = spacy.load(name)
        return nlp
    except Exception:
        # try to fallback to small model install hint
        warnings.warn(f"spaCy model '{name}' not available. Install with: python -m spacy download {name}")
        return None

# -----------------------
# Symptoms canonical list & embeddings
# -----------------------
def canonical_symptoms_from_encoder(mlb):
    """Return symptom list in normalized form (lowercase, underscores retained)"""
    return [s.lower() for s in mlb.classes_]

def prepare_symptom_embeddings(symptoms, embedder, nlp_spacy=None):
    """
    Build a dict: symptom -> vector.
    If embedder (SentenceTransformer) available, use it. Otherwise use spaCy vector if present.
    """
    emb = {}
    if embedder is not None:
        texts = [s.replace("_", " ") for s in symptoms]
        vecs = embedder.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        for s, v in zip(symptoms, vecs):
            emb[s] = v
        return emb

    if nlp_spacy is not None:
        for s in symptoms:
            emb[s] = nlp_spacy(s.replace("_", " ")).vector
        return emb

    # fallback: no embeddings => return None (we'll use fuzzy/wordnet only)
    return None

# -----------------------
# Synonym / spell helper
# -----------------------
def wordnet_synonyms(term):
    if not WORDNET_AVAILABLE:
        return set()
    term_norm = term.replace("_", " ").lower()
    synonyms = set()
    for syn in wordnet.synsets(term_norm):
        for lemma in syn.lemmas():
            synonyms.add(lemma.name().replace("_", " ").lower())
    return synonyms

def spell_correct(word):
    if not SPELLCHECK_AVAILABLE or not word:
        return word
    corrected = spell.correction(word)
    return corrected if corrected else word

# -----------------------
# Matching pipeline
# -----------------------
def best_match_symptom(token_text, symptoms_list, symptom_embeddings=None,
                       embedder=None, nlp_spacy=None,
                       fuzzy_cutoff=0.85, semantic_cutoff=SEMANTIC_SIM_THRESHOLD):
    """
    Try a ladder of matching techniques to map token_text -> a canonical symptom (or None):
     1. exact (after normalizing)
     2. underscore / space normalization
     3. fuzzy string match (rapidfuzz preferred)
     4. wordnet synonyms
     5. semantic similarity (embedder)
    """
    t = token_text.strip().lower()
    if not t:
        return None

    # small preprocess
    t_clean = t.replace("-", " ").replace("/", " ").replace(",", " ")

    # 1. direct exact match
    if t in symptoms_list:
        return t

    # 2. underscore / space variants
    t_us = t.replace(" ", "_")
    if t_us in symptoms_list:
        return t_us
    # also try replacing underscores with spaces on symptoms
    for s in symptoms_list:
        if s.replace("_", " ") == t:
            return s

    # 2b. spell correction for single-word tokens
    if SPELLCHECK_AVAILABLE and " " not in t:
        s_corr = spell_correct(t)
        if s_corr != t:
            # try direct
            if s_corr in symptoms_list:
                return s_corr
            if s_corr.replace(" ", "_") in symptoms_list:
                return s_corr.replace(" ", "_")

    # 3. fuzzy matching (rapidfuzz if installed else difflib)
    if RAPIDFUZZ_AVAILABLE:
        # rapidfuzz returns best matches quickly
        best = rf_process.extractOne(t, symptoms_list, scorer=rf_fuzz.token_sort_ratio)
        if best and best[1] / 100.0 >= fuzzy_cutoff:
            return best[0]
    else:
        fuzzy = get_close_matches(t, symptoms_list, n=1, cutoff=fuzzy_cutoff)
        if fuzzy:
            return fuzzy[0]

    # 4. WordNet synonyms
    if WORDNET_AVAILABLE:
        syns = set()
        # check synonyms of the token_text
        for syn in wordnet.synsets(t):
            for lemma in syn.lemmas():
                syns.add(lemma.name().replace("_", " ").lower())
        # try direct matches
        for s in symptoms_list:
            if s.replace("_", " ") in syns or s in syns:
                return s

        # also check synonyms of canonical symptom terms (this is heavier)
        # but only do a short-circuit check for exact match with small synonyms
        for s in symptoms_list:
            for syn in wordnet.synsets(s.replace("_", " ")):
                for lemma in syn.lemmas():
                    if lemma.name().lower() == t:
                        return s

    # 5. semantic similarity via embeddings if available
    if symptom_embeddings is not None:
        # compute embedding for token
        vec = None
        if embedder is not None:
            try:
                vec = embedder.encode([t_clean], convert_to_numpy=True)[0]
            except Exception:
                vec = None
        elif nlp_spacy is not None:
            vec = nlp_spacy(t_clean).vector

        if vec is not None:
            # compute cosine sims efficiently
            # symptoms embeddings are precomputed in symptom_embeddings
            best_sym = None
            best_score = -1.0
            # iterate
            for s, svec in symptom_embeddings.items():
                # quick check on norm
                if svec is None or len(svec) == 0:
                    continue
                sim = np.dot(vec, svec) / (np.linalg.norm(vec) * np.linalg.norm(svec) + 1e-12)
                if sim > best_score:
                    best_score = sim
                    best_sym = s
            if best_score >= semantic_cutoff:
                return best_sym

    return None

# -----------------------
# Extract candidate symptom phrases from free text
# -----------------------
def extract_candidates(text, symptoms_list, symptom_embeddings=None, embedder=None, nlp_spacy=None):
    """
    Return a set of matched canonical symptoms extracted from text.
    Strategy:
      - If spaCy available, use noun_chunks + entities + tokenization
      - Fallback to n-grams (1..3 grams)
      - For each candidate, run best_match_symptom
    """
    text = str(text).lower()
    matched = set()

    # try spaCy noun-chunks & entities if available
    if nlp_spacy is not None:
        doc = nlp_spacy(text)
        # use entity labels and noun_chunks
        chunks = [chunk.text for chunk in doc.noun_chunks]
        # include contiguous tokens up to length 4 as candidate phrases
        for ent in doc.ents:
            chunks.append(ent.text)
        # also add single tokens (non-stop)
        tokens = [token.text for token in doc if token.is_alpha and not token.is_stop]
        candidates = chunks + tokens
    else:
        tokens = re.findall(r"\w+(?:[-']\w+)?", text)
        # produce 1..3-grams
        ngrams = []
        for n in (3, 2, 1):
            for i in range(len(tokens) - n + 1):
                ngrams.append(" ".join(tokens[i:i + n]))
        candidates = ngrams

    # reduce duplicates, try longer phrases first
    candidates = sorted(set(candidates), key=lambda x: -len(x.split()))

    for cand in candidates:
        match = best_match_symptom(cand, symptoms_list, symptom_embeddings=symptom_embeddings,
                                   embedder=embedder, nlp_spacy=nlp_spacy)
        if match:
            matched.add(match)

    return matched

# -----------------------
# Prediction & explanation
# -----------------------
def predict_from_text(text, model, mlb, embedder=None, symptom_embeddings=None, nlp_spacy=None, top_n=5):
    symptoms_list = canonical_symptoms_from_encoder(mlb)
    recognized = extract_candidates(text, symptoms_list, symptom_embeddings, embedder, nlp_spacy)

    if not recognized:
        return recognized, [("No recognizable symptoms found", 0.0)], {}

    X_user = mlb.transform([list(recognized)])
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(X_user)[0]
        classes = model.classes_
        indices = np.argsort(probs)[-top_n:][::-1]
        preds = [(classes[i], float(probs[i])) for i in indices]
    else:
        labels = model.predict(X_user)
        preds = [(labels[0], 1.0)]

    # explanation: global feature importance ranking
    explanation = {}
    if hasattr(model, "feature_importances_"):
        fi = model.feature_importances_
        feature_names = mlb.classes_
        # show top 10 important features
        topk = np.argsort(fi)[-10:][::-1]
        explanation["top_features"] = [(feature_names[i], float(fi[i])) for i in topk]
    else:
        explanation["top_features"] = []

    explanation["recognized_symptoms"] = list(recognized)
    return recognized, preds, explanation

# -----------------------
# Main interactive flow
# -----------------------
def main_interactive_loop():
    model, mlb = load_or_train_model()

    # load embedder & spaCy
    embedder = None
    symptom_embeddings = None
    nlp_spacy = None

    if SentenceTransformer is not None:
        try:
            # try to load a saved embedder if present
            if os.path.exists(EMBEDDER_FILE):
                embedder = joblib.load(EMBEDDER_FILE)
            else:
                embedder = load_sentence_embedder()
        except Exception:
            embedder = None

    # load spaCy small model if available
    if SPACY_AVAILABLE:
        nlp_spacy = load_spacy_model("en_core_web_sm")

    symptoms_list = canonical_symptoms_from_encoder(mlb)

    if embedder is not None or nlp_spacy is not None:
        # prepare symptom embeddings
        try:
            if os.path.exists(SYN_EMB_CACHE_FILE):
                symptom_embeddings = joblib.load(SYN_EMB_CACHE_FILE)
            else:
                symptom_embeddings = prepare_symptom_embeddings(symptoms_list, embedder, nlp_spacy)
                joblib.dump(symptom_embeddings, SYN_EMB_CACHE_FILE)
        except Exception:
            symptom_embeddings = prepare_symptom_embeddings(symptoms_list, embedder, nlp_spacy)

    print("\n🔄 Loading model & resources...")
    print(f"✅ Loaded {len(symptoms_list)} canonical symptoms.")
    if embedder is None:
        print("⚠️ No sentence-transformer embedder loaded — semantic matching disabled (still fuzzy/synonym will work).")
    if nlp_spacy is None:
        print("⚠️ spaCy small model not loaded — noun-chunk extraction will be less accurate.")

    print("\n💬 Describe your symptoms (or type 'q' to quit):")
    while True:
        text = input("> ").strip()
        if not text:
            continue
        if text.lower() in ("q", "quit", "exit"):
            break

        recognized, preds, explanation = predict_from_text(text, model, mlb,
                                                           embedder=embedder,
                                                           symptom_embeddings=symptom_embeddings,
                                                           nlp_spacy=nlp_spacy,
                                                           top_n=5)
        # print recognized symptoms
        if recognized:
            print("🔍 Recognized Symptoms:", sorted(recognized))
        else:
            print("🔍 Recognized Symptoms: None found")

        # print predictions
        print("Predictions:")
        for disease, prob in preds:
            # format prob nicely: if between 0 and 1, show percent
            if 0.0 <= prob <= 1.0:
                print(f" - {disease} ({prob*100:.1f}%)")
            else:
                print(f" - {disease} ({prob})")

        # print explanation (top features)
        if "top_features" in explanation and explanation["top_features"]:
            print("\n📊 Global feature importances (top):")
            for feat, val in explanation["top_features"]:
                print(f"  {feat} — {val:.4f}")

        print("\n---\n")

# -----------------------
# Entry point
# -----------------------
if __name__ == "__main__":
    try:
        main_interactive_loop()
    except Exception as e:
        print("Unexpected error:", e)
        print_install_hints()
        raise
