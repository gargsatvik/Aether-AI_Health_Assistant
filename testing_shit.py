# train.py (robust to xgboost API differences)
import time, os
import numpy as np
import pandas as pd
from collections import Counter
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.utils import shuffle
from sklearn.metrics import classification_report, accuracy_score
import joblib

# xgboost import (both high-level and low-level)
import xgboost as xgb
from xgboost import XGBClassifier

# -----------------------
# Config
# -----------------------
EMBED_PATH = "data/symptom_embeddings.npz"
SYNTHETIC_CSV = "data/synthetic_patient_data.csv"
MODEL_OUT_SKLEARN = "models/xgb_model_sklearn.joblib"
MODEL_OUT_BOOSTER = "models/xgb_model_booster.json"
LE_OUT = "models/label_encoder.joblib"

CAP_TOTAL_SAMPLES = 200_000
PER_CLASS_CAP = 500
MIN_SAMPLES_PER_CLASS = 2
TEST_SIZE = 0.2
RANDOM_STATE = 42

N_ESTIMATORS = 200
LEARNING_RATE = 0.1
MAX_DEPTH = 6

def ensure_dir(path):
    d = os.path.dirname(path)
    if d and not os.path.exists(d):
        os.makedirs(d, exist_ok=True)

# -----------------------
# Load embeddings
# -----------------------
print("📂 Loading precomputed embeddings...")
data = np.load(EMBED_PATH, allow_pickle=True)
if "embeddings" not in data or "sentences" not in data:
    raise KeyError("NPZ must contain keys 'embeddings' and 'sentences'")
X_all = data["embeddings"]
sentences_all = data["sentences"]
print(f"✅ Loaded embeddings: {X_all.shape}, sentences: {sentences_all.shape}")

# -----------------------
# Load CSV and map sentences->disease
# -----------------------
print("\n📂 Loading synthetic patient data / merged CSV ...")
df = pd.read_csv(SYNTHETIC_CSV)
# detect columns
possible_disease = [c for c in df.columns if c.lower() in ("disease","prognosis","diagnosis")]
disease_col = possible_disease[0] if possible_disease else df.columns[0]
# pick a sentence-like column
possible_sentence = [c for c in df.columns if "symptom" in c.lower() or "sentence" in c.lower() or "symptoms"==c.lower()]
sentence_col = possible_sentence[0] if possible_sentence else (df.columns[1] if len(df.columns)>1 else df.columns[0])
print(f"Using disease col = '{disease_col}', sentence col = '{sentence_col}'")

def norm_text(s):
    if pd.isna(s): return ""
    return " ".join(str(s).strip().lower().split())

df[disease_col] = df[disease_col].astype(str).str.strip()
df[sentence_col] = df[sentence_col].astype(str).apply(norm_text)

mapping = {}
for _, r in df[[disease_col, sentence_col]].iterrows():
    s = r[sentence_col]
    if s == "": continue
    if s not in mapping:
        mapping[s] = r[disease_col]
print(f"✅ Built mapping for {len(mapping):,} unique sentences -> diseases")

# -----------------------
# Map embeddings -> labels
# -----------------------
print("\n🔎 Mapping embeddings' sentences to disease labels...")
sent_norm = [(" ".join(str(s).strip().lower().split())) for s in sentences_all]
X_list, y_list = [], []
mapped = 0
for xi, s in zip(X_all, sent_norm):
    d = mapping.get(s)
    if d is not None:
        X_list.append(xi)
        y_list.append(d)
        mapped += 1
print(f" - mapped {mapped:,} embeddings to disease labels")

if mapped == 0:
    raise RuntimeError("No embeddings mapped to labels. Check normalization and CSV.")

X = np.vstack(X_list).astype(np.float32)
y = np.array(y_list, dtype=object)
print(f"✅ After mapping: {X.shape[0]:,} samples")

# -----------------------
# Filter and cap per-class
# -----------------------
counter = Counter(y)
eligible = {label for label,cnt in counter.items() if cnt >= MIN_SAMPLES_PER_CLASS}
mask = np.array([lab in eligible for lab in y])
X = X[mask]
y = y[mask]
counter = Counter(y)
print(f"After filtering classes with <{MIN_SAMPLES_PER_CLASS} samples: {len(counter)} classes, {X.shape[0]:,} samples")

