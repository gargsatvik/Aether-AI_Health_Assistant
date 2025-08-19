import pandas as pd

# Load your dataset
df = pd.read_csv("data/merged.csv")   # adjust path if needed

# Extract all symptom columns (skip the first 'Disease' column)
symptom_columns = df.columns[1:]

# Convert one-hot encoded symptoms into a list of present symptoms
def row_to_symptoms(row):
    return [symptom for symptom in symptom_columns if row[symptom] == 1]

# Create a "symptoms" column as a list
df["symptoms"] = df.apply(row_to_symptoms, axis=1)

# Convert the list into a sentence
df["symptoms_sentence"] = df["symptoms"].apply(lambda x: " ".join(x))

# Save to new file
df[["Disease", "symptoms_sentence"]].to_csv("data/merged_sentences.csv", index=False)

print("✅ Preprocessing done! Saved to data/merged_sentences.csv")
print(df.head())
