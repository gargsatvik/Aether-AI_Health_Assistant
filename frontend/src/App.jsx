import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- Firebase & API Layer (Defined before Components) ---
const firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
getFirestore(app);

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const api = {
    chatWithAI: async (history, predictions, stage) => {
        return (await axios.post(`${API_BASE}/chat`, { history, local_predictions: predictions, stage })).data;
    },
    getChats: async (userId) => (await axios.post(`${API_BASE}/get_chats`, { user_id: userId })).data || [],
    saveChat: async (userId, chatData) => await axios.post(`${API_BASE}/save_chat`, { userId, chatData }),
};

// --- Styles ---
const styles = {
    colors: {
        background: '#0a0a0a', surface: '#1a1a1a', primaryText: '#f5f5f5',
        secondaryText: '#a3a3a3', accent: '#2563eb', accentHover: '#1d4ed8',
        glow: 'rgba(59, 130, 246, 0.7)', subtleBorder: '#262626',
    },
    fontFamily: "'Roboto', 'Inter', system-ui, -apple-system, sans-serif",
    body: {
        margin: 0, fontFamily: "'Roboto', 'Inter', system-ui, -apple-system, sans-serif",
        backgroundColor: '#0a0a0a', color: '#a3a3a3', height: '100vh', overflow: 'hidden',
    },
    appContainer: { display: 'flex', height: '100vh' },
    mainContent: {
        flex: 1, display: 'flex', flexDirection: 'column', height: '100vh',
        transition: 'margin-left 0.3s ease-in-out', backgroundColor: 'transparent',
        position: 'relative',
    },
    landingContainer: {
        backgroundColor: '#0a0a0a', color: '#a3a3a3', height: '100vh',
        display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
    },
    landingHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px', zIndex: 100,
    },
    landingFooter: {
        display: 'flex', justifyContent: 'center', gap: '32px', padding: '24px 32px',
        zIndex: 100
    },
    landingMain: {
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', textAlign: 'center', padding: '32px',
        gap: '24px', position: 'relative', overflow: 'hidden'
    },
    backgroundCanvas: {
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        zIndex: 0, opacity: 0.2
    },
    landingContent: { zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' },
    landingTitle: {
        fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 'clamp(3rem, 6vw, 4.5rem)',
        color: '#f5f5f5', margin: '0 0 16px 0', letterSpacing: '-0.025em',
        lineHeight: 1.2
    },
    landingSubtitle: {
        fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: '#a3a3a3',
        maxWidth: '600px', margin: '0 0 32px 0', lineHeight: 1.6,
    },
    landingButton: {
        backgroundColor: '#2563eb', color: '#f5f5f5', fontWeight: '500',
        padding: '14px 28px', borderRadius: '8px', border: 'none',
        cursor: 'pointer', transition: 'all 0.2s ease', fontSize: '1rem',
        boxShadow: '0 0 20px rgba(37, 99, 235, 0.4)',
    },
    sidebar: {
        position: 'fixed', top: 0, left: 0, height: '100%', width: '288px',
        backgroundColor: '#121212', borderRight: '1px solid #262626',
        transition: 'transform 0.3s ease-in-out', zIndex: 40,
        display: 'flex', flexDirection: 'column',
    },
    sidebarHeader: {
        padding: '1.5rem', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', borderBottom: '1px solid #262626'
    },
    sidebarNewChatBtn: {
        width: 'auto', margin: '0', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '0.5rem', padding: '12px 24px',
        fontSize: '16px', fontWeight: '500', color: '#f5f5f5',
        backgroundColor: '#2563eb', borderRadius: '8px', border: 'none',
        cursor: 'pointer', transition: 'background-color 0.2s ease',
    },
    chatListItem: {
        display: 'block', padding: '0.75rem 1.5rem', fontSize: '14px',
        borderRadius: '8px', textDecoration: 'none', whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis', color: '#a3a3a3',
        transition: 'background-color 0.2s, color 0.2s', cursor: 'pointer',
    },
    chatListItemActive: { backgroundColor: '#262626', color: '#f5f5f5' },
    chatScreen: { display: 'flex', flexDirection: 'column', height: '100%', zIndex: 1, backgroundColor: 'rgba(10,10,10,0.6)', backdropFilter: 'blur(3px)' },
    chatMessagesContainer: { flexGrow: 1, padding: '32px', overflowY: 'auto' },
    messageBubble: {
        padding: '1rem 1.5rem', borderRadius: '1.5rem', maxWidth: '75%',
        color: '#f5f5f5', lineHeight: '1.5', wordWrap: 'break-word',
    },
    userMessage: {
        backgroundColor: '#2563eb',
        borderRadius: '1.5rem 1.5rem 0.25rem 1.5rem', alignSelf: 'flex-end',
    },
    modelMessage: {
        backgroundColor: 'rgba(30, 30, 30, 0.8)',
        borderRadius: '1.5rem 1.5rem 1.5rem 0.25rem',
    },
    chatInput: {
        flexGrow: 1, padding: '1rem', backgroundColor: '#1E1E1E',
        border: '1px solid #262626', borderRadius: '8px',
        color: '#f5f5f5', fontSize: '16px', outline: 'none',
    },
    chatInputContainer: {
        display: 'flex', gap: '0.5rem', alignItems: 'center',
        padding: '0 32px 32px 32px'
    },
    sendButton: {
        padding: '12px', borderRadius: '8px', color: '#f5f5f5',
        border: 'none', cursor: 'pointer', backgroundColor: '#2563eb',
        transition: 'background-color 0.2s ease', display: 'flex',
        alignItems: 'center', justifyContent: 'center'
    },
    analysisCard: {
        padding: '1rem', margin: '0 32px 1rem', border: '1px solid #262626',
        borderRadius: '12px', backgroundColor: 'rgba(26, 26, 26, 0.8)',
    },
    locationDisplay: {
        padding: '1rem 1.5rem', display: 'flex', alignItems: 'center',
        gap: '0.75rem', fontSize: '14px', color: '#a3a3a3',
        borderTop: '1px solid #262626',
    },
    suggestionChipsContainer: {
        display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center',
        padding: '0 32px 1rem',
    },
    suggestionChip: {
        padding: '0.5rem 1rem', backgroundColor: '#1E1E1E',
        border: '1px solid #262626', borderRadius: '9999px',
        cursor: 'pointer', color: '#a3a3a3',
        transition: 'background-color 0.2s',
    },
    summaryCard: {
        margin: '0 32px 1rem', padding: '1.5rem', backgroundColor: 'rgba(26, 26, 26, 0.8)',
        border: '1px solid #262626', borderRadius: '12px',
    },
    summaryTitle: { fontSize: '1.125rem', fontWeight: 'bold', color: '#f5f5f5', marginBottom: '1rem' },
    summarySection: { marginBottom: '1rem' },
    summaryLabel: { fontWeight: '600', color: '#a3a3a3', marginBottom: '0.25rem' },
};

