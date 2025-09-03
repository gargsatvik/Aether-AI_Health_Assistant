import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { auth, provider, signInWithPopup, signOut, isFirebaseConfigured } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";


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

const AetherLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4L26 20H6L16 4Z" fill="#E6EDF3" stroke="#E6EDF3" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M12 16L16 8L20 16H12Z" fill="#0D1117" stroke="#0D1117" strokeWidth="1"/>
  </svg>
);

const BrainGraphic = () => {
  const nodes = [];
  const connections = [];

  // Generate more complex brain-like node positions
  for (let i = 0; i < 120; i++) {
    const angle = (i / 120) * Math.PI * 5;
    const radius = 160 + Math.sin(angle * 2.5) * 60 + Math.cos(angle * 1.5) * 25;
    const x = Math.cos(angle) * radius + 400;
    const y = Math.sin(angle) * radius * 0.65 + 250;
    nodes.push({ x, y, id: i, size: 2.5 + Math.random() * 2.5 });
  }

  // Add central core nodes
  for (let i = 0; i < 15; i++) {
    const angle = (i / 15) * Math.PI * 2;
    const radius = 70 + Math.random() * 50;
    const x = Math.cos(angle) * radius + 400;
    const y = Math.sin(angle) * radius * 0.8 + 250;
    nodes.push({ x, y, id: i + 120, size: 3.5 + Math.random() * 2 });
  }

  // Generate more sophisticated connections
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = Math.sqrt(
        Math.pow(nodes[i].x - nodes[j].x, 2) +
        Math.pow(nodes[i].y - nodes[j].y, 2)
      );
      if (dist < 95 && Math.random() > 0.65) {
        connections.push({
          from: nodes[i],
          to: nodes[j],
          strength: 1 - (dist / 95),
          id: `${i}-${j}`
        });
      }
    }
  }

  return (
    <div style={{
      position: 'relative',
      width: '800px',
      height: '500px',
      margin: '0 auto',
      maxWidth: '95vw'
    }}>
      <svg
        width="800"
        height="500"
        viewBox="0 0 800 500"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          animation: 'float 8s ease-in-out infinite, breathe 6s ease-in-out infinite, brainGlow 4s ease-in-out infinite'
        }}
      >
        <defs>
          <radialGradient id="nodeGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#58A6FF" stopOpacity="1" />
            <stop offset="100%" stopColor="#A371F7" stopOpacity="0.8" />
          </radialGradient>
          <radialGradient id="coreNodeGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#58A6FF" />
            <stop offset="100%" stopColor="#1E40AF" />
          </radialGradient>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#58A6FF" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#818CF8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#A371F7" stopOpacity="0.7" />
          </linearGradient>
          <filter id="nodeGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {connections.map((conn, i) => (
          <line
            key={conn.id}
            x1={conn.from.x}
            y1={conn.from.y}
            x2={conn.to.x}
            y2={conn.to.y}
            stroke="url(#lineGradient)"
            strokeWidth={0.5 + conn.strength * 2}
            strokeOpacity={0.4 + conn.strength * 0.5}
            style={{
              animation: `neuralPulse ${3 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${i * 0.03}s`
            }}
          />
        ))}

        {nodes.map((node, i) => (
          <circle
            key={node.id}
            cx={node.x}
            cy={node.y}
            r={node.size}
            fill={i >= 120 ? "url(#coreNodeGradient)" : "url(#nodeGradient)"}
            filter="url(#nodeGlow)"
            style={{
              animation: `glow 3s ease-in-out infinite alternate, nodeEnergy ${2 + Math.random()}s ease-in-out infinite`,
              animationDelay: `${i * 0.015}s`
            }}
          />
        ))}
      </svg>
    </div>
  );
};

