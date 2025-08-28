# definitive_train.py
import pandas as pd
from sentence_transformers import SentenceTransformer
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder
import joblib
import numpy as np
from collections import Counter

# ============================
# 1. Load and Preprocess Raw Dataset
# ============================
print("📂 Loading raw dataset 'data/merged.csv'...")
try:
    df = pd.read_csv("data/merged.csv")
except FileNotFoundError:
    print("❌ ERROR: 'data/merged.csv' not found. Please ensure the file is in the correct directory.")
    exit()

# Identify symptom columns (all columns except the first 'Disease' column)
symptom_columns = df.columns[1:]

def combine_symptoms(row):
    """Combines all symptom columns into a single, clean sentence."""
    # Cleans up symptoms: converts to string, strips whitespace, replaces underscores
    symptoms = [str(s).strip().replace('_', ' ') for s in row if pd.notna(s) and str(s).strip()]
    return ', '.join(symptoms)

print("🔄 Preprocessing data: combining symptoms into sentences...")
df['Symptoms'] = df[symptom_columns].apply(combine_symptoms, axis=1)

# Create a clean DataFrame for training
df_processed = df[['Disease', 'Symptoms']].copy()
df_processed.dropna(subset=['Disease', 'Symptoms'], inplace=True)
df_processed = df_processed[df_processed['Symptoms'] != ''] # Remove rows with no symptoms

print(f"✅ Preprocessing complete. Using {len(df_processed)} valid data rows.")

# ============================
# 2. Handle Class Imbalance (Crucial for Accuracy)
# ============================
# Some diseases may have very few samples. We'll remove classes with fewer than 5 samples.
MIN_SAMPLES_PER_CLASS = 5
class_counts = df_processed['Disease'].value_counts()
diseases_to_keep = class_counts[class_counts >= MIN_SAMPLES_PER_CLASS].index
df_final = df_processed[df_processed['Disease'].isin(diseases_to_keep)]

print(f"✅ Filtered rare diseases. Training with {len(df_final)} samples across {len(diseases_to_keep)} diseases.")

# ============================
# 3. Encode Symptoms Sentences
# ============================
model_name = "sentence-transformers/all-MiniLM-L6-v2"
embedder = SentenceTransformer(model_name)

print("⚡ Encoding symptoms into embeddings... (This is the main processing step)")
X = embedder.encode(df_final["Symptoms"].tolist(), convert_to_numpy=True, show_progress_bar=True)

# Use LabelEncoder for integer labels required by XGBoost
le = LabelEncoder()
y = le.fit_transform(df_final["Disease"].astype(str))

# ============================
# 4. Train/Test Split
# ============================
print("🔪 Splitting data for training and testing...")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# ============================
# 5. Train XGBoost Classifier
# ============================
print("🚀 Training XGBoost model...")
clf = XGBClassifier(
    n_estimators=300,          # Increased estimators for better performance
    max_depth=7,               # Slightly deeper trees
    learning_rate=0.05,        # A smaller learning rate often improves accuracy
    objective='multi:softprob',
    n_jobs=-1,
    use_label_encoder=False,
    eval_metric='mlogloss'
)

clf.fit(X_train, y_train)

# ============================
# 6. Evaluate
# ============================
print("\n📊 Evaluating model performance...")
y_pred = clf.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"\n🎯 Model Accuracy: {accuracy:.2%}")

y_test_labels = le.inverse_transform(y_test)
y_pred_labels = le.inverse_transform(y_pred)
print("\nClassification Report:\n")
print(classification_report(y_test_labels, y_pred_labels, zero_division=0))

# ============================
# 7. Save Models
# ============================
# Overwrite the old models with our new, improved ones
joblib.dump(clf, "models/disease_classifier_latest.pkl")
embedder.save("models/symptom_embedder_latest")
joblib.dump(le, "models/label_encoder_latest.joblib")

print("\n✅ Training complete! New, more accurate XGBoost model saved in /models/")
