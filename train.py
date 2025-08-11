import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import joblib

# 1. Load your merged dataset
df = pd.read_csv("data/merged.csv")

# 3. Separate features and target
X = df.drop(columns=["prognosis"])
y = df["prognosis"]

# 4. Train/test split WITHOUT stratify
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 5. Train model
model = RandomForestClassifier(random_state=42)
model.fit(X_train, y_train)

# 6. Evaluate
y_pred = model.predict(X_test)
print("Accuracy:", accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred))

# 7. Save model
joblib.dump(model, "data/disease_model.pkl")
print("Model saved as disease_model.pkl")
