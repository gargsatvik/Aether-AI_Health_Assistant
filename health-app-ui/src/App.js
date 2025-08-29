/*
 * ======================================================================
 * 🛠️ IMPORTANT: FIX FOR COMPILATION ERROR
 * ======================================================================
 * Before running, you must install the required libraries.
 * Open your terminal in the 'health-app-ui' folder and run this command:
 *
 * npm install @react-oauth/google jwt-decode
 *
 * This will resolve the "Could not resolve" error.
 * ======================================================================
 * */

// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import { GoogleOAuthProvider, GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import ReactMarkdown from 'react-markdown';

// --- Configuration ---
const BACKEND_URL = 'http://localhost:5000';
const GOOGLE_CLIENT_ID = "810392593008-9hnmbvurr1ankeoc8mdiqh5jo7edrou9.apps.googleusercontent.com"; // <-- PASTE YOUR CLIENT ID

// --- SVG Icons ---
const AppIcon = () => ( <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 2V17.77" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> );
const SendIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg> );

// --- Main App Component Logic ---
function AppContent() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('home'); // 'home' or 'chat'
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // --- Authentication ---
  useEffect(() => {
    const storedUser = localStorage.getItem('healthAppUser');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const handleLoginSuccess = (credentialResponse) => {
    const decoded = jwtDecode(credentialResponse.credential);
    const userData = { name: decoded.name, email: decoded.email, picture: decoded.picture, id: decoded.sub };
    setUser(userData);
    localStorage.setItem('healthAppUser', JSON.stringify(userData));
  };

  const handleLogout = () => {
    googleLogout();
    setUser(null);
    localStorage.removeItem('healthAppUser');
    setPage('home');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);


  // --- UI Components ---
  const LoginScreen = () => (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      <div className="text-center p-10 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 fade-in">
        <div className="flex justify-center mb-6"><AppIcon /></div>
        <h1 className="text-4xl font-bold mb-2">AI Health Assistant</h1>
        <p className="text-gray-400 mb-8">Sign in with Google to access your personal diagnostic history.</p>
        <GoogleLogin onSuccess={handleLoginSuccess} theme="filled_black" shape="pill" />
      </div>
    </div>
  );

  const Navbar = () => (
    <nav className="bg-black bg-opacity-50 backdrop-blur-lg p-4 flex justify-between items-center sticky top-0 z-50 border-b border-gray-700">
      <div className="flex items-center space-x-4 cursor-pointer" onClick={() => setPage('home')}>
        <AppIcon />
        <span className="font-bold text-xl text-white">Health AI</span>
      </div>
      <div className="flex items-center space-x-6">
        <button onClick={() => setPage('chat')} className="text-gray-300 hover:text-white transition-colors">New Diagnosis</button>
        <div className="relative" ref={dropdownRef}>
          <img src={user.picture} alt="user" className="w-10 h-10 rounded-full cursor-pointer border-2 border-gray-600 hover:border-blue-500 transition-all" onClick={() => setIsDropdownOpen(!isDropdownOpen)} />
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg py-2 border border-gray-700 dropdown-menu">
              <a href="#" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">{user.name}</a>
              <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-red-400 hover:bg-gray-700">Sign Out</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );

  if (!user) return <LoginScreen />;

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <Navbar />
      {page === 'home' && <HomeScreen setPage={setPage} />}
      {page === 'chat' && <ChatScreen user={user} />}
    </div>
  );
}

// --- Page Components ---
const HomeScreen = ({ setPage }) => (
  <div className="text-center p-10 fade-in">
    <h1 className="text-5xl font-extrabold my-8">Your Personal Health Companion</h1>
    <p className="text-gray-400 max-w-2xl mx-auto mb-10">Get instant, AI-powered insights into your health symptoms, backed by your personal history for a more accurate analysis.</p>
    <button onClick={() => setPage('chat')} className="bg-blue-600 text-white font-semibold py-3 px-8 rounded-full hover:bg-blue-700 transition-transform transform hover:scale-105 text-lg">
      Start New Diagnosis
    </button>
  </div>
);

const ChatScreen = ({ user }) => {
    const [chatHistory, setChatHistory] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [location, setLocation] = useState('Fetching location...');
    const messagesEndRef = useRef(null);

    // --- Helper Components defined inside ChatScreen ---
    const Message = ({ sender, text, localPreds }) => (
      <div className={`flex ${sender === 'user' ? 'justify-end' : 'justify-start'} mb-4 message-fade-in`}>
        <div className={`rounded-xl px-4 py-3 max-w-xl shadow-md ${sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
          <div className="prose prose-sm prose-invert"><ReactMarkdown>{text}</ReactMarkdown></div>
          {localPreds?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-600">
              <h4 className="font-semibold text-xs mb-2 text-gray-400">Local Model Quick Scan:</h4>
              <ul className="space-y-1 text-xs text-gray-300">
                {localPreds.map((p, i) => <li key={i} className="flex justify-between"><span>{p.disease}</span> <span>({(p.confidence * 100).toFixed(1)}%)</span></li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    );

    const TypingIndicator = () => ( <div className="flex justify-start mb-4"><div className="bg-gray-700 rounded-lg px-4 py-3 shadow-md"><div className="flex items-center space-x-1.5"><div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div></div></div></div>);


    useEffect(() => {
        startNewChat();
        fetchChatHistory();
        navigator.geolocation?.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await response.json();
                    const city = data.address.city || data.address.town || data.address.village || 'Unknown';
                    const country = data.address.country || 'Unknown';
                    setLocation(`${city}, ${country}`);
                } catch (error) { setLocation('Unknown location'); }
            },
            () => { setLocation('Location access denied'); }
        );
    }, []);

    const fetchChatHistory = async () => {
        if (!user) return;
        try {
            const res = await fetch(`${BACKEND_URL}/get_chats`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) });
            const data = await res.json();
            if (Array.isArray(data)) setChatHistory(data);
            else { setChatHistory([]); console.error("Backend did not return an array:", data); }
        } catch (error) { console.error("Failed to fetch chat history:", error); setChatHistory([]); }
    };

    const saveChat = async (chatToSave) => {
        if (!user) return;
        try {
            await fetch(`${BACKEND_URL}/save_chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, chatData: chatToSave }) });
            fetchChatHistory();
        } catch (error) { console.error("Failed to save chat:", error); }
    };
    
    const startNewChat = () => {
        setActiveChat({
            id: `chat_${Date.now()}`,
            messages: [{ sender: 'ai', text: "Hello! I'm your AI Health Assistant. Please describe your symptoms to get started." }],
            timestamp: new Date().toISOString(),
            title: "New Diagnosis"
        });
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading || !activeChat) return;

        const userMessageText = activeChat.messages.length === 1 ? `Patient's Location: ${location}\n\nSymptoms: ${input}` : input;
        const updatedMessages = [...activeChat.messages, { sender: 'user', text: input }];
        const updatedChat = { ...activeChat, messages: updatedMessages };
        setActiveChat(updatedChat);
        setInput('');
        setIsLoading(true);

        const historyForApi = updatedMessages.map(msg => ({ role: msg.sender === 'user' ? 'user' : 'model', parts: [msg.text] }));

        try {
            let localPredictions = [];
            if (activeChat.messages.length === 1) {
                const localRes = await fetch(`${BACKEND_URL}/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ symptoms: input }) });
                if (localRes.ok) localPredictions = await localRes.json();
            }

            const chatRes = await fetch(`${BACKEND_URL}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ history: historyForApi }) });
            if (!chatRes.ok) throw new Error('AI assistant request failed.');

            const chatData = await chatRes.json();
            const aiMessage = { sender: 'ai', text: chatData.reply, localPreds: localPredictions };
            
            const finalChat = { ...updatedChat, messages: [...updatedMessages, aiMessage] };
            if (finalChat.messages.length === 3) finalChat.title = finalChat.messages[1].text.substring(0, 30) + "...";
            setActiveChat(finalChat);
            saveChat(finalChat);

        } catch (error) {
            console.error("API Error:", error);
            setActiveChat(prev => ({...prev, messages: [...prev.messages, {sender: 'ai', text: "Sorry, an error occurred."}]}));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeChat]);

    return (
        <div className="flex h-[calc(100vh-68px)] font-sans bg-gray-800 text-gray-200 fade-in">
            {/* Sidebar for chat history */}
            <div className="w-72 bg-gray-900 border-r border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-700">
                    <button onClick={startNewChat} className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105">
                        + New Diagnosis
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <h3 className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">History</h3>
                    {chatHistory.map(chat => (
                        <div key={chat.id} onClick={() => setActiveChat(chat)} className={`m-2 p-3 cursor-pointer rounded-lg transition-colors ${activeChat?.id === chat.id ? 'bg-gray-700' : 'hover:bg-gray-800'}`}>
                            <p className="font-semibold text-sm truncate text-gray-200">{chat.title}</p>
                            <p className="text-xs text-gray-500">{new Date(chat.timestamp).toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            </div>
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-gray-800">
                {activeChat ? (
                    <>
                        <main className="flex-1 overflow-y-auto p-6">
                            <div className="max-w-4xl mx-auto">
                                {activeChat.messages.map((msg, index) => <Message key={index} {...msg} />)}
                                {isLoading && <TypingIndicator />}
                                <div ref={messagesEndRef} />
                            </div>
                        </main>
                        <footer className="bg-gray-900 border-t border-gray-700 p-4">
                            <div className="max-w-4xl mx-auto flex items-center bg-gray-700 rounded-lg p-2">
                                <input type="text" className="flex-1 bg-transparent text-gray-200 p-2 w-full focus:outline-none placeholder-gray-500" placeholder="Describe your symptoms..." value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} disabled={isLoading} />
                                <button onClick={handleSend} className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors" disabled={isLoading}><SendIcon /></button>
                            </div>
                        </footer>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">Start a new chat to begin.</div>
                )}
            </div>
        </div>
    );
};

// Top-level wrapper for Google Auth Provider
export default function AppWrapper() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppContent />
    </GoogleOAuthProvider>
  );
}
