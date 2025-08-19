# Health App - Disease Prediction System

A comprehensive machine learning system for predicting diseases based on reported symptoms. This project provides both a command-line interface and a REST API for disease prediction.

## 🏥 Features

- **Multiple ML Models**: Random Forest, Gradient Boosting, Logistic Regression, and SVM
- **Hyperparameter Optimization**: Automatic tuning for best performance
- **Feature Scaling**: Proper data preprocessing with StandardScaler
- **Symptom Validation**: Fuzzy matching for user input with helpful suggestions
- **Comprehensive API**: FastAPI-based REST API with automatic documentation
- **Interactive CLI**: User-friendly command-line interface
- **Data Processing**: Automated data merging and synthetic data generation
- **Model Evaluation**: Cross-validation, confusion matrices, and performance metrics
- **Logging**: Comprehensive logging for debugging and monitoring

## 📁 Project Structure

```
Health-app/
├── data/                          # Data files
│   ├── dataset.csv               # Main symptom-disease dataset
│   ├── Symptom-severity.csv      # Symptom severity weights
│   ├── merged.csv                # Processed and merged data
│   └── synthetic_patient_data.csv # Generated synthetic data
├── models/                       # Trained models and metadata
├── data_processor.py            # Data loading and preprocessing
├── model_trainer.py             # Model training and evaluation
├── predictor.py                  # Disease prediction logic
├── api.py                       # FastAPI REST API
├── cli.py                       # Command-line interface
├── train_models.py              # Training pipeline script
├── requirements.txt             # Python dependencies
└── README.md                    # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Train the Models

```bash
python train_models.py
```

This will:
- Process and merge your data
- Train multiple ML models
- Perform cross-validation
- Save the best model
- Generate evaluation reports

**Optional flags:**
- `--optimize`: Enable hyperparameter optimization
- `--plot-results`: Generate confusion matrix plots
- `--skip-synthetic`: Skip synthetic data generation
- `--test-size 0.3`: Set test set size (default: 0.2)

### 3. Use the System

#### Command Line Interface
```bash
python cli.py
```

#### REST API
```bash
python api.py
```

The API will be available at `http://localhost:8000`

## 📖 Usage

### Command Line Interface

The CLI provides an interactive menu:

1. **Get Disease Prediction**: Enter symptoms and get predictions
2. **View Available Symptoms**: Browse all recognized symptoms
3. **Model Information**: View model details and statistics
4. **Quit**: Exit the application

**Example CLI Session:**
```
🏥 Welcome to Health App - Disease Prediction System!
Loading model...

==================================================
HEALTH APP - DISEASE PREDICTION
==================================================
1. Get disease prediction
2. View available symptoms
3. Model information
4. Quit
--------------------------------------------------

Select an option (1-4): 1

==================================================
SYMPTOM INPUT
==================================================
Enter your symptoms separated by commas.
Examples: fever, headache, fatigue
Type 'help' for available symptoms, 'quit' to exit
--------------------------------------------------

Enter symptoms: fever, headache

Analyzing symptoms: fever, headache

==================================================
DISEASE PREDICTIONS
==================================================
✅ Analyzed symptoms: fever, headache

📊 Total symptoms analyzed: 2
--------------------------------------------------

🏥 TOP DISEASE PREDICTIONS:

1. Common Cold
   Probability: 85.2%
   Confidence: 🔴 very high

2. Flu
   Probability: 72.1%
   Confidence: 🟠 high

3. Migraine
   Probability: 45.3%
   Confidence: 🟡 medium
```

### REST API

The API provides several endpoints:

#### Health Check
```bash
curl http://localhost:8000/health
```

#### Get Disease Prediction
```bash
# POST method
curl -X POST "http://localhost:8000/predict" \
     -H "Content-Type: application/json" \
     -d '{"symptoms": ["fever", "headache"], "top_n": 3}'

# GET method
curl "http://localhost:8000/predict?symptoms=fever,headache&top_n=3"
```

#### Get Available Symptoms
```bash
curl http://localhost:8000/symptoms
```

#### Search Symptoms
```bash
curl "http://localhost:8000/symptoms/search?query=head&limit=5"
```

#### Model Information
```bash
curl http://localhost:8000/model/info
```

### API Documentation

Once the API is running, visit:
- **Interactive API docs**: http://localhost:8000/docs
- **Alternative docs**: http://localhost:8000/redoc

## 🔧 Configuration

### Environment Variables

The system uses default paths but can be configured:

- `DATA_DIR`: Directory containing data files (default: `data/`)
- `MODELS_DIR`: Directory to save models (default: `models/`)

### Training Configuration

Customize training with command-line arguments:

```bash
python train_models.py \
    --data-dir custom_data \
    --models-dir custom_models \
    --test-size 0.25 \
    --random-state 123 \
    --optimize \
    --plot-results
```

## 📊 Model Performance

The system automatically evaluates multiple models:

- **Random Forest**: Good for complex patterns, handles non-linear relationships
- **Gradient Boosting**: Often provides best accuracy, good for structured data
- **Logistic Regression**: Fast, interpretable, good baseline
- **SVM**: Good for high-dimensional data, robust to outliers

**Evaluation Metrics:**
- Cross-validation accuracy
- Test set accuracy
- Classification reports
- Confusion matrices

## 🛠️ Development

### Adding New Models

To add a new model, modify `model_trainer.py`:

```python
# In the train_models method
models = {
    'RandomForest': RandomForestClassifier(random_state=42, n_jobs=-1),
    'GradientBoosting': GradientBoostingClassifier(random_state=42),
    'LogisticRegression': LogisticRegression(random_state=42, max_iter=1000),
    'SVM': SVC(random_state=42, probability=True),
    'YourNewModel': YourNewModelClass()  # Add here
}
```

### Custom Data Processing

Extend `HealthDataProcessor` class in `data_processor.py` for custom data transformations.

### API Extensions

Add new endpoints in `api.py` following the existing pattern.

## 📝 Logging

The system provides comprehensive logging:

- **Training logs**: Saved to `training.log`
- **API logs**: Console and file logging
- **CLI logs**: Minimal logging for user experience

## 🚨 Troubleshooting

### Common Issues

1. **Model not found error**
   - Ensure you've run `python train_models.py` first
   - Check that `models/best_model.pkl` exists

2. **Import errors**
   - Install dependencies: `pip install -r requirements.txt`
   - Check Python path and virtual environment

3. **Data loading errors**
   - Verify data files exist in `data/` directory
   - Check file formats and permissions

4. **Memory issues during training**
   - Reduce synthetic data samples: `--skip-synthetic`
   - Use smaller test set: `--test-size 0.1`

### Performance Optimization

- **Faster training**: Use `--skip-synthetic` for initial testing
- **Better accuracy**: Enable `--optimize` for hyperparameter tuning
- **Memory usage**: Monitor during training, especially with large datasets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is open source. Please check the license file for details.

## ⚠️ Disclaimer

**This is a research/educational tool and should NOT be used for actual medical diagnosis.**

- The predictions are based on machine learning models trained on limited data
- Always consult qualified healthcare professionals for medical concerns
- The system may not cover all diseases or symptoms
- Accuracy depends on data quality and model training

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs for error details
3. Open an issue on GitHub
4. Check the API documentation at `/docs`

---

**Happy coding and stay healthy! 🏥💻**
