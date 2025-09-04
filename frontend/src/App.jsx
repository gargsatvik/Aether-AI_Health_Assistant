/*
  --- INSTRUCTIONS FOR YOUR BACKEND (app.py) ---

  To enable the new features like visual analysis, refined emergency detection, and improved tone,
  you MUST replace the ENTIRE `get_doctor_persona_prompt` function in your `app.py`
  file with the new, more advanced version below.

  -------------------------------------------------------------------------

  def get_doctor_persona_prompt(user_details, local_predictions, image_provided):
    """
    Constructs a detailed system prompt for the Gemini model to adopt an empathetic,
    professional, and methodical doctor persona with advanced features.
    """
    details_text = "The user has not provided their initial details yet."
    if user_details and user_details.get('info'):
        location = user_details.get('location', 'N/A')
        info = user_details.get('info')
        details_text = f"The user's details are: {info}. They are located in {location}."
    
    predictions_text = "No initial analysis has been performed yet."
    if local_predictions:
        predictions_list = [f"- {p['disease']} (Confidence: {p['confidence']:.0%})" for p in local_predictions]
        predictions_text = "My initial diagnostic analysis based on their main symptoms suggests:\n" + "\n".join(predictions_list)

    image_context = "The user has not provided an image."
    if image_provided:
        image_context = "The user has provided an image of their symptom. You MUST acknowledge the image and use it to ask a more specific follow-up question."

    return f\"\"\"
    **SYSTEM INSTRUCTION: ACT AS A MEDICAL PROFESSIONAL**

    **Your Persona:** You are "Dr. Aether," an experienced, empathetic, and professional AI physician. Your tone should be reassuring and caring. Use phrases like "I understand this must be worrying," or "Thank you for sharing that, let's explore this further."

    **User Context:**
    - {details_text}
    - {image_context}
    - Current Location: Panipat, Haryana, India. Current Date: Thursday, September 4, 2025.

    **Initial Diagnostic Analysis:**
    {predictions_text}
    You must use this analysis as a starting point for your questions.

    **CRITICAL Directives & Conversational Flow:**
    1.  **Refined Emergency Detection:** Analyze the user's message for context, not just keywords. If the message clearly indicates a life-threatening situation (e.g., "I have severe, crushing chest pain," "I cannot breathe at all," "I am bleeding uncontrollably"), your ONLY response must be `[EMERGENCY]`. Do not trigger for minor mentions or hypothetical questions.

    2.  **Methodical Questioning (One at a Time):**
        - Ask clarifying questions ONE AT A TIME to understand the situation fully.
        - Acknowledge the user's answers with empathy before asking the next question.
        - If an image was provided, your first question after seeing it must relate to the image. Example: "Thank you for uploading the image. Seeing the rash helps. Could you tell me if it feels warm to the touch?"
        - Provide simple answer options using the format: `Your question text? [CHIPS: ["Option 1", "Option 2", "I'm not sure"]]`

    3.  **Comprehensive Final Summary:** After 3-4 questions, provide a final summary using this EXACT format:
        `[SUMMARY: {{
            "recap": "A brief, empathetic summary of the user's symptoms.",
            "possibilities": "Based on our conversation, this could suggest... (Discuss possibilities, never give a definitive diagnosis).",
            "homeCare": [
                "Actionable, safe home-care advice relevant to the symptoms.",
                "Another home-care suggestion."
            ],
            "recommendation": "It is highly recommended you consult a doctor in Panipat within the next 24-48 hours for a proper diagnosis. (Tailor urgency based on symptoms and age).",
            "conclusion": "I hope this has been helpful. Please remember to follow up with a healthcare professional. Is there anything else I can assist you with?"
        }}]`

    **DO NOT DEVIATE FROM THE COMMAND FORMATS. The application depends on them.**
    \"\"\"
*/