const LandingPage = ({ handleLogin }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0D1117',
      color: '#E6EDF3',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'rgba(22, 27, 34, 0.3)',
        borderBottom: '1px solid rgba(48, 54, 61, 0.3)',
        padding: '32px clamp(24px, 5vw, 64px)',
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AetherLogo />
          <div>
            <div style={{ fontWeight: '700', fontSize: '20px', lineHeight: '1' }}>AETHER</div>
            <div style={{ fontWeight: '400', fontSize: '20px', color: '#8B949E', lineHeight: '1' }}>HEALTH</div>
          </div>
        </div>


        <button
          onClick={handleLogin}
          style={{
            border: '1px solid #30363D',
            padding: '8px 16px',
            borderRadius: '9999px',
            fontSize: '16px',
            fontWeight: '500',
            backgroundColor: 'transparent',
            color: '#E6EDF3',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = '#58A6FF';
            e.target.style.color = '#58A6FF';
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = '#30363D';
            e.target.style.color = '#E6EDF3';
          }}
        >
          Login
        </button>
      </header>

      {/* Main Content Container */}
      <main style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: 'clamp(60px, 10vw, 120px) clamp(32px, 6vw, 80px)',
        textAlign: 'center'
      }}>
        {/* Hero Section */}
        <BrainGraphic />

        <h1 style={{
          fontSize: 'clamp(36px, 8vw, 72px)',
          fontWeight: '800',
          textAlign: 'center',
          margin: 'clamp(32px, 6vw, 60px) 0 clamp(24px, 4vw, 48px) 0',
          textShadow: '0 0 30px rgba(88, 166, 255, 0.5)',
          lineHeight: '1.1',
          letterSpacing: '-0.02em'
        }}>
          Revolutionizing Health with AI
        </h1>

        <button style={{
          backgroundColor: 'rgba(13, 17, 23, 0.5)',
          border: '1px solid #30363D',
          padding: '10px 20px',
          borderRadius: '9999px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#E6EDF3',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          marginBottom: '32px'
        }}
        onMouseEnter={(e) => {
          e.target.style.borderColor = '#58A6FF';
          e.target.style.boxShadow = '0 0 20px rgba(88, 166, 255, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.target.style.borderColor = '#30363D';
          e.target.style.boxShadow = 'none';
        }}
        onClick={handleLogin}
        >
          Get Started
        </button>

        {/* Carousel Indicators */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginTop: '24px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#E6EDF3'
          }}></div>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#30363D'
          }}></div>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#30363D'
          }}></div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        backgroundColor: 'rgba(22, 27, 34, 0.3)',
        borderTop: '1px solid rgba(48, 54, 61, 0.3)',
        padding: '48px',
        marginTop: '40px'
      }}>
        <div style={{
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'clamp(24px, 4vw, 48px)'
        }}>
          {/* Logo and Description */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 4L26 20H6L16 4Z" fill="#58A6FF" stroke="#58A6FF" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M12 16L16 8L20 16H12Z" fill="#0D1117" stroke="#0D1117" strokeWidth="1"/>
              </svg>
              <div>
                <div style={{ fontWeight: '700', fontSize: '16px', lineHeight: '1', color: '#E6EDF3' }}>AETHER</div>
                <div style={{ fontWeight: '400', fontSize: '16px', color: '#8B949E', lineHeight: '1' }}>HEALTH</div>
              </div>
            </div>
            <p style={{
              fontSize: '14px',
              color: '#8B949E',
              lineHeight: '1.5',
              margin: 0
            }}>
              Revolutionizing healthcare through AI-powered analysis and personalized health insights.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#E6EDF3',
              marginBottom: '16px',
              marginTop: 0
            }}>Quick Links</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a href="#privacy" style={{
                fontSize: '14px',
                color: '#8B949E',
                textDecoration: 'none',
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#58A6FF'}
              onMouseLeave={(e) => e.target.style.color = '#8B949E'}
              >Privacy Policy</a>
              <a href="#terms" style={{
                fontSize: '14px',
                color: '#8B949E',
                textDecoration: 'none',
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#58A6FF'}
              onMouseLeave={(e) => e.target.style.color = '#8B949E'}
              >Terms of Service</a>
              <a href="#contact" style={{
                fontSize: '14px',
                color: '#8B949E',
                textDecoration: 'none',
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#58A6FF'}
              onMouseLeave={(e) => e.target.style.color = '#8B949E'}
              >Contact Us</a>
            </div>
          </div>

          {/* Developer */}
          <div>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#E6EDF3',
              marginBottom: '16px',
              marginTop: 0
            }}>Developer</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a href="https://github.com/gargsatvik" target="_blank" rel="noopener noreferrer" style={{
                fontSize: '14px',
                color: '#8B949E',
                textDecoration: 'none',
                transition: 'color 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.target.style.color = '#58A6FF'}
              onMouseLeave={(e) => e.target.style.color = '#8B949E'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub Profile
              </a>
              <a href="https://github.com/gargsatvik/Health-app" target="_blank" rel="noopener noreferrer" style={{
                fontSize: '14px',
                color: '#8B949E',
                textDecoration: 'none',
                transition: 'color 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.target.style.color = '#58A6FF'}
              onMouseLeave={(e) => e.target.style.color = '#8B949E'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Source Code
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div style={{
          maxWidth: '1280px',
          margin: '32px auto 0',
          paddingTop: '32px',
          borderTop: '1px solid #30363D',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '14px',
            fontWeight: '400',
            color: '#8B949E',
            margin: 0
          }}>
            © 2025 Aether Health. All rights reserved. Built with ❤️ for better healthcare.
          </p>
        </div>
      </footer>
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
        styleSheet.innerText = `
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes pulse {
                0%, 100% { opacity: 0.6; }
                50% { opacity: 1; }
            }
            @keyframes glow {
                0% { opacity: 0.7; filter: brightness(1); }
                100% { opacity: 1; filter: brightness(1.3); }
            }
            @keyframes float {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                33% { transform: translateY(-8px) rotate(1deg); }
                66% { transform: translateY(-12px) rotate(-1deg); }
            }
            @keyframes breathe {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.08); }
            }
            @keyframes neuralPulse {
                0% { stroke-width: 1; opacity: 0.4; }
                25% { stroke-width: 1.5; opacity: 0.7; }
                50% { stroke-width: 2.5; opacity: 1; }
                75% { stroke-width: 1.5; opacity: 0.7; }
                100% { stroke-width: 1; opacity: 0.4; }
            }
            @keyframes nodeEnergy {
                0%, 100% { r: 3; opacity: 0.8; }
                50% { r: 5; opacity: 1; }
            }
            @keyframes brainGlow {
                0%, 100% { filter: drop-shadow(0 0 20px rgba(88, 166, 255, 0.3)) drop-shadow(0 0 40px rgba(163, 113, 247, 0.2)); }
                50% { filter: drop-shadow(0 0 30px rgba(88, 166, 255, 0.6)) drop-shadow(0 0 60px rgba(163, 113, 247, 0.4)); }
            }
        `;
        document.head.appendChild(styleSheet);
        return () => { styleSheet.parentNode?.removeChild(styleSheet); };
    }, []);

    useEffect(() => {
        if (!isFirebaseConfigured) { setAuthReady(true); return; }
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
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

    const handleLogin = async () => { if (!isFirebaseConfigured) { alert('Login unavailable: Firebase not configured. Set VITE_FIREBASE_* environment variables.'); return; } await signInWithPopup(auth, provider).catch(console.error); };
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
