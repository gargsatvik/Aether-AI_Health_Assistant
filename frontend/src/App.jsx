import React, { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- Styles ---
const styles = {
  // Global
  body: {
    margin: 0,
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    backgroundColor: '#0f172a', // slate-900
    color: '#e2e8f0', // slate-300
    height: '100vh',
    overflow: 'hidden',
  },
  // Landing Page
  landingContainer: {
    backgroundColor: '#111827',
    color: 'white',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'sans-serif',
  },
  landingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 0',
  },
  landingMain: {
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
  },
  landingTitle: {
    fontSize: '3.75rem',
    fontWeight: '800',
    letterSpacing: '-0.05em',
    lineHeight: '1.1',
  },
  landingSubtitle: {
    marginTop: '1rem',
    fontSize: '1.125rem',
    color: '#9ca3af',
  },
  landingButton: {
    marginTop: '2rem',
    backgroundImage: 'linear-gradient(to right, #2dd4bf, #38bdf8)',
    color: 'white',
    fontWeight: 'bold',
    padding: '12px 32px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.3s, transform 0.2s',
  },
  loginButton: {
    backgroundColor: 'white',
    color: 'black',
    fontWeight: '600',
    padding: '8px 20px',
    borderRadius: '8px',
    fontSize: '0.875rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  landingFooter: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 0',
    fontSize: '0.875rem',
    color: '#6b7280',
    borderTop: '1px solid #1f2937',
  },
  // App Layout
  appContainer: { display: 'flex', height: '100vh' },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    transition: 'margin-left 0.3s ease-in-out',
  },
  // Sidebar
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100%',
    width: '288px',
    backgroundColor: '#0f172a',
    borderRight: '1px solid #1e293b',
    transition: 'transform 0.3s ease-in-out',
    zIndex: 40,
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #1e293b',
  },
  sidebarNewChatBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'white',
    backgroundColor: 'rgba(56, 189, 248, 0.5)',
    borderRadius: '0.5rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  chatListItem: {
    display: 'block',
    padding: '0.75rem',
    fontSize: '0.875rem',
    borderRadius: '0.5rem',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: '#cbd5e1',
    transition: 'background-color 0.2s',
    cursor: 'pointer',
  },
  chatListItemActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    color: 'white',
  },
  // Chat Screen
  chatScreen: { display: 'flex', flexDirection: 'column', height: '100%' },
  chatMessagesContainer: { flexGrow: 1, padding: '1.5rem', overflowY: 'auto' },
  messageBubble: {
    padding: '1rem',
    borderRadius: '1.5rem',
    maxWidth: '75%',
    color: 'white',
    lineHeight: '1.5',
    wordWrap: 'break-word',
  },
  userMessage: {
    backgroundColor: '#0284c7',
    borderRadius: '1.5rem 1.5rem 0.25rem 1.5rem', // rounded-br-none
    alignSelf: 'flex-end',
  },
  modelMessage: {
    backgroundColor: '#334155',
    borderRadius: '1.5rem 1.5rem 1.5rem 0.25rem', // rounded-bl-none
  },
  chatInputForm: {
    position: 'relative',
    padding: '1.5rem',
    borderTop: '1px solid #1e293b',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  chatInput: {
    width: '100%',
    padding: '1rem 3.5rem 1rem 1rem',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '0.5rem',
    color: 'white',
    fontSize: '1rem',
    outline: 'none',
  },
  sendButton: {
    position: 'absolute',
    right: '2rem',
    top: '50%',
    transform: 'translateY(-50%)',
    padding: '0.5rem',
    borderRadius: '0.375rem',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#0ea5e9',
    transition: 'background-color 0.2s',
  },
  analysisCard: {
    padding: '1rem',
    margin: '0 1.5rem 1rem',
    border: '1px solid #334155', // slate-700
    borderRadius: '0.75rem',
    backgroundColor: 'rgba(30, 41, 59, 0.5)', // slate-800 with opacity
  },
  analysisTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#94a3b8', // slate-400
    marginBottom: '0.75rem',
  },
  predictionItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
  },
  predictionBarContainer: {
    flexGrow: 1,
    height: '8px',
    backgroundColor: '#334155', // slate-700
    borderRadius: '4px',
    margin: '0 0.75rem',
    overflow: 'hidden',
  },
  predictionBar: {
    height: '100%',
    backgroundColor: '#38bdf8', // sky-500
    borderRadius: '4px',
  },
};

// --- Helper Hook for Screen Size ---
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
const db = getFirestore(app);

