import pandas as pd
from sentence_transformers import SentenceTransformer
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
import joblib

# ============================
# 1. Load Preprocessed Dataset
# ============================
df = pd.read_csv("data/merged_sentences.csv")

# Ensure no NaN in symptoms_sentence
df["symptoms_sentence"] = df["symptoms_sentence"].fillna("").astype(str)

print("✅ Loaded dataset with shape:", df.shape)
print(df.head())

# ============================
# 2. Encode Symptoms Sentences
# ============================
model_name = "sentence-transformers/all-MiniLM-L6-v2"
embedder = SentenceTransformer(model_name)

print("⚡ Encoding symptoms into embeddings...")
X = embedder.encode(df["symptoms_sentence"].tolist(), convert_to_numpy=True, show_progress_bar=True)

y = df["Disease"].astype(str)  # Ensure labels are strings

# ============================
# 3. Train/Test Split
# ============================
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# ============================
# 4. Train Classifier
# ============================
clf = LogisticRegression(max_iter=5000, verbose=1)
clf.fit(X_train, y_train)

# ============================
# 5. Evaluate
# ============================
y_pred = clf.predict(X_test)
print("\n📊 Classification Report:\n")
print(classification_report(y_test, y_pred))

# ============================
# 6. Save Model + Encoder
# ============================
joblib.dump(clf, "models/disease_classifier.pkl")
embedder.save("models/symptom_embedder")

print("\n✅ Training complete! Model and embedder saved in /models/")
