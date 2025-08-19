import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from sklearn.preprocessing import StandardScaler
import joblib
import logging
from typing import Dict, List, Tuple, Any
import matplotlib.pyplot as plt
import seaborn as sns
import os

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HealthModelTrainer:
    """Handles model training, evaluation, and optimization for the health app."""
    
    def __init__(self, models_dir: str = "models"):
        self.models_dir = models_dir
        self.models = {}
        self.best_model = None
        self.best_score = 0
        self.scaler = StandardScaler()
        
        # Ensure models directory exists
        os.makedirs(models_dir, exist_ok=True)
        
    def prepare_data(self, df: pd.DataFrame, test_size: float = 0.2, random_state: int = 42):
        """Prepare data for training by separating features and target."""
        try:
            # Separate features and target
            X = df.drop(columns=["Disease"])
            y = df["Disease"]
            
            # Split the data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=random_state, stratify=y
            )
            
            # Scale the features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            logger.info(f"Data prepared: {X_train.shape[0]} training samples, {X_test.shape[0]} test samples")
            
            return X_train_scaled, X_test_scaled, y_train, y_test, X.columns.tolist()
            
        except Exception as e:
            logger.error(f"Error preparing data: {e}")
            raise
    
    def train_models(self, X_train: np.ndarray, y_train: np.ndarray, feature_names: List[str]):
        """Train multiple models and compare their performance."""
        try:
            # Define models to try
            models = {
                'RandomForest': RandomForestClassifier(random_state=42, n_jobs=-1),
                'GradientBoosting': GradientBoostingClassifier(random_state=42),
                'LogisticRegression': LogisticRegression(random_state=42, max_iter=1000),
                'SVM': SVC(random_state=42, probability=True)
            }
            
            # Train and evaluate each model
            for name, model in models.items():
                logger.info(f"Training {name}...")
                
                # Perform cross-validation
                cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='accuracy')
                
                # Train on full training set
                model.fit(X_train, y_train)
                
                # Store model and scores
                self.models[name] = {
                    'model': model,
                    'cv_mean': cv_scores.mean(),
                    'cv_std': cv_scores.std(),
                    'feature_names': feature_names
                }
                
                logger.info(f"{name} - CV Accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
                
                # Update best model
                if cv_scores.mean() > self.best_score:
                    self.best_score = cv_scores.mean()
                    self.best_model = name
            
            logger.info(f"Best model: {self.best_model} with CV accuracy: {self.best_score:.4f}")
            
        except Exception as e:
            logger.error(f"Error training models: {e}")
            raise
    
    def hyperparameter_optimization(self, X_train: np.ndarray, y_train: np.ndarray, model_name: str = 'RandomForest'):
        """Perform hyperparameter optimization for the specified model."""
        try:
            if model_name == 'RandomForest':
                param_grid = {
                    'n_estimators': [100, 200, 300],
                    'max_depth': [10, 20, None],
                    'min_samples_split': [2, 5, 10],
                    'min_samples_leaf': [1, 2, 4]
                }
                model = RandomForestClassifier(random_state=42, n_jobs=-1)
            elif model_name == 'GradientBoosting':
                param_grid = {
                    'n_estimators': [100, 200],
                    'learning_rate': [0.01, 0.1, 0.2],
                    'max_depth': [3, 5, 7]
                }
                model = GradientBoostingClassifier(random_state=42)
            else:
                logger.warning(f"Hyperparameter optimization not implemented for {model_name}")
                return
            
            logger.info(f"Performing hyperparameter optimization for {model_name}...")
            
            # Grid search with cross-validation
            grid_search = GridSearchCV(
                model, param_grid, cv=5, scoring='accuracy', n_jobs=-1, verbose=1
            )
            grid_search.fit(X_train, y_train)
            
            # Update the best model
            self.models[model_name]['model'] = grid_search.best_estimator_
            self.models[model_name]['best_params'] = grid_search.best_params_
            self.models[model_name]['cv_mean'] = grid_search.best_score_
            
            logger.info(f"Best parameters for {model_name}: {grid_search.best_params_}")
            logger.info(f"Best CV score: {grid_search.best_score_:.4f}")
            
        except Exception as e:
            logger.error(f"Error in hyperparameter optimization: {e}")
            raise
    
    def evaluate_models(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, Dict]:
        """Evaluate all trained models on the test set."""
        try:
            results = {}
            
            for name, model_info in self.models.items():
                model = model_info['model']
                y_pred = model.predict(X_test)
                y_pred_proba = model.predict_proba(X_test) if hasattr(model, 'predict_proba') else None
                
                # Calculate metrics
                accuracy = accuracy_score(y_test, y_pred)
                report = classification_report(y_test, y_pred, output_dict=True)
                
                results[name] = {
                    'accuracy': accuracy,
                    'classification_report': report,
                    'predictions': y_pred,
                    'probabilities': y_pred_proba
                }
                
                logger.info(f"{name} - Test Accuracy: {accuracy:.4f}")
            
            return results
            
        except Exception as e:
            logger.error(f"Error evaluating models: {e}")
            raise
    
    def save_models(self, save_scaler: bool = True):
        """Save all trained models and the scaler."""
        try:
            for name, model_info in self.models.items():
                model_path = os.path.join(self.models_dir, f"{name.lower()}_model.pkl")
                joblib.dump(model_info['model'], model_path)
                logger.info(f"Saved {name} model to {model_path}")
            
            # Save the best model separately
            if self.best_model:
                best_model_path = os.path.join(self.models_dir, "best_model.pkl")
                joblib.dump(self.models[self.best_model]['model'], best_model_path)
                logger.info(f"Saved best model ({self.best_model}) to {best_model_path}")
            
            # Save the scaler
            if save_scaler:
                scaler_path = os.path.join(self.models_dir, "scaler.pkl")
                joblib.dump(self.scaler, scaler_path)
                logger.info(f"Saved scaler to {scaler_path}")
            
            # Save model metadata
            metadata = {
                'best_model': self.best_model,
                'best_score': self.best_score,
                'feature_names': self.models[self.best_model]['feature_names'] if self.best_model else [],
                'model_info': {name: {'cv_mean': info['cv_mean'], 'cv_std': info['cv_std']} 
                              for name, info in self.models.items()}
            }
            
            metadata_path = os.path.join(self.models_dir, "model_metadata.pkl")
            joblib.dump(metadata, metadata_path)
            logger.info(f"Saved model metadata to {metadata_path}")
            
        except Exception as e:
            logger.error(f"Error saving models: {e}")
            raise
    
    def plot_confusion_matrix(self, y_true: np.ndarray, y_pred: np.ndarray, model_name: str):
        """Plot confusion matrix for a specific model."""
        try:
            cm = confusion_matrix(y_true, y_pred)
            
            plt.figure(figsize=(10, 8))
            sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
            plt.title(f'Confusion Matrix - {model_name}')
            plt.ylabel('True Label')
            plt.xlabel('Predicted Label')
            
            # Save the plot
            plot_path = os.path.join(self.models_dir, f"{model_name.lower()}_confusion_matrix.png")
            plt.savefig(plot_path, dpi=300, bbox_inches='tight')
            plt.close()
            
            logger.info(f"Saved confusion matrix plot to {plot_path}")
            
        except Exception as e:
            logger.error(f"Error plotting confusion matrix: {e}")
            raise
    
    def load_models(self) -> bool:
        """Load previously trained models."""
        try:
            metadata_path = os.path.join(self.models_dir, "model_metadata.pkl")
            if not os.path.exists(metadata_path):
                logger.warning("No model metadata found. Models need to be trained first.")
                return False
            
            metadata = joblib.load(metadata_path)
            self.best_model = metadata['best_model']
            self.best_score = metadata['best_score']
            
            # Load the best model
            best_model_path = os.path.join(self.models_dir, "best_model.pkl")
            if os.path.exists(best_model_path):
                self.models['Best'] = {
                    'model': joblib.load(best_model_path),
                    'cv_mean': self.best_score,
                    'cv_std': 0.0
                }
                logger.info("Loaded best model successfully")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            return False
