import pandas as pd

data=pd.read_csv("data/dataset.csv")
description=pd.read_csv("data/symptom_Description.csv")
precaution=pd.read_csv("data/symptom_Precaution.csv")
weight=pd.read_csv("data/Symptom-severity.csv")

def clean_symptom_name(symptom):
    return symptom.strip().lower().replace('_', ' ')

precaution['Disease'] = data['Disease'].apply(clean_symptom_name)
data['Disease'] = data['Disease'].apply(clean_symptom_name)
description['Disease'] = description['Disease'].apply(clean_symptom_name)
description['Description'] = description['Description'].apply(clean_symptom_name)

df_long = data.melt(id_vars=["Disease"],
    value_vars=[col for col in data.columns if col.startswith("Symptom_")],
    var_name="Symptom_Number",
    value_name="Symptom"
    )

df_long = df_long.dropna(subset=["Symptom"])
df_long["Symptom"] = df_long["Symptom"].str.strip()


df_merged = df_long.merge(weight, on="Symptom", how="left")

#df_merged = df_merged.merge(description, on="Symptom", how="left")

df_wide = df_merged.pivot_table(
    index="Disease",
    columns="Symptom",
    values="weight",
    fill_value=0
).reset_index()

df_wide.to_csv("data/merged_dataset.csv", index=False)

print(df_wide.head(10))
