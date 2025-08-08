# test_transformers.py
from transformers import pipeline
from fastapi import FastAPI

app=fastAPI()

# Load model explicitly
classifier = pipeline(
    "sentiment-analysis",
    model="distilbert/distilbert-base-uncased-finetuned-sst-2-english"
)

# Test inputs
texts = [
    "I am feeling great and full of energy!",
    "I feel terrible and have a fever."
]

results = classifier(texts)
