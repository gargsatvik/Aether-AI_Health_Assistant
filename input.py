import pandas as pd
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.ensemble import RandomForestClassifier
from difflib import get_close_matches
import joblib

# ------------------
# TRAINING
# ------------------

# Load synthetic dataset
df = pd.read_csv("data/synthetic_patient_data.csv")

# Convert Symptoms to list
df["Symptoms"] = df["Symptoms"].apply(lambda x: [s.strip() for s in x.split(",")])

# Encode symptoms
mlb = MultiLabelBinarizer()
X = mlb.fit_transform(df["Symptoms"])
y = df["Disease"]

# Train a model
model = RandomForestClassifier(n_estimators=200, random_state=42)
model.fit(X, y)

# Save model + symptom encoder
joblib.dump(model, "disease_model.pkl")
joblib.dump(mlb, "symptom_encoder.pkl")

# ------------------
# PREDICTION
# ------------------

# Load model & encoder
model = joblib.load("disease_model.pkl")
mlb = joblib.load("symptom_encoder.pkl")

all_symptoms = mlb.classes_

def predict_disease(user_input, top_n=3):
    # Split and fuzzy match input to known symptoms
    reported = []
    for symptom in user_input.split(","):
        symptom = symptom.strip().lower()
        match = get_close_matches(symptom, all_symptoms, n=1, cutoff=0.6)
        if match:
            reported.append(match[0])
    
    # Encode
    X_user = mlb.transform([reported])
    
    # Predict probabilities
    probs = model.predict_proba(X_user)[0]
    top_indices = probs.argsort()[-top_n:][::-1]
    
    results = [(model.classes_[i], round(probs[i]*100, 2)) for i in top_indices]
    return results

# ------------------
# Example run
# ------------------
while True:
    user_input = input("\nEnter symptoms separated by commas (or 'quit'): ")
    if user_input.lower() == "quit":
        break
    
    predictions = predict_disease(user_input)
    print("Predictions:")
    for disease, prob in predictions:
        print(f"- {disease} ({prob}%)")
