import pandas as pd
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib

# Load synthetic patient dataset
df = pd.read_csv("data/synthetic_patient_data.csv")

# Convert symptoms string → list
df["Symptoms"] = df["Symptoms"].apply(lambda x: [s.strip() for s in x.split(",")])

# Encode symptoms
mlb = MultiLabelBinarizer()
X = mlb.fit_transform(df["Symptoms"])
y = df["Disease"]

# Split train/test
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = RandomForestClassifier(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print("✅ Accuracy:", accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred))

# Save model + encoder
joblib.dump(model, "data/disease_model.pkl")
joblib.dump(mlb, "data/symptom_encoder.pkl")
print("💾 Model & encoder saved in /data/")