selected_X = []
selected_y = []
rng = np.random.RandomState(RANDOM_STATE)
for label in counter:
    idxs = np.where(y == label)[0]
    if len(idxs) > PER_CLASS_CAP:
        idxs = rng.choice(idxs, PER_CLASS_CAP, replace=False)
    selected_X.append(X[idxs])
    selected_y.append(y[idxs])

X = np.vstack(selected_X)
y = np.concatenate(selected_y)
X, y = shuffle(X, y, random_state=RANDOM_STATE)
if X.shape[0] > CAP_TOTAL_SAMPLES:
    X = X[:CAP_TOTAL_SAMPLES]
    y = y[:CAP_TOTAL_SAMPLES]
print(f"Final dataset: {X.shape}, unique labels: {len(set(y))}")

# -----------------------
# Label encode and split
# -----------------------
le = LabelEncoder()
y_encoded = le.fit_transform(y)
classes = le.classes_
print(f"Training on {len(classes)} classes")

# if any class has <2 samples after capping, fallback to non-stratified split
if np.min(np.bincount(y_encoded)) < 2:
    print("Warning: some classes <2 samples after capping. Doing non-stratified split.")
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=TEST_SIZE, random_state=RANDOM_STATE)
else:
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y_encoded)

print(f"Train: {X_train.shape}, Test: {X_test.shape}")

# -----------------------
# Train: try sklearn.fit with early_stopping, fallback to xgb.train
# -----------------------
num_classes = len(classes)
xgb_params = {
    "objective": "multi:softprob",
    "num_class": num_classes,
    "eta": LEARNING_RATE,
    "max_depth": MAX_DEPTH,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "lambda": 1.0,
    "alpha": 0.1,
    "eval_metric": "mlogloss"
}

print("\n🚀 Training XGBoost (attempt sklearn API with early stopping)...")
trained_with_sklearn = False
clf = XGBClassifier(
    objective="multi:softprob",
    learning_rate=LEARNING_RATE,
    max_depth=MAX_DEPTH,
    n_estimators=N_ESTIMATORS,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_lambda=1.0,
    reg_alpha=0.1,
    verbosity=1,
    n_jobs=-1,
    use_label_encoder=False  # avoid warning in newer xgboost
)

try:
    # many xgboost versions accept early_stopping_rounds in sklearn fit
    clf.fit(X_train, y_train,
            eval_set=[(X_test, y_test)],
            early_stopping_rounds=20,
            verbose=50)
    trained_with_sklearn = True
    model_to_save = clf
    print("✅ Trained using sklearn XGBClassifier.fit()")
except TypeError as e:
    print("⚠️ sklearn.fit(...) didn't accept early_stopping_rounds — falling back to xgb.train().")
    print("TypeError:", e)
    # low-level train
    dtrain = xgb.DMatrix(X_train, label=y_train)
    dtest = xgb.DMatrix(X_test, label=y_test)
    bst = xgb.train(
        params=xgb_params,
        dtrain=dtrain,
        num_boost_round=N_ESTIMATORS,
        evals=[(dtest, "eval")],
        early_stopping_rounds=20,
        verbose_eval=50
    )
    trained_with_sklearn = False
    model_to_save = bst
    print("✅ Trained using xgb.train() (booster)")

# -----------------------
# Evaluation
# -----------------------
print("\n📊 Evaluating on test set...")
if trained_with_sklearn:
    y_pred = model_to_save.predict(X_test)
else:
    y_prob = model_to_save.predict(xgb.DMatrix(X_test))
    y_pred = np.argmax(y_prob, axis=1)

acc = accuracy_score(y_test, y_pred)
print(f"Accuracy: {acc:.4f}")
print("\nClassification report:")
print(classification_report(y_test, y_pred, zero_division=0))

# -----------------------
# Save model + label encoder
# -----------------------
ensure_dir(MODEL_OUT_SKLEARN)
ensure_dir(MODEL_OUT_BOOSTER)
ensure_dir(LE_OUT)

if trained_with_sklearn:
    joblib.dump(model_to_save, MODEL_OUT_SKLEARN)
    print(f"📦 Saved sklearn XGBClassifier -> {MODEL_OUT_SKLEARN}")
else:
    model_to_save.save_model(MODEL_OUT_BOOSTER)
    print(f"📦 Saved xgboost Booster -> {MODEL_OUT_BOOSTER}")

joblib.dump(le, LE_OUT)
print(f"📦 Saved LabelEncoder -> {LE_OUT}")

print("\nAll done ✅")
