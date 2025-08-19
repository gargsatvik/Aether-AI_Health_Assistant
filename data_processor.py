import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
import logging
import random

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HealthDataProcessor:
    """Handles all data processing operations for the health app."""
    
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.weights_dict = {}
        self.all_symptoms = []
        
    def load_and_merge_data(self) -> pd.DataFrame:
        """Load and merge the main dataset with symptom severity weights."""
        try:
            # Load datasets
            df = pd.read_csv(f"{self.data_dir}/dataset.csv")
            weights_df = pd.read_csv(f"{self.data_dir}/Symptom-severity.csv")
            
            logger.info(f"Loaded main dataset with {len(df)} records")
            logger.info(f"Loaded symptom severity data with {len(weights_df)} symptoms")
            
            # Normalize symptom names in weights CSV
            weights_df["Symptom"] = (
                weights_df["Symptom"].str.strip().str.lower().str.replace("_", " ")
            )
            self.weights_dict = dict(zip(weights_df["Symptom"], weights_df["weight"]))
            
            # Identify symptom columns in dataset
            symptom_cols = [col for col in df.columns if col.startswith("Symptom")]
            
            # Get all unique symptoms from dataset (normalized)
            self.all_symptoms = sorted(
                pd.Series(df[symptom_cols].values.ravel())
                .dropna()
                .str.strip()
                .str.lower()
                .str.replace("_", " ")
                .unique()
            )
            
            # Create binary matrix more efficiently
            # First, normalize the symptom values in the original dataset
            df_normalized = df.copy()
            for col in symptom_cols:
                df_normalized[col] = df_normalized[col].str.strip().str.lower().str.replace("_", " ")
            
            # Create binary matrix using pandas operations
            binary_data = {}
            for symptom in self.all_symptoms:
                binary_data[symptom] = df_normalized[symptom_cols].apply(
                    lambda row: 1 if symptom in row.values else 0, axis=1
                )
            
            binary_matrix = pd.DataFrame(binary_data)
            
            # Apply weights using normalized names
            weighted_matrix = binary_matrix.apply(
                lambda col: col * self.weights_dict.get(col.name, 0)
            )
            
            # Final dataframe
            final_df = pd.concat([df[["Disease"]], weighted_matrix], axis=1)
            
            logger.info(f"Created merged dataset with {len(final_df)} records and {len(self.all_symptoms)} symptoms")
            return final_df
            
        except Exception as e:
            logger.error(f"Error loading and merging data: {e}")
            raise
    
    def generate_synthetic_data(self, df: pd.DataFrame, samples_per_disease: int = 10) -> pd.DataFrame:
        """Generate synthetic patient data for training."""
        try:
            # Get symptom columns (excluding Disease)
            symptom_cols = [col for col in df.columns if col != "Disease"]
            
            synthetic_data = []
            
            for _, row in df.iterrows():
                disease = row["Disease"]
                # Get symptoms that are present (weight > 0)
                present_symptoms = [col for col in symptom_cols if row[col] > 0]
                
                for _ in range(samples_per_disease):
                    # Sample from present symptoms
                    num_symptoms = max(1, len(present_symptoms) // 2)
                    reported = random.sample(present_symptoms, k=min(num_symptoms, len(present_symptoms)))
                    
                    # Add some noise (symptoms not typically associated with this disease)
                    other_symptoms = [col for col in symptom_cols if col not in present_symptoms]
                    noise_count = min(2, len(other_symptoms))
                    if noise_count > 0:
                        noise = random.sample(other_symptoms, k=noise_count)
                        reported.extend(noise)
                    
                    # Create symptom string
                    symptoms_str = ", ".join(reported)
                    
                    synthetic_data.append({
                        "Disease": disease,
                        "Symptoms": symptoms_str
                    })
            
            synthetic_df = pd.DataFrame(synthetic_data)
            synthetic_df = synthetic_df.sample(frac=1, random_state=42).reset_index(drop=True)
            
            logger.info(f"Generated {len(synthetic_df)} synthetic records")
            return synthetic_df
            
        except Exception as e:
            logger.error(f"Error generating synthetic data: {e}")
            raise
    
    def save_merged_data(self, df: pd.DataFrame, filename: str = "merged.csv"):
        """Save the merged dataset."""
        try:
            filepath = f"{self.data_dir}/{filename}"
            df.to_csv(filepath, index=False)
            logger.info(f"Saved merged data to {filepath}")
        except Exception as e:
            logger.error(f"Error saving merged data: {e}")
            raise
    
    def get_symptom_info(self) -> Dict:
        """Get information about symptoms and their weights."""
        return {
            "total_symptoms": len(self.all_symptoms),
            "symptom_weights": self.weights_dict,
            "all_symptoms": self.all_symptoms
        }
