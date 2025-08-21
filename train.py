import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
from sklearn.metrics import classification_report

def main():
    print("📂 Loading precomputed embeddings...")
    X = np.load("symptom_embeddings.npy")      # shape (N, 384)
    sentences = np.load("sentences.npy", allow_pickle=True)
    
    print("📂 Loading synthetic patient data...")
    df = pd.read_csv("synthetic_patients.csv")  # contains Disease + symptoms_sentence
    y = df["Disease"].values

    print(f"✅ After mapping: {X.shape}, {y.shape}")
    print(f"🔎 Example labels: {np.unique(y)[:10]}")

    # -------------------------
    # 🛠 Drop rare classes (<2 samples)
    # -------------------------
    unique, counts = np.unique(y, return_counts=True)
    freq = dict(zip(unique, counts))

    mask = np.array([freq[label] > 1 for label in y])
    X, y = X[mask], y[mask]

    print(f"✅ After dropping rare classes: {X.shape}, {len(np.unique(y))} classes remain")

    # -------------------------
    # Split with stratify
    # -------------------------
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"✅ Train: {X_train.shape}, Test: {X_test.shape}")

    # -------------------------
    # Train XGBoost
    # -------------------------
    clf = XGBClassifier(
        n_estimators=500,
        max_depth=10,
        learning_rate=0.1,
        tree_method="hist",  # MUCH faster for large datasets
        n_jobs=-1,
        verbosity=1
    )

    print("🚀 Training XGBoost...")
    clf.fit(X_train, y_train)

    # -------------------------
    # Evaluate
    # -------------------------
    y_pred = clf.predict(X_test)
    print("📊 Classification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))

if __name__ == "__main__":
    main()
