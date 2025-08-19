#!/usr/bin/env python3
"""
Comprehensive model training script for the Health App.
This script handles data processing, model training, evaluation, and saving.
"""

import logging
import os
import sys
from pathlib import Path

# Add current directory to path for imports
sys.path.append(str(Path(__file__).parent))

from data_processor import HealthDataProcessor
from model_trainer import HealthModelTrainer
import argparse

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('training.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def main():
    """Main training pipeline."""
    parser = argparse.ArgumentParser(description='Train disease prediction models')
    parser.add_argument('--data-dir', default='data', help='Directory containing data files')
    parser.add_argument('--models-dir', default='models', help='Directory to save models')
    parser.add_argument('--test-size', type=float, default=0.2, help='Test set size (0.0-1.0)')
    parser.add_argument('--random-state', type=int, default=42, help='Random seed for reproducibility')
    parser.add_argument('--optimize', action='store_true', help='Perform hyperparameter optimization')
    parser.add_argument('--skip-synthetic', action='store_true', help='Skip synthetic data generation')
    parser.add_argument('--plot-results', action='store_true', help='Generate confusion matrix plots')
    
    args = parser.parse_args()
    
    try:
        logger.info("Starting Health App model training pipeline...")
        
        # Step 1: Data Processing
        logger.info("Step 1: Processing data...")
        data_processor = HealthDataProcessor(args.data_dir)
        
        # Load and merge data
        merged_df = data_processor.load_and_merge_data()
        logger.info(f"Loaded merged dataset: {merged_df.shape}")
        
        # Generate synthetic data if not skipped
        if not args.skip_synthetic:
            logger.info("Generating synthetic data...")
            synthetic_df = data_processor.generate_synthetic_data(merged_df, samples_per_disease=5)
            logger.info(f"Generated synthetic data: {synthetic_df.shape}")
            
            # Save synthetic data
            synthetic_path = os.path.join(args.data_dir, "synthetic_patient_data.csv")
            synthetic_df.to_csv(synthetic_path, index=False)
            logger.info(f"Saved synthetic data to {synthetic_path}")
        
        # Save merged data
        data_processor.save_merged_data(merged_df)
        
        # Step 2: Model Training
        logger.info("Step 2: Training models...")
        model_trainer = HealthModelTrainer(args.models_dir)
        
        # Prepare data
        X_train, X_test, y_train, y_test, feature_names = model_trainer.prepare_data(
            merged_df, test_size=args.test_size, random_state=args.random_state
        )
        
        # Train multiple models
        model_trainer.train_models(X_train, y_train, feature_names)
        
        # Hyperparameter optimization if requested
        if args.optimize:
            logger.info("Performing hyperparameter optimization...")
            model_trainer.hyperparameter_optimization(X_train, y_train, 'RandomForest')
            model_trainer.hyperparameter_optimization(X_train, y_train, 'GradientBoosting')
        
        # Step 3: Model Evaluation
        logger.info("Step 3: Evaluating models...")
        evaluation_results = model_trainer.evaluate_models(X_test, y_test)
        
        # Print evaluation summary
        logger.info("\n" + "="*50)
        logger.info("MODEL EVALUATION SUMMARY")
        logger.info("="*50)
        
        for model_name, results in evaluation_results.items():
            logger.info(f"\n{model_name}:")
            logger.info(f"  Test Accuracy: {results['accuracy']:.4f}")
            
            # Print top predictions for each model
            if 'probabilities' in results and results['probabilities'] is not None:
                top_indices = results['probabilities'][0].argsort()[-3:][::-1]
                logger.info("  Top 3 Predictions:")
                for i, idx in enumerate(top_indices):
                    prob = results['probabilities'][0][idx]
                    logger.info(f"    {i+1}. Probability: {prob:.4f}")
        
        # Step 4: Generate plots if requested
        if args.plot_results:
            logger.info("Step 4: Generating visualization plots...")
            for model_name, results in evaluation_results.items():
                try:
                    model_trainer.plot_confusion_matrix(
                        y_test, results['predictions'], model_name
                    )
                except Exception as e:
                    logger.warning(f"Could not generate plot for {model_name}: {e}")
        
        # Step 5: Save Models
        logger.info("Step 5: Saving models...")
        model_trainer.save_models()
        
        # Step 6: Final Summary
        logger.info("\n" + "="*50)
        logger.info("TRAINING COMPLETED SUCCESSFULLY!")
        logger.info("="*50)
        logger.info(f"Best model: {model_trainer.best_model}")
        logger.info(f"Best CV accuracy: {model_trainer.best_score:.4f}")
        logger.info(f"Models saved to: {args.models_dir}")
        logger.info(f"Training log saved to: training.log")
        
        if args.plot_results:
            logger.info("Confusion matrix plots saved to models directory")
        
        logger.info("\nNext steps:")
        logger.info("1. Start the API: python api.py")
        logger.info("2. Test predictions: curl 'http://localhost:8000/predict?symptoms=fever,headache'")
        logger.info("3. View API docs: http://localhost:8000/docs")
        
    except Exception as e:
        logger.error(f"Training pipeline failed: {e}")
        logger.error("Check the logs above for detailed error information")
        sys.exit(1)

if __name__ == "__main__":
    main()