// --- Helper Hook ---
const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const media = window.matchMedia(query);
        const listener = () => setMatches(media.matches);
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [query]);
    return matches;
};

// --- SVG Icons ---
const AetherLogoSVG = () => <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:'32px',height:'32px'}}><path d="M12 2L3 22H21L12 2Z" stroke="#e0e0e0" strokeWidth="1.5" /><path d="M7 15L12 5L17 15H7Z" stroke="#e0e0e0" strokeWidth="1.5" /></svg>;
const YourLogo = () => (
    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15.09 8.09L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.09L12 2Z" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 12H15" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 9V15" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <span style={{color: styles.colors.primaryText, fontFamily: "'Inter', sans-serif", fontWeight: '600', fontSize: '22px'}}>Aether</span>
    </div>
);
const SendIcon = () => <svg style={{width:'20px',height:'20px'}} viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>;
const PlusIcon = () => <svg style={{width:'20px',height:'20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;
const SignOutIcon = () => <svg style={{width:'20px',height:'20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const MenuIcon = () => <svg style={{width:'24px',height:'24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;
const BrainCircuitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 0-10 10c0 1.85.54 3.58 1.48 5.04M12 22a10 10 0 0 0 10-10c0-1.85-.54-3.58-1.48-5.04M12 2v20m6.5-15.5-.42.42c-1.33 1.33-2.08 3.12-2.08 4.95v.21c0 1.83.75 3.62 2.08 4.95l.42.42m0-15-.42-.42c-1.33-1.33-2.08-3.12-2.08-4.95v-.21c0-1.83.75-3.62 2.08-4.95l.42-.42m-13 15 .42.42c1.33 1.33 2.08 3.12 2.08 4.95v.21c0 1.83-.75 3.62-2.08 4.95l-.42.42m0-15 .42-.42c1.33-1.33-2.08-3.12-2.08-4.95v-.21c0-1.83-.75-3.62-2.08-4.95l-.42-.42" /></svg>;
const LocationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>;

// --- Helper Components ---
const NeuralNetworkAnimation = () => { /* ... Animation component remains unchanged ... */ };
const LandingPage = ({ handleLogin }) => { /* ... LandingPage component remains unchanged ... */ };
const InitialAnalysisCard = ({ predictions }) => { /* ... InitialAnalysisCard component remains unchanged ... */ };
const ChatHistorySidebar = ({ chats, onSelectChat, activeChatId, onNewChat, user, onLogout, isSidebarOpen, setIsSidebarOpen, userLocation }) => { /* ... Sidebar component remains unchanged ... */ };
const ChatMessage = ({ message }) => {
    const isUser = message.role === "user";
    return (
        <div style={{ display:'flex', margin:'1rem 0', gap:'12px', justifyContent: isUser ? "flex-end" : "flex-start" }}>
            {!isUser && <div style={{width:'32px',height:'32px',backgroundColor:'#1E1E1E',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><AetherLogoSVG /></div>}
            <div style={{...styles.messageBubble, ...(isUser ? styles.userMessage : styles.modelMessage)}}>
                <p style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: message.content.replace(/\*([^*]+)\*/g, '<b>$1</b>').replace(/\n/g, '<br />') }} />
            </div>
        </div>
    );
};
const WelcomeScreen = ({ onNewChat }) => (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',textAlign:'center',padding:'1rem', zIndex: 1}}>
        <AetherLogoSVG />
        <h2 style={{fontSize:'24px',fontWeight:400,color:'#a3a3a3',marginTop:'1rem',marginBottom:'1.5rem'}}>Welcome to Aether</h2>
        <button onClick={onNewChat} style={styles.sidebarNewChatBtn}>Start New Chat</button>
    </div>
);
const ChatScreen = ({ messages, userInput, setUserInput, handleSendMessage, loading, localPredictions, conversationStage, onChipClick, suggestionChips, chatSummary, isChatConcluded }) => {
    const chatEndRef = useRef(null);
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, localPredictions, chatSummary]);

    return (
        <div style={styles.chatScreen}>
            <div style={{...styles.chatMessagesContainer, display: 'flex', flexDirection: 'column'}}>
                <div style={{flexGrow: 1}}>
                    {messages.map((msg, index) => <ChatMessage key={index} message={msg} />)}
                </div>
                <InitialAnalysisCard predictions={localPredictions} />
                {chatSummary && <ChatSummaryCard summary={chatSummary} />}
                <div ref={chatEndRef} />
            </div>
            {!isChatConcluded && <SuggestionChips chips={suggestionChips} onChipClick={onChipClick} />}
            <div style={{ borderTop: `1px solid ${styles.colors.subtleBorder}`}}>
                <form onSubmit={handleSendMessage} style={styles.chatInputContainer}>
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={
                            isChatConcluded ? "This consultation has concluded." :
                            conversationStage === 'awaiting_name' ? 'Please enter your name...' :
                            conversationStage === 'awaiting_age' ? 'Please enter your age...' :
                            conversationStage === 'awaiting_sex' ? 'Please enter your sex...' :
                            conversationStage === 'awaiting_symptoms' ? 'Describe your symptoms in detail...' :
                            'Send a message...'
                        }
                        style={styles.chatInput}
                        disabled={loading || isChatConcluded}
                    />
                    <button type="submit" style={styles.sendButton} disabled={loading || isChatConcluded}>
                        {loading ? <div style={{width:'20px',height:'20px',border:'2px solid #a3a3a3',borderTopColor:'#f5f5f5',borderRadius:'50%',animation:'spin 1s linear infinite'}} /> : <SendIcon />}
                    </button>
                </form>
            </div>
        </div>
    );
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
    const [userLocation, setUserLocation] = useState('Locating...');
    const [conversationStage, setConversationStage] = useState('greeting');
    const [suggestionChips, setSuggestionChips] = useState([]);
    const [chatSummary, setChatSummary] = useState(null);
    const [isChatConcluded, setIsChatConcluded] = useState(false);
    
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    
    useEffect(() => {
        Object.assign(document.body.style, styles.body);
        const styleSheet = document.createElement("style");
        styleSheet.innerText = `@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Inter:wght@600;700&display=swap'); @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
        document.head.appendChild(styleSheet);
        return () => { styleSheet.parentNode?.removeChild(styleSheet); };
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
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

    const fetchUserChats = async (uid) => {
        try {
            const userChats = await api.getChats(uid);
            setChats(userChats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        } catch (error) { console.error("Failed to fetch user chats:", error); }
    };

    const handleLogin = async () => { await signInWithPopup(auth, provider).catch(console.error); };
    const handleLogout = async () => { await signOut(auth); };
    
    const startNewChat = () => {
        setActiveChatId(uuidv4());
        setMessages([{
            role: 'model',
            content: "Hello, I'm Dr. Aether. To get started, could you please tell me your full name?"
        }]);
        setLocalPredictions([]); setUserInput(""); setIsSidebarOpen(false); 
        setConversationStage('awaiting_name');
        setSuggestionChips([]); setChatSummary(null); setIsChatConcluded(false);
    };

    const handleSelectChat = (chat) => {
        setActiveChatId(chat.id); 
        setMessages(chat.messages);
        setLocalPredictions(chat.localPredictions || []); 
        setChatSummary(chat.summary || null);
        setIsChatConcluded(!!chat.summary);
        setConversationStage('chatting');
        setSuggestionChips([]);
        setIsSidebarOpen(false);
    };

    const handleSendMessage = async (e, chipText = null) => {
        if (e) e.preventDefault();
        const textToSend = chipText || userInput;
        if (!textToSend.trim() || loading) return;

        const userMessage = { role: "user", content: textToSend };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setUserInput("");
        setLoading(true);
        setSuggestionChips([]);

        try {
            const history = updatedMessages.map(m => ({ role: m.role, parts: [m.content] }));
            let stageForBackend = conversationStage;
            if (conversationStage === 'awaiting_symptoms') {
                stageForBackend = 'process_symptoms';
            }

            const res = await api.chatWithAI(history, localPredictions, stageForBackend); 
            let aiResponse = res.reply;
            let finalSummary = chatSummary;

            if (aiResponse.includes('[CHIPS:')) {
                const chipMatch = aiResponse.match(/\[CHIPS: (.*?)\]/);
                if (chipMatch) {
                    try { setSuggestionChips(JSON.parse(chipMatch[1])); } catch (err) { console.error("Chip JSON error:", err); }
                    aiResponse = aiResponse.replace(chipMatch[0], '').trim();
                }
            } else if (aiResponse.includes('[SUMMARY:')) {
                const summaryMatch = aiResponse.match(/\[SUMMARY: (.*)\]/s);
                if (summaryMatch) {
                    try {
                        const summaryJson = JSON.parse(summaryMatch[1].replace(/\\/g, ''));
                        setChatSummary(summaryJson);
                        finalSummary = summaryJson;
                        setIsChatConcluded(true);
                        aiResponse = "Here is a summary of our conversation.";
                    } catch (err) { console.error("Summary JSON error:", err); }
                }
            } else if (aiResponse.includes('[EMERGENCY]')) {
                aiResponse = "Based on your description, this could be a medical emergency. **Please contact your local emergency services immediately.**";
                setIsChatConcluded(true);
            }

            const finalMessages = [...updatedMessages, { role: "model", content: aiResponse }];
            
            if (res.predictions && res.predictions.length > 0) {
                setLocalPredictions(res.predictions);
            }

            setMessages(finalMessages);

            if (conversationStage === 'awaiting_name') setConversationStage('awaiting_age');
            else if (conversationStage === 'awaiting_age') setConversationStage('awaiting_sex');
            else if (conversationStage === 'awaiting_sex') setConversationStage('awaiting_symptoms');
            else if (stageForBackend === 'process_symptoms') setConversationStage('chatting');
            
            const chatToSave = {
                id: activeChatId, messages: finalMessages, 
                localPredictions: res.predictions || localPredictions,
                summary: finalSummary,
                timestamp: new Date().toISOString(),
                title: finalMessages[1]?.content.substring(0, 40) || "New Chat"
            };

            await api.saveChat(user.uid, chatToSave);
            fetchUserChats(user.uid);

        } catch (err) {
            console.error("Error in chat flow:", err);
            setMessages(prev => [...prev, {role: "model", content: "Sorry, an error occurred."}]);
        } finally {
            setLoading(false);
        }
    };

    if (!authReady) return <div style={styles.body}></div>;
    
    if (!user) return <LandingPage handleLogin={handleLogin} />;
    
    return (
        <div style={styles.appContainer}>
            <ChatHistorySidebar user={user} chats={chats} onSelectChat={handleSelectChat} activeChatId={activeChatId} onNewChat={startNewChat} onLogout={handleLogout} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} userLocation={userLocation} />
            <main style={{ ...styles.mainContent, marginLeft: isDesktop ? '288px' : '0' }}>
                 <NeuralNetworkAnimation />
                {!isDesktop && <button onClick={() => setIsSidebarOpen(true)} style={{ position:'fixed',top:'1rem',left:'1rem',zIndex:50,background:'rgba(30,41,59,0.5)',border:'none',padding:'0.5rem',borderRadius:'8px',color:'white',cursor:'pointer' }}><MenuIcon /></button>}
                {activeChatId ? (
                     <ChatScreen 
                        messages={messages} 
                        userInput={userInput} 
                        setUserInput={setUserInput} 
                        handleSendMessage={handleSendMessage} 
                        loading={loading} 
                        localPredictions={localPredictions} 
                        conversationStage={conversationStage}
                        onChipClick={(chipText) => handleSendMessage(null, chipText)}
                        suggestionChips={suggestionChips}
                        chatSummary={chatSummary}
                        isChatConcluded={isChatConcluded}
                    />
                ) : ( <WelcomeScreen onNewChat={startNewChat} /> )}
            </main>
        </div>
    );
}

export default App;

