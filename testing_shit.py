import numpy as np
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

# 📂 Load precomputed embeddings
print("📂 Loading precomputed embeddings...")
data = np.load("data/symptom_embeddings.npz", allow_pickle=True)

X = data["embeddings"]       # shape: (N, 384)
y = data["sentences"]        # labels (strings)

print(f"✅ Loaded: {X.shape}, Labels: {y.shape}")

# 🎯 Encode labels into integers (XGBoost needs numeric targets)
from sklearn.preprocessing import LabelEncoder
label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)

# 🧪 Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42
)

print(f"Training size: {X_train.shape}, Test size: {X_test.shape}")

# ⚡ XGBoost model
clf = XGBClassifier(
    objective="multi:softmax",       # multi-class classification
    num_class=len(np.unique(y_encoded)),  
    tree_method="hist",              # fast & memory efficient
    eval_metric="mlogloss",
    use_label_encoder=False,
    n_jobs=-1,
    max_depth=8,                     # you can tune these
    learning_rate=0.1,
    n_estimators=200
)

print("🚀 Training XGBoost...")
clf.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=True)

# ✅ Accuracy check
from sklearn.metrics import accuracy_score
y_pred = clf.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"✅ Accuracy: {acc:.4f}")

# 💾 Save model + label encoder
import joblib
joblib.dump(clf, "xgb_model.pkl")
joblib.dump(label_encoder, "label_encoder.pkl")

print("📦 Model + LabelEncoder saved.")
