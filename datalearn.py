import pandas as pd
import random

# Load master dataset
df = pd.read_csv("data/dataset.csv")

# Precompute all symptoms once
all_symptoms = set(df.iloc[:, 1:].stack().dropna().unique())

synthetic_data = []

for _, row in df.iterrows():
    disease = row["Disease"]
    symptoms = [sym for sym in row[1:] if pd.notna(sym)]

    for _ in range(10):  # fewer synthetic patients to test
        reported = random.sample(symptoms, k=max(1, random.randint(len(symptoms)//2, len(symptoms))))
        noise = random.sample(list(all_symptoms - set(symptoms)), k=random.randint(0, 3))
        final_symptoms = list(set(reported + noise))
        
        synthetic_data.append({
            "Disease": disease,
            "Symptoms": ", ".join(final_symptoms)
        })

synthetic_df = pd.DataFrame(synthetic_data).sample(frac=1, random_state=42).reset_index(drop=True)
synthetic_df.to_csv("data/synthetic_patient_data.csv", index=False)
print(synthetic_df.head(), "\nGenerated:", len(synthetic_df), "records")