// --- API Layer ---
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const api = {
  getPrediction: async (symptoms) => {
    const res = await axios.post(`${API_BASE}/predict`, { symptoms });
    return res.data || [];
  },
  chatWithAI: async (history, predictions, location) => {
    const res = await axios.post(`${API_BASE}/chat`, {
      history,
      local_predictions: predictions,
      location,
    });
    return res.data;
  },
  getChats: async (userId) => {
    const res = await axios.post(`${API_BASE}/get_chats`, { user_id: userId });
    return res.data || [];
  },
  saveChat: async (userId, chatData) => {
    await axios.post(`${API_BASE}/save_chat`, { userId, chatData });
  },
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


// --- Landing Page ---
const LandingPage = ({ handleLogin }) => {
    // ... Landing Page component remains the same from previous correct version
};


// --- NEW COMPONENT: Initial Analysis Card ---
const InitialAnalysisCard = ({ predictions }) => {
    if (!predictions || predictions.length === 0) {
        return null;
    }
    return (
        <div style={styles.analysisCard}>
            <h3 style={styles.analysisTitle}>
                <BrainCircuitIcon />
                Initial Analysis by Aether Diagnostic Model
            </h3>
            <div>
                {predictions.map((p, i) => (
                    <div key={i} style={styles.predictionItem}>
                        <span style={{ minWidth: '100px', flexShrink: 0 }}>{p.disease}</span>
                        <div style={styles.predictionBarContainer}>
                            <div style={{ ...styles.predictionBar, width: `${p.confidence * 100}%` }}></div>
                        </div>
                        <span style={{ minWidth: '40px', textAlign: 'right', flexShrink: 0 }}>{(p.confidence * 100).toFixed(0)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Chat UI Components ---
const ChatHistorySidebar = ({ chats, onSelectChat, activeChatId, onNewChat, user, onLogout, isSidebarOpen, setIsSidebarOpen }) => {
    // ... Sidebar component remains the same from previous correct version
};

const ChatMessage = ({ message }) => {
    const isUser = message.role === "user";
    return (
      <div style={{ display: 'flex', margin: '1rem 0', gap: '12px', justifyContent: isUser ? "flex-end" : "flex-start" }}>
         {!isUser && <div style={{width: '32px', height: '32px', backgroundColor: '#334155', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}><HealthAILogo/></div>}
        <div style={{...styles.messageBubble, ...(isUser ? styles.userMessage : styles.modelMessage)}}>
          <p style={{ margin: 0 }}>{message.content}</p>
        </div>
      </div>
    );
};

const WelcomeScreen = ({ onNewChat }) => (
    // ... WelcomeScreen component remains the same from previous correct version
);

const ChatScreen = ({ messages, userInput, setUserInput, handleSendMessage, loading, localPredictions }) => {
    // ... ChatScreen component remains the same from previous correct version
};

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
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  useEffect(() => {
      Object.assign(document.body.style, styles.body);
      const styleSheet = document.createElement("style");
      styleSheet.innerText = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
      document.head.appendChild(styleSheet);
      return () => {
        if(styleSheet.parentNode) {
            styleSheet.parentNode.removeChild(styleSheet)
        }
      };
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

  const fetchUserChats = async (uid) => {
    try {
        const userChats = await api.getChats(uid);
        setChats(userChats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch (error) {
        console.error("Failed to fetch user chats:", error);
    }
  };

  const handleLogin = async () => { await signInWithPopup(auth, provider).catch(console.error); };
  const handleLogout = async () => { await signOut(auth); };

  // --- MODIFIED: startNewChat ---
  const startNewChat = () => {
      setActiveChatId(uuidv4());
      // Set the new, professional opening message from Dr. Aether
      setMessages([{
          role: 'model',
          content: "Hello, I'm Dr. Aether, your personal AI health assistant. To get started, could you please tell me your name, age, sex, and describe the symptoms you're experiencing?"
      }]);
      setLocalPredictions([]); 
      setUserInput("");
      setIsSidebarOpen(false);
  };
  
  const handleSelectChat = (chat) => {
    setActiveChatId(chat.id);
    setMessages(chat.messages);
    setLocalPredictions(chat.localPredictions || []); 
    setIsSidebarOpen(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || loading) return;
    const userMessage = { role: "user", content: userInput };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setUserInput("");
    setLoading(true);

    try {
      let preds = localPredictions;
      // Predict only on the first user message of a chat session
      if (updatedMessages.filter(m => m.role === 'user').length === 1) {
        preds = await api.getPrediction(userInput);
        setLocalPredictions(preds); 
      }
      
      const history = updatedMessages.map(m => ({ role: m.role, parts: [m.content] }));
      const res = await api.chatWithAI(history, preds, "user's location");
      const finalMessages = [...updatedMessages, { role: "model", content: res.reply }];
      setMessages(finalMessages);
      
      const chatToSave = {
        id: activeChatId,
        messages: finalMessages,
        localPredictions: preds, 
        timestamp: new Date().toISOString(),
        title: finalMessages[1]?.content.substring(0, 40) || "New Chat" // Use the first user message for title
      };
      await api.saveChat(user.uid, chatToSave);
      await fetchUserChats(user.uid);
    } catch (err) {
      console.error("Error in chat flow:", err);
      setMessages(prev => [...prev, {role: "model", content: "Sorry, an error occurred. Please try again."}]);
    } finally {
      setLoading(false);
    }
  };
  
  if (!authReady) {
    return <div style={styles.body}></div>;
  }

  if (!user) {
    return <LandingPage handleLogin={handleLogin} />;
  }

  return (
    <div style={styles.appContainer}>
      <ChatHistorySidebar 
        user={user} chats={chats} onSelectChat={handleSelectChat} 
        activeChatId={activeChatId} onNewChat={startNewChat} onLogout={handleLogout}
        isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
      />
      <main style={{...styles.mainContent, marginLeft: isDesktop ? '288px' : '0'}}>
        {!isDesktop && (
            <button onClick={() => setIsSidebarOpen(true)} style={{position: 'fixed', top: '1rem', left: '1rem', zIndex: 50, background: 'rgba(30, 41, 59, 0.5)', border: 'none', padding: '0.5rem', borderRadius: '0.375rem', color: 'white', cursor: 'pointer'}}>
                <MenuIcon />
            </button>
        )}
        {activeChatId ? (
            <ChatScreen 
                messages={messages} 
                userInput={userInput} 
                setUserInput={setUserInput} 
                handleSendMessage={handleSendMessage} 
                loading={loading} 
                localPredictions={localPredictions} 
            />
        ) : (
            <WelcomeScreen onNewChat={startNewChat}/>
        )}
      </main>
    </div>
  );
}

export default App;

