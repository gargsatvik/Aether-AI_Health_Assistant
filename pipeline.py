# test.py
from fastapi import FastAPI
from transformers import pipeline

app = FastAPI()
classifier = pipeline(
    "sentiment-analysis",
    model="distilbert/distilbert-base-uncased-finetuned-sst-2-english"
)

@app.get("/")
def root():
    return {"message": "Model API is running"}

@app.post("/predict")
def predict(text: str):
    result = classifier(text)[0]
    return {"label": result['label'], "score": result['score']}
