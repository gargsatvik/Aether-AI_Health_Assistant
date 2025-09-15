Aether: An Intelligent Health Assistant
A sophisticated, full-stack web application that provides users with an empathetic and intelligent preliminary health analysis through a multi-stage, AI-powered conversational experience.

🚀 Live Demo
Experience Aether live: https://health-app-lilac.vercel.app/

💡 Core Concept & Features
Aether is more than just a chatbot. It's engineered to simulate a methodical, trustworthy consultation with a physician. The application guides the user through a structured conversation, gathering information step-by-step before leveraging a hybrid AI system to provide a nuanced analysis.

Key Features:
Methodical Conversational Flow: The AI, "Dr. Aether," first gathers essential user details (name, age, sex) before asking for symptoms, ensuring a logical and professional interaction.

Hybrid AI Core: A two-stage AI architecture for enhanced accuracy:

Symptom Enhancement: User-described symptoms are first processed by Google's Gemini model to extract and list key medical terms.

Local Model Prediction: The enhanced symptom list is then fed into a fine-tuned sequence classification model (hosted on the backend) for a rapid and accurate initial analysis.

Persona-Driven AI: The conversational AI is governed by a detailed persona prompt that enforces empathy, a strict limit on follow-up questions (preventing conversation loops), and the generation of a final, structured summary.

Interactive & Polished UI: A fully responsive frontend built with React, featuring a consistent dark theme and a dynamic, interactive neural network animation created with HTML Canvas.

Real-Time & Persistent: User conversations are securely stored and retrieved in real-time using Google Firestore, allowing users to revisit their chat history.

🛠️ Tech Stack & Architecture
This project is a full-stack application with a clear separation between the frontend client, the backend server, and the database.

Frontend
Framework: React (Vite)

Styling: CSS-in-JS

Deployment: Vercel

Backend
Framework: Python (Flask)

Conversational AI: Google Gemini 1.5 Flash

Local ML Model: Fine-tuned Sequence Classification model using Hugging Face Transformers

Deployment: Hugging Face Spaces

Database
Service: Google Firestore

Authentication: Google Firebase Authentication

System Flow
User authenticates via Google Firebase on the React frontend.

The user initiates a chat and provides their details and symptoms in a guided conversation.

The symptom description is sent to the Flask backend.

Gemini enhances the symptoms into structured medical terms.

The enhanced text is fed to the local Transformers model for analysis.

The analysis and full chat history are used to create a final, detailed prompt for Gemini's "Dr. Aether" persona.

The AI's response is sent back to the user, and the conversation is saved to Firestore.

⚙️ Local Setup & Installation
To run this project locally, you will need to set up the frontend and backend separately.

Prerequisites
Node.js and npm/yarn

Python 3.9+ and pip

A Firebase project with Firestore enabled

A Google AI Studio API key for Gemini

1. Backend Setup
# Clone the repository
git clone [https://github.com/gargsatvik/Health-app.git](https://github.com/gargsatvik/Health-app.git)
cd Health-app/backend # Navigate to your backend directory

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

# Install dependencies
pip install -r requirements.txt

# Create a .env file and add your environment variables
touch .env

Your backend .env file should contain:

GOOGLE_API_KEY="your_google_gemini_api_key"
FIREBASE_SERVICE_ACCOUNT="{...your_firebase_service_account_json...}"

2. Frontend Setup
# Navigate to your frontend directory from the root
cd ../frontend

# Install dependencies
npm install

# Create a .env.local file and add your Firebase client keys
touch .env.local

Your frontend .env.local file should contain your Firebase web app configuration:

VITE_API_KEY="your_firebase_api_key"
VITE_AUTH_DOMAIN="your_firebase_auth_domain"
VITE_PROJECT_ID="your_firebase_project_id"
VITE_STORAGE_BUCKET="your_firebase_storage_bucket"
VITE_MESSAGING_SENDER_ID="your_firebase_messaging_sender_id"
VITE_APP_ID="your_firebase_app_id"
VITE_API_BASE_URL="http://localhost:5000" # Your local backend URL
