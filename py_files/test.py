from datasets import load_dataset
import pandas as pd

# Attempt loading English dataset
try:
    dataset = load_dataset("MedDG/meddialog", "meddialog-en")
    print("✅ MedDialog English dataset loaded successfully.")
except Exception as e:
    print("Failed to load MedDialog dataset:", e)
    dataset = None

if dataset:
    # dataset looks like: {'train': Dataset, 'test': Dataset}
    print(dataset)

    def extract_dialogue(example):
        return {
            "doctor": example.get("doctor", ""),
            "patient": example.get("patient", "")
        }

    processed = dataset["train"].map(
        extract_dialogue,
        remove_columns=dataset["train"].column_names
    )
    df = pd.DataFrame(processed)
    print("Preview of dialogues:")
    print(df.head())
else:
    print("Could not load MedDialog. Please check the dataset ID or your internet connection.")
