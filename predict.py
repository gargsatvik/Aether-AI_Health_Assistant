# predict.py
"""
Robust interactive predictor for disease from free-text symptoms.

Features:
- Loads either sklearn XGBClassifier (joblib) or xgboost Booster (json) automatically.
- Loads a LabelEncoder (joblib) if present to decode integer labels -> disease names.
- Loads a SentenceTransformer embedder from models/symptom_embedder (preferred).
- Attempts to recognize canonical symptoms (if you have a symptom encoder).
- Interactive loop: user types a sentence, program shows recognized symptoms + top-N predicted diseases.

Edit the PATH constants below if your files live elsewhere.
"""

import os
import sys
import joblib
import numpy as np
from difflib import get_close_matches
from collections import OrderedDict

# Try to import optional packages (fail with friendly messages)
try:
    from sentence_transformers import SentenceTransformer
except Exception as e:
    print("ERROR: sentence-transformers not available. Install via `pip install sentence-transformers`.")
    raise

try:
    import xgboost as xgb
except Exception:
    xgb = None

try:
    from sklearn.preprocessing import LabelEncoder
except Exception:
    LabelEncoder = None

# -------------------------
# Paths (adjust if needed)
# -------------------------
CANDIDATE_SKLEARN_MODEL = "models/xgb_model_sklearn.joblib"   # sklearn XGBClassifier (joblib)
CANDIDATE_XGB_BOOSTER    = "models/xgb_model_booster.json"    # xgboost booster JSON
CANDIDATE_LE            = "models/label_encoder.joblib"       # LabelEncoder (joblib)
CANDIDATE_EMBEDDER_DIR  = "models/symptom_embedder"           # SentenceTransformer saved dir
CANDIDATE_EMBEDDER_JOBLIB = "models/embedder.joblib"          # alternate
CANDIDATE_SYM_ENCODER   = "models/symptom_encoder.pkl"        # MultiLabelBinarizer or symptom encoder
FALLBACK_SYM_CSV        = "data/symptoms_list.csv"            # fallback list of canonical symptoms

TOP_K = 5

# -------------------------
# Utility helpers
# -------------------------
def find_first_existing(paths):
    for p in paths:
        if p and os.path.exists(p):
            return p
    return None

def safe_load_joblib(path):
    try:
        return joblib.load(path)
    except Exception as e:
        print(f"Failed to load joblib from {path}: {e}")
        return None

# -------------------------
# Load model & label encoder
# -------------------------
sk_model_path = find_first_existing([CANDIDATE_SKLEARN_MODEL, "xgb_model.pkl", "models/disease_classifier.pkl", "models/disease_model.pkl"])
booster_path   = find_first_existing([CANDIDATE_XGB_BOOSTER, "models/xgb_model_booster.json", "xgb_model.json", "xgb_model.pkl"])
le_path        = find_first_existing([CANDIDATE_LE, "models/label_encoder.pkl", "label_encoder.pkl"])

sk_model = None
booster = None
label_encoder = None

if sk_model_path:
    try:
        print("🔄 Loading sklearn model:", sk_model_path)
        sk_model = safe_load_joblib(sk_model_path)
        print("✅ sklearn model loaded.")
    except Exception as e:
        print("Could not load sklearn model:", e)
        sk_model = None

if not sk_model and booster_path and xgb is not None:
    try:
        print("🔄 Loading xgboost booster:", booster_path)
        booster = xgb.Booster()
        booster.load_model(booster_path)
        print("✅ xgboost Booster loaded.")
    except Exception as e:
        print("Could not load booster:", e)
        booster = None

if le_path:
    label_encoder = safe_load_joblib(le_path)
    if label_encoder is not None:
        print("✅ LabelEncoder loaded.")
else:
    # If sklearn model exists and has classes_ attribute we can use it as fallback
    if sk_model is not None and hasattr(sk_model, "classes_"):
        print("ℹ️ No LabelEncoder file found; will use model.classes_ from sklearn model.")
    else:
        print("⚠️ No LabelEncoder file found. Booster inference requires a label encoder to decode outputs.")
        # We'll allow running but warn later if missing.

# -------------------------
# Load SentenceTransformer embedder
# -------------------------
embedder = None
embed_path = find_first_existing([CANDIDATE_EMBEDDER_DIR, CANDIDATE_EMBEDDER_JOBLIB, "models/symptom_embedder", "models/embedder.joblib"])
if embed_path:
    try:
        if os.path.isdir(embed_path):
            print("🔄 Loading SentenceTransformer from directory:", embed_path)
            embedder = SentenceTransformer(embed_path)
        else:
            print("🔄 Loading embedder joblib:", embed_path)
            embedder = joblib.load(embed_path)
            # If joblib stored a SentenceTransformer object, good. If it stored path, handle later.
        print("✅ Embedder ready.")
    except Exception as e:
        print("Failed to load embedder:", e)
        embedder = None
else:
    print("⚠️ No saved embedder found. Please save an embedder to 'models/symptom_embedder' or set CANDIDATE_EMBEDDER_DIR.")

# -------------------------
# Load canonical symptom list (for "recognized symptoms" printing)
# -------------------------
canonical_symptoms = []
# Prefer MultiLabelBinarizer / symptom encoder if present
sym_enc_path = find_first_existing([CANDIDATE_SYM_ENCODER, "models/symptom_encoder.pkl", "symptom_encoder.pkl", "models/symptom_encoder.joblib"])
if sym_enc_path:
    try:
        sym_enc = joblib.load(sym_enc_path)
        # MultiLabelBinarizer stores classes_ attribute
        if hasattr(sym_enc, "classes_"):
            canonical_symptoms = [s.lower() for s in sym_enc.classes_]
            print(f"✅ Loaded {len(canonical_symptoms)} canonical symptoms from encoder.")
    except Exception as e:
        print("⚠️ Could not load symptom encoder:", e)

