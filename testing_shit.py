import pandas as pd

df = pd.read_csv("data/synthetic_patient_data.csv")

all_symptoms = set()
for s_list in df["Symptoms"]:
    for s in s_list.split(","):
        all_symptoms.add(s.strip().lower())

# Save as CSV
pd.DataFrame({"Symptom": list(all_symptoms)}).to_csv("data/symptoms_list.csv", index=False)
print("✅ symptoms_list.csv created")
