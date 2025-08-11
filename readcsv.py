import pandas as pd

# Load datasets
df = pd.read_csv(r"data\dataset.csv")
weights_df = pd.read_csv(r"data\Symptom-severity.csv")

# Normalize symptom names in weights CSV
weights_df["Symptom"] = (
    weights_df["Symptom"].str.strip().str.lower().str.replace("_", " ")
)
weights_dict = dict(zip(weights_df["Symptom"], weights_df["weight"]))

# Identify symptom columns in dataset
symptom_cols = [col for col in df.columns if col.startswith("Symptom")]

# Get all unique symptoms from dataset (normalized)
all_symptoms = sorted(
    pd.Series(df[symptom_cols].values.ravel())
    .dropna()
    .str.strip()
    .str.lower()
    .str.replace("_", " ")
    .unique()
)

# Create binary matrix for normalized symptoms
binary_matrix = pd.DataFrame(
    [[1 if symptom in row.str.strip().str.lower().str.replace("_", " ").values else 0
      for symptom in all_symptoms]
     for _, row in df[symptom_cols].iterrows()],
    columns=all_symptoms
)

# Apply weights using normalized names
weighted_matrix = binary_matrix.apply(
    lambda col: col * weights_dict.get(col.name, 0)
)

# Final dataframe
final_df = pd.concat([df[["Disease"]], weighted_matrix], axis=1)
final_df.to_csv(r"data\merged.csv", index=False)

print(final_df.head())