# fallback: a simple CSV of symptom names (one per row) if provided
if not canonical_symptoms and os.path.exists(FALLBACK_SYM_CSV):
    try:
        import pandas as pd
        df_sym = pd.read_csv(FALLBACK_SYM_CSV)
        # Accept either column named 'Symptom' or first column
        col = None
        for c in df_sym.columns:
            if c.lower() == "symptom":
                col = c
                break
        if col is None:
            col = df_sym.columns[0]
        canonical_symptoms = [str(s).strip().lower() for s in df_sym[col].dropna().unique()]
        print(f"✅ Loaded {len(canonical_symptoms)} canonical symptoms from {FALLBACK_SYM_CSV}.")
    except Exception as e:
        print("⚠️ Could not load fallback symptom CSV:", e)

if not canonical_symptoms:
    print("⚠️ No canonical symptom list available. 'Recognized symptoms' will be limited to substring/fuzzy checks against nothing.")

# -------------------------
# Symptom recognition helper
# -------------------------
import re
def recognize_symptoms_from_text(text, top_k=10):
    """
    Return list of matched canonical symptoms from text, using:
      - substring presence of multi-word symptoms
      - fuzzy match on tokens for single-word symptoms
    """
    if not canonical_symptoms:
        return []

    text_l = text.lower()
    # direct substring match for multi-word symptoms (faster & accurate)
    found = set()
    for s in canonical_symptoms:
        s_spaced = s.replace("_", " ")
        if " " in s_spaced and s_spaced in text_l:
            found.add(s)

    # tokenize and fuzzy match single-word symptoms
    tokens = set(re.findall(r"\w+", text_l))
    for tok in tokens:
        # get close matches from canonical_symptoms limited to single-word candidates to save time
        candidates = [c for c in canonical_symptoms if " " not in c and "_" not in c]
        match = get_close_matches(tok, candidates, n=1, cutoff=0.85)
        if match:
            found.add(match[0])

    # Return sensible ordering (longer matches first)
    result = sorted(found, key=lambda s: -len(s))
    return result[:top_k]

# -------------------------
# Inference helpers
# -------------------------
def embed_text(text):
    if embedder is None:
        raise RuntimeError("Embedder not loaded. Cannot embed input text.")
    # SentenceTransformer expects a list
    vec = embedder.encode([text], convert_to_numpy=True)
    # returns 2D array shape (1, dim)
    return np.asarray(vec, dtype=np.float32)

def predict_with_sklearn(embedding, top_k=TOP_K):
    # embedding: 2D numpy array shape (1, dim) or 1D
    if sk_model is None:
        return None
    X = embedding if embedding.ndim == 2 else embedding.reshape(1, -1)
    proba = sk_model.predict_proba(X)[0]  # shape (n_classes,)
    # model may have classes_ attribute; if label_encoder provided, use it
    if label_encoder is not None:
        classes = label_encoder.inverse_transform(np.arange(len(proba)))
    elif hasattr(sk_model, "classes_"):
        classes = sk_model.classes_
    else:
        classes = np.arange(len(proba)).astype(str)
    # build top-k
    top_idx = np.argsort(proba)[-top_k:][::-1]
    return [(classes[i], float(proba[i])) for i in top_idx]

def predict_with_booster(embedding, top_k=TOP_K):
    if booster is None:
        return None
    # booster expects DMatrix
    dm = xgb.DMatrix(embedding)
    proba = booster.predict(dm)  # shape (n_samples, n_classes) if model trained with multi:softprob
    proba = proba[0] if proba.ndim == 2 else proba
    if label_encoder is None:
        raise RuntimeError("Booster loaded but no label encoder available to decode numeric labels -> disease names.")
    classes = label_encoder.inverse_transform(np.arange(len(proba)))
    top_idx = np.argsort(proba)[-TOP_K:][::-1]
    return [(classes[i], float(proba[i])) for i in top_idx]

# -------------------------
# Main interactive loop
# -------------------------
def interactive_loop():
    print("\n=== Medical Predictor ===")
    if sk_model:
        print("Model: sklearn XGBClassifier")
    elif booster:
        print("Model: xgboost Booster")
    else:
        print("No model loaded. Exiting.")
        return

    if embedder is None:
        print("No embedder loaded. Exiting.")
        return

    print("Type a sentence describing symptoms. Type 'q' or 'quit' to exit.\n")

    while True:
        try:
            text = input("Describe your symptoms (or 'q' to quit): ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye.")
            break
        if not text:
            continue
        if text.lower() in {"q", "quit", "exit"}:
            print("Goodbye.")
            break

        # Recognize symptoms (best-effort)
        try:
            recognized = recognize_symptoms_from_text(text)
        except Exception as e:
            recognized = []
        if recognized:
            print("🔍 Recognized Symptoms:", recognized)
        else:
            print("🔍 Recognized Symptoms: None found")

        # Embed
        try:
            emb = embed_text(text)  # shape (1, dim)
        except Exception as e:
            print("❌ Failed to embed text:", e)
            continue

        # Predict
        try:
            if sk_model is not None:
                preds = predict_with_sklearn(emb, top_k=TOP_K)
            else:
                preds = predict_with_booster(emb, top_k=TOP_K)
            if not preds:
                print("No predictions returned.")
                continue

            print("\nPredictions:")
            for label, p in preds:
                # probability might be in [0,1], print as percentage if small
                if 0 <= p <= 1:
                    print(f" - {label} ({p*100:.2f}%)")
                else:
                    print(f" - {label} (score={p})")
            print()
        except Exception as e:
            print("❌ Prediction error:", e)
            continue

if __name__ == "__main__":
    interactive_loop()