import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- Styles ---
const styles = {
    body: { margin: 0, fontFamily: 'system-ui, -apple-system', backgroundColor: '#0f172a', color: '#e2e8f0', height: '100vh', overflow: 'hidden' },
    appContainer: { display: 'flex', height: '100vh' },
    mainContent: { flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', transition: 'margin-left 0.3s ease-in-out' },
    sidebar: { position: 'fixed', top: 0, left: 0, height: '100%', width: '288px', backgroundColor: '#0f172a', borderRight: '1px solid #1e293b', transition: 'transform 0.3s ease-in-out', zIndex: 40, display: 'flex', flexDirection: 'column' },
    sidebarHeader: { padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b' },
    sidebarNewChatBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: 'white', backgroundColor: 'rgba(56, 189, 248, 0.5)', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' },
    chatListItem: { display: 'block', padding: '0.75rem', fontSize: '0.875rem', borderRadius: '0.5rem', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#cbd5e1', transition: 'background-color 0.2s', cursor: 'pointer' },
    chatListItemActive: { backgroundColor: 'rgba(56, 189, 248, 0.2)', color: 'white' },
    chatScreen: { display: 'flex', flexDirection: 'column', height: '100%' },
    chatMessagesContainer: { flexGrow: 1, padding: '1.5rem', overflowY: 'auto' },
    messageBubble: { padding: '1rem', borderRadius: '1.5rem', maxWidth: '75%', color: 'white', lineHeight: '1.5', wordWrap: 'break-word' },
    userMessage: { backgroundColor: '#0284c7', borderRadius: '1.5rem 1.5rem 0.25rem 1.5rem', alignSelf: 'flex-end' },
    modelMessage: { backgroundColor: '#334155', borderRadius: '1.5rem 1.5rem 1.5rem 0.25rem' },
    chatInput: { flexGrow: 1, padding: '1rem', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', color: 'white', fontSize: '1rem', outline: 'none' },
    chatInputContainer: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
    iconButton: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.5rem' },
    sendButton: { padding: '0.5rem', borderRadius: '0.375rem', color: 'white', border: 'none', cursor: 'pointer', backgroundColor: '#0ea5e9', transition: 'background-color 0.2s' },
    analysisCard: { padding: '1rem', margin: '0 1.5rem 1rem', border: '1px solid #334155', borderRadius: '0.75rem', backgroundColor: 'rgba(30, 41, 59, 0.5)' },
    analysisTitle: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.75rem' },
    locationDisplay: { padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: '#94a3b8', borderTop: '1px solid #1e293b' },
    modalBackdrop: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modalContent: { backgroundColor: '#1e293b', padding: '2rem', borderRadius: '0.75rem', width: '90%', maxWidth: '450px', color: 'white', border: '1px solid #334155' },
    modalTitle: { fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
    modalButton: { padding: '0.75rem', width: '100%', backgroundColor: '#0ea5e9', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', marginTop: '1rem' },
    suggestionChipsContainer: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0 1.5rem 1rem' },
    suggestionChip: { padding: '0.5rem 1rem', backgroundColor: '#334155', border: '1px solid #475569', borderRadius: '1rem', cursor: 'pointer', color: 'white', transition: 'background-color 0.2s' },
    summaryCard: { margin: '0 1.5rem 1rem', padding: '1.5rem', backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155', borderRadius: '0.75rem' },
    summaryTitle: { fontSize: '1.125rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' },
    summarySection: { marginBottom: '1rem' },
    summaryLabel: { fontWeight: '600', color: '#94a3b8', marginBottom: '0.25rem' },
    copyButton: { float: 'right', background: 'none', border: '1px solid #475569', color: '#94a3b8', borderRadius: '0.25rem', padding: '0.25rem 0.5rem', cursor: 'pointer' },
    imagePreviewContainer: { position: 'relative', width: '60px', height: '60px', marginRight: '0.5rem' },
    imagePreview: { width: '100%', height: '100%', borderRadius: '0.5rem', objectFit: 'cover' },
    removeImageButton: { position: 'absolute', top: '-5px', right: '-5px', background: '#334155', color: 'white', border: '1px solid #475569', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
    uploadedImageInChat: { maxWidth: '100%', maxHeight: '300px', borderRadius: '0.75rem', marginTop: '0.5rem' },
};

// --- Helper Hook ---
const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(window.matchMedia(query).matches);
    useEffect(() => {
        const media = window.matchMedia(query);
        const listener = () => setMatches(media.matches);
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [query]);
    return matches;
};

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID,
};
// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
getFirestore(app);

// --- API Layer (FIXED) ---
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const api = {
    getPrediction: async (symptoms) => (await axios.post(`${API_BASE}/predict`, { symptoms })).data || [],
    chatWithAI: async (history, predictions, userDetails, image_provided) => {
        return (await axios.post(`${API_BASE}/chat`, { history, local_predictions: predictions, user_details: userDetails, image_provided })).data;
    },
    getChats: async (userId) => (await axios.post(`${API_BASE}/get_chats`, { user_id: userId })).data || [],
    saveChat: async (userId, chatData) => await axios.post(`${API_BASE}/save_chat`, { userId, chatData }),
};

// --- SVG Icons ---
const AetherLogo = () => (<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width: '32px', height: '32px'}}><path d="M12 2L3 22H21L12 2Z" stroke="#e0e0e0" strokeWidth="1.5" /><path d="M7 15L12 5L17 15H7Z" stroke="#e0e0e0" strokeWidth="1.5" /></svg>);
const HealthAILogo = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15.09 8.09L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.09L12 2Z" stroke="#38bdf8" strokeWidth="2" /><path d="M9 12H15" stroke="#38bdf8" strokeWidth="2" /><path d="M12 9V15" stroke="#38bdf8" strokeWidth="2" /></svg>);
const SendIcon = () => (<svg style={{width: '24px', height: '24px'}} viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>);
const PlusIcon = () => (<svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>);
const SignOutIcon = () => (<svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>);
const MenuIcon = () => (<svg style={{width: '24px', height: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>);
const XIcon = () => (<svg style={{width: '24px', height: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>);
const BrainCircuitIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 0-10 10c0 1.85.54 3.58 1.48 5.04M12 22a10 10 0 0 0 10-10c0-1.85-.54-3.58-1.48-5.04"/><path d="M12 2v20"/><path d="m18.5 4.5-.42.42c-1.33 1.33-2.08 3.12-2.08 4.95v.21c0 1.83.75 3.62 2.08 4.95l.42.42"/><path d="m18.5 19.5-.42-.42c-1.33-1.33-2.08-3.12-2.08-4.95v-.21c0-1.83.75-3.62 2.08-4.95l.42-.42"/><path d="m5.5 4.5.42.42c1.33 1.33 2.08 3.12 2.08 4.95v.21c0 1.83-.75 3.62-2.08 4.95l-.42.42"/><path d="m5.5 19.5.42-.42c1.33-1.33-2.08-3.12-2.08-4.95v-.21c0-1.83-.75-3.62-2.08-4.95l-.42-.42"/></svg>);
const LocationIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>);
const WarningIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: '#f87171'}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>);
const PaperclipIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>);

// --- Components ---

const InitialDisclaimerModal = ({ onAccept }) => (
    <div style={styles.modalBackdrop}>
        <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}><WarningIcon /> Important Disclaimer</h2>
            <p style={{color: '#cbd5e1', lineHeight: 1.5}}>Dr. Aether is an AI-powered assistant and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.</p>
            <p style={{color: '#cbd5e1', lineHeight: 1.5}}>If you are experiencing a medical emergency, please call your local emergency services immediately.</p>
            <button style={styles.modalButton} onClick={onAccept}>I Understand and Accept</button>
        </div>
    </div>
);

const SuggestionChips = ({ chips, onChipClick }) => (
    <div style={styles.suggestionChipsContainer}>
        {chips.map((chip, index) => (
            <button key={index} style={styles.suggestionChip} onClick={() => onChipClick(chip)}>{chip}</button>
        ))}
    </div>
);

const ChatSummaryCard = ({ summary }) => {
    const summaryText = `
**Symptom Recap:**
${summary.recap}

**Possible Causes:**
${summary.possibilities}

**Home-Care Suggestions:**
${summary.homeCare.map(item => `- ${item}`).join('\n')}

**Doctor's Recommendation:**
${summary.recommendation}
    `.trim();

    const handleCopy = () => {
        navigator.clipboard.writeText(summaryText);
    };

    return (
        <div style={styles.summaryCard}>
            <button style={styles.copyButton} onClick={handleCopy}>Copy</button>
            <h3 style={styles.summaryTitle}>Consultation Summary</h3>
            <div style={styles.summarySection}>
                <p style={styles.summaryLabel}>Symptom Recap</p>
                <p>{summary.recap}</p>
            </div>
            <div style={styles.summarySection}>
                <p style={styles.summaryLabel}>Possible Causes</p>
                <p>{summary.possibilities}</p>
            </div>
            <div style={styles.summarySection}>
                <p style={styles.summaryLabel}>Home-Care Suggestions</p>
                <ul style={{margin: 0, paddingLeft: '20px'}}>{summary.homeCare.map((item, i) => <li key={i}>{item}</li>)}</ul>
            </div>
             <div style={styles.summarySection}>
                <p style={styles.summaryLabel}>Recommendation</p>
                <p style={{fontWeight: 'bold'}}>{summary.recommendation}</p>
            </div>
            <p>{summary.conclusion}</p>
        </div>
    );
};

const LandingPage = ({ handleLogin }) => {
    return (
      <div style={{...styles.body, backgroundColor: '#111827', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
        <div>
          <h1 style={{fontSize: '3.75rem', fontWeight: '800', letterSpacing: '-0.05em', lineHeight: '1.1'}}>Welcome to Health AI</h1>
          <p style={{marginTop: '1rem', fontSize: '1.125rem', color: '#9ca3af'}}>Your AI-powered health assistant.</p>
          <button style={{marginTop: '2rem', backgroundImage: 'linear-gradient(to right, #2dd4bf, #38bdf8)', color: 'white', fontWeight: 'bold', padding: '12px 32px', borderRadius: '8px', border: 'none', cursor: 'pointer'}} onClick={handleLogin}>Login to Get Started</button>
        </div>
      </div>
    );
};
  
const InitialAnalysisCard = ({ predictions }) => {
    if (!predictions || predictions.length === 0) return null;
    return (
        <div style={styles.analysisCard}>
            <h3 style={styles.analysisTitle}><BrainCircuitIcon /> Initial Analysis</h3>
            {predictions.map((p, i) => (
                <div key={i} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem'}}>
                    <span style={{ minWidth: '100px', flexShrink: 0 }}>{p.disease}</span>
                    <div style={{flexGrow: 1, height: '8px', backgroundColor: '#334155', borderRadius: '4px', margin: '0 0.75rem', overflow: 'hidden'}}>
                        <div style={{height: '100%', backgroundColor: '#38bdf8', borderRadius: '4px', width: `${p.confidence * 100}%`}}></div>
                    </div>
                    <span style={{ minWidth: '40px', textAlign: 'right', flexShrink: 0 }}>{(p.confidence * 100).toFixed(0)}%</span>
                </div>
            ))}
        </div>
    );
};

const ChatHistorySidebar = ({ chats, onSelectChat, activeChatId, onNewChat, user, onLogout, isSidebarOpen, setIsSidebarOpen, userLocation }) => {
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const sidebarStyle = { ...styles.sidebar, transform: isDesktop || isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)' };

    return (
        <>
            <div style={sidebarStyle}>
                <div style={styles.sidebarHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HealthAILogo />
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>Health AI</h1>
                    </div>
                    {!isDesktop && <button onClick={() => setIsSidebarOpen(false)} style={{background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer'}}><XIcon /></button>}
                </div>
                <div style={{padding: '0.5rem'}}><button onClick={onNewChat} style={styles.sidebarNewChatBtn}><PlusIcon /> New Chat</button></div>
                <div style={{flexGrow: 1, padding: '0.5rem', overflowY: 'auto'}}>
                    <p style={{padding: '0 0.5rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase'}}>Recent Chats</p>
                    <ul style={{listStyle: 'none', margin: 0, padding: 0, gap: '0.25rem', display: 'flex', flexDirection: 'column'}}>
                        {chats.map(chat => (
                            <li key={chat.id}>
                                <a onClick={(e) => { e.preventDefault(); onSelectChat(chat); }} href="#" style={{...styles.chatListItem, ...(activeChatId === chat.id && styles.chatListItemActive)}}>
                                    {chat.title || "Chat"}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
                
                <div style={styles.locationDisplay}>
                    <LocationIcon />
                    <span>{userLocation}</span>
                </div>

                <div style={{ padding: '1rem', borderTop: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden'}}>
                            <img src={user.photoURL} alt="User" style={{width: '32px', height: '32px', borderRadius: '50%'}}/>
                            <span style={{fontSize: '0.875rem', fontWeight: '500', color: 'white', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'}}>{user.displayName}</span>
                        </div>
                        <button onClick={onLogout} style={{background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer'}}><SignOutIcon /></button>
                    </div>
                </div>
            </div>
             {isSidebarOpen && !isDesktop && <div onClick={() => setIsSidebarOpen(false)} style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 30}}></div>}
        </>
    );
};

const ChatMessage = ({ message }) => {
    const isUser = message.role === "user";
    return (
      <div style={{ display: 'flex', margin: '1rem 0', gap: '12px', justifyContent: isUser ? "flex-end" : "flex-start" }}>
        {!isUser && <div style={{width: '32px', height: '32px', backgroundColor: '#334155', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}><HealthAILogo/></div>}
        <div style={{...styles.messageBubble, ...(isUser ? styles.userMessage : styles.modelMessage)}}>
          <p style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: message.content.replace(/\*([^*]+)\*/g, '<b>$1</b>').replace(/\n/g, '<br />') }}></p>
          {message.image && <img src={message.image} alt="Symptom" style={styles.uploadedImageInChat} />}
        </div>
      </div>
    );
};

const WelcomeScreen = ({ onNewChat }) => (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '1rem'}}>
        <HealthAILogo />
        <h2 style={{fontSize: '1.875rem', fontWeight: 'bold', color: 'white', marginTop: '1rem', marginBottom: '0.5rem'}}>Welcome to Health AI</h2>
        <p style={{color: '#94a3b8', marginBottom: '1.5rem', maxWidth: '450px'}}>Start a new conversation to get an analysis of your symptoms.</p>
        <button onClick={onNewChat} style={{backgroundColor: '#0ea5e9', color: 'white', fontWeight: 'bold', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer'}}>
            Start New Chat
        </button>
    </div>
);

// --- Main App Component ---
function App() {
    const [user, setUser] = useState(null);
    const [chats, setChats] = useState([]);
    const [activeChatId, setActiveChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [localPredictions, setLocalPredictions] = useState([]);
    const [userInput, setUserInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [authReady, setAuthReady] = useState(false);
    const [userLocation, setUserLocation] = useState('Locating...');
    const [activeChatHasPrediction, setActiveChatHasPrediction] = useState(false);
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [suggestionChips, setSuggestionChips] = useState([]);
    const [chatSummary, setChatSummary] = useState(null);
    const [isChatConcluded, setIsChatConcluded] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        Object.assign(document.body.style, styles.body);
        const hasAccepted = localStorage.getItem('acceptedDisclaimer');
        if (!hasAccepted) setShowDisclaimer(true);
        const styleSheet = document.createElement("style");
        styleSheet.innerText = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
        document.head.appendChild(styleSheet);
        return () => { styleSheet.parentNode?.removeChild(styleSheet); };
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                fetchUserChats(currentUser.uid);
            } else {
                setUser(null); setChats([]); setActiveChatId(null); setMessages([]);
            }
            setAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    try {
                        const response = await axios.get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                        setUserLocation(`${response.data.city || 'Unknown'}, ${response.data.countryName || 'Area'}`);
                    } catch (err) { setUserLocation("Location not found"); }
                },
                () => { setUserLocation("Location access denied"); }
            );
        }
    }, [user]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, chatSummary]);


    const fetchUserChats = async (uid) => {
        try {
            const userChats = await api.getChats(uid);
            setChats(userChats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        } catch (error) { console.error("Failed to fetch user chats:", error); }
    };

    const handleLogin = async () => { await signInWithPopup(auth, provider).catch(console.error); };
    const handleLogout = async () => { await signOut(auth); };
    
    const handleAcceptDisclaimer = () => {
        localStorage.setItem('acceptedDisclaimer', 'true');
        setShowDisclaimer(false);
    };
    
    const startNewChat = () => {
        setActiveChatId(uuidv4());
        setMessages([{ role: 'model', content: "Hello! To provide a more personalized analysis, please tell me your name, age, and sex.\n\nFor example: *I'm Alex, 35, Male.*" }]);
        setLocalPredictions([]); setUserInput(""); setIsSidebarOpen(false); setActiveChatHasPrediction(false);
        setSuggestionChips([]); setChatSummary(null); setIsChatConcluded(false); setImageFile(null); setImagePreview(null);
    };

    const handleSelectChat = (chat) => {
        setActiveChatId(chat.id); setMessages(chat.messages);
        const preds = chat.localPredictions || []; setLocalPredictions(preds);
        setActiveChatHasPrediction(preds.length > 0); setChatSummary(chat.summary || null);
        setIsChatConcluded(!!chat.summary); setSuggestionChips([]); setIsSidebarOpen(false);
    };

    const handleChipClick = (chipText) => {
        handleSendMessage(null, chipText);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSendMessage = async (e, chipText = null) => {
        if (e) e.preventDefault();
        const textToSend = chipText || userInput;
        if (!textToSend.trim() && !imageFile) return;

        setLoading(true);
        setSuggestionChips([]);

        const reader = new FileReader();
        const imageBase64 = imageFile ? await new Promise(resolve => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(imageFile);
        }) : null;

        const userMessage = { role: "user", content: textToSend, image: imageBase64 };
        setMessages(prev => [...prev, userMessage]);
        
        setUserInput("");
        removeImage();

        const updatedMessages = [...messages, userMessage];

        try {
            const userDetails = { location: userLocation, info: updatedMessages.find(m => m.role === 'user')?.content || userInput };
            const isSymptomMessage = updatedMessages.filter(m => m.role === 'user').length === 2;
            let preds = localPredictions;

            if (isSymptomMessage && !activeChatHasPrediction) {
                preds = await api.getPrediction(textToSend);
                setLocalPredictions(preds); setActiveChatHasPrediction(true);
            }

            const history = updatedMessages.map(m => ({ role: m.role, parts: [m.content] }));
            const res = await api.chatWithAI(history, preds, userDetails, !!imageBase64);
            let aiResponse = res.reply;
            
            let finalSummary = chatSummary;

            if (aiResponse.includes('[CHIPS:')) {
                const chipMatch = aiResponse.match(/\[CHIPS: (.*?)\]/s);
                if (chipMatch) {
                    try { setSuggestionChips(JSON.parse(chipMatch[1])); } catch (err) { console.error("Chip JSON parsing error:", err); }
                    aiResponse = aiResponse.replace(chipMatch[0], '').trim();
                }
            } else if (aiResponse.includes('[SUMMARY:')) {
                 const summaryMatch = aiResponse.match(/\[SUMMARY: (.*)\]/s);
                 if (summaryMatch) {
                    try {
                        const summaryJson = JSON.parse(summaryMatch[1]);
                        setChatSummary(summaryJson);
                        finalSummary = summaryJson;
                        setIsChatConcluded(true);
                        aiResponse = "Here is a summary of our conversation.";
                    } catch (err) { console.error("Summary JSON parsing error:", err); }
                 }
            } else if (aiResponse.includes('[EMERGENCY]')) {
                 aiResponse = "Based on your description, your symptoms may be serious. Please **contact your local emergency services immediately**.";
                 setIsChatConcluded(true);
            }

            const finalMessages = [...updatedMessages, { role: "model", content: aiResponse }];
            setMessages(finalMessages);

            const chatToSave = {
                id: activeChatId,
                messages: finalMessages,
                localPredictions: preds,
                summary: finalSummary,
                timestamp: new Date().toISOString(),
                title: finalMessages.find(m => m.role === 'user')?.content.substring(0, 40) || "New Chat"
            };

            await api.saveChat(user.uid, chatToSave);
            
            setChats(prevChats => {
                const existingChatIndex = prevChats.findIndex(c => c.id === activeChatId);
                if (existingChatIndex > -1) {
                    const updatedChats = [...prevChats];
                    updatedChats[existingChatIndex] = chatToSave;
                    return updatedChats;
                }
                return [chatToSave, ...prevChats];
            });

        } catch (err) {
            console.error("Error in chat flow:", err);
            setMessages(prev => [...prev, { role: "model", content: "Sorry, an error occurred." }]);
        } finally {
            setLoading(false);
        }
    };

    if (!authReady) return <div style={styles.body}></div>;
    if (showDisclaimer) return <InitialDisclaimerModal onAccept={handleAcceptDisclaimer} />;
    if (!user) return <LandingPage handleLogin={handleLogin} />;
    
    return (
        <div style={styles.appContainer}>
            <ChatHistorySidebar user={user} chats={chats} onSelectChat={handleSelectChat} activeChatId={activeChatId} onNewChat={startNewChat} onLogout={handleLogout} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} userLocation={userLocation} />
            <main style={{ ...styles.mainContent, marginLeft: isDesktop ? '288px' : '0' }}>
                {!isDesktop && (<button onClick={() => setIsSidebarOpen(true)} style={{ position: 'fixed', top: '1rem', left: '1rem', zIndex: 50, background: 'rgba(30, 41, 59, 0.5)', border: 'none', padding: '0.5rem', borderRadius: '0.375rem', color: 'white', cursor: 'pointer' }}><MenuIcon /></button>)}
                {activeChatId ? (
                    <div style={styles.chatScreen}>
                        <div style={styles.chatMessagesContainer}>
                            {messages.map((msg, index) => <ChatMessage key={index} message={msg} />)}
                            <InitialAnalysisCard predictions={localPredictions} />
                            {chatSummary && <ChatSummaryCard summary={chatSummary} />}
                             <div ref={chatEndRef} />
                        </div>
                        {!isChatConcluded && <SuggestionChips chips={suggestionChips} onChipClick={handleChipClick} />}
                        <div style={{padding: '1.5rem', borderTop: '1px solid #1e293b'}}>
                            <form onSubmit={handleSendMessage} style={styles.chatInputContainer}>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />
                                <button type="button" style={styles.iconButton} onClick={() => fileInputRef.current.click()} disabled={loading || isChatConcluded}>
                                    <PaperclipIcon />
                                </button>
                                {imagePreview && (
                                    <div style={styles.imagePreviewContainer}>
                                        <img src={imagePreview} alt="Preview" style={styles.imagePreview} />
                                        <button type="button" style={styles.removeImageButton} onClick={removeImage}>&times;</button>
                                    </div>
                                )}
                                <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)}
                                    placeholder={isChatConcluded ? "This chat has ended." : "Describe your symptoms..."}
                                    style={styles.chatInput}
                                    disabled={loading || isChatConcluded}
                                />
                                <button type="submit" style={styles.sendButton} disabled={loading || isChatConcluded}>
                                    {loading ? <div style={{width: '24px', height: '24px', border: '2px solid #64748b', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div> : <SendIcon />}
                                </button>
                            </form>
                        </div>
                    </div>
                ) : ( <WelcomeScreen onNewChat={startNewChat} /> )}
            </main>
        </div>
    );
}

export default App;

