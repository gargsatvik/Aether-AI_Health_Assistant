
// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import { GoogleOAuthProvider, GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import ReactMarkdown from 'react-markdown';

// --- Configuration ---
const BACKEND_URL = 'http://localhost:5000';
const GOOGLE_CLIENT_ID = "810392593008-9hnmbvurr1ankeoc8mdiqh5jo7edrou9.apps.googleusercontent.com"; // <-- PASTE YOUR CLIENT ID HERE

// --- Helper Components ---
const Message = ({ sender, text, localPreds }) => (
  <div className={`flex ${sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
    <div className={`rounded-lg px-4 py-2 max-w-lg ${sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
      <div className="prose"><ReactMarkdown>{text}</ReactMarkdown></div>
      {localPreds && localPreds.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-300">
          <h4 className="font-semibold text-sm mb-1">Local Model Quick Scan:</h4>
          <ul className="list-disc list-inside text-sm">
            {localPreds.map((pred, index) => <li key={index}>{pred.disease} ({(pred.confidence * 100).toFixed(1)}%)</li>)}
          </ul>
        </div>
      )}
    </div>
  </div>
);

const TypingIndicator = () => (
    <div className="flex justify-start mb-4"><div className="bg-gray-200 rounded-lg px-4 py-2"><div className="flex items-center space-x-1"><div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div><div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-75"></div><div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></div></div></div></div>
);

// --- Main App Component Logic ---
function AppContent() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState('Fetching location...');
  const [locationError, setLocationError] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages]);

  // Fetch location on mount
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (!response.ok) throw new Error('Failed to fetch address.');
          const data = await response.json();
          const city = data.address.city || data.address.town || data.address.village || 'Unknown City';
          const country = data.address.country || 'Unknown Country';
          setLocation(`${city}, ${country}`);
          setLocationError('');
        } catch (error) { setLocation('Unknown location'); setLocationError('Could not determine city.'); }
      },
      (error) => { setLocation('Location access denied'); setLocationError('Location access was denied.'); }
    );
  }, []);

  const startNewChat = () => {
    setMessages([{ 
      sender: 'ai', 
      text: "Hello! I'm your AI Health Assistant. Please describe your symptoms to get started." 
    }]);
  };

  useEffect(startNewChat, []); // Start a new chat on initial load

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessageText = messages.length === 1 
      ? `Patient's Location: ${location}\n\nSymptoms: ${input}` 
      : input;
      
    const newMessages = [...messages, { sender: 'user', text: input, role: 'user', parts: [userMessageText] }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // This is the history we will send to the backend
    const historyForApi = newMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [msg.text]
    }));

    try {
      let localPredictions = [];
      if (messages.length === 1) {
        const localRes = await fetch(`${BACKEND_URL}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symptoms: input }),
        });
        if (localRes.ok) localPredictions = await localRes.json();
      }

      const chatRes = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: historyForApi }),
      });
      
      if (!chatRes.ok) throw new Error('Failed to get response from AI assistant.');

      const chatData = await chatRes.json();
      const aiMessage = { sender: 'ai', text: chatData.reply, localPreds: localPredictions };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("API Error:", error);
      setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, an error occurred. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold mb-2">AI Health Assistant</h1>
          <p className="text-gray-600 mb-6">Please sign in to continue</p>
          <GoogleLogin
            onSuccess={credentialResponse => {
              const decoded = jwtDecode(credentialResponse.credential);
              setUser(decoded);
            }}
            onError={() => {
              console.log('Login Failed');
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans bg-gray-100 flex flex-col h-screen">
      <header className="bg-white shadow-md p-3 flex justify-between items-center">
        <div className="text-left">
          <h1 className="text-xl font-bold text-gray-800">🩺 AI Diagnostic Assistant</h1>
          <p className="text-xs text-gray-500">{locationError ? `📍 ${locationError}` : `📍 Location: ${location}`}</p>
        </div>
        <div className="flex items-center space-x-4">
            <button onClick={startNewChat} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-3 rounded-lg">New Chat</button>
            <img src={user.picture} alt="user" className="w-8 h-8 rounded-full" />
            <button onClick={() => { googleLogout(); setUser(null); }} className="text-sm bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-lg">Sign Out</button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6"><div className="max-w-3xl mx-auto">{messages.map((msg, index) => <Message key={index} sender={msg.sender} text={msg.text} localPreds={msg.localPreds} />)}{isLoading && <TypingIndicator />}<div ref={messagesEndRef} /></div></main>
      <footer className="bg-white border-t p-4"><div className="max-w-3xl mx-auto flex items-center"><input type="text" className="flex-1 border rounded-l-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Describe your symptoms..." value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} disabled={isLoading} /><button onClick={handleSend} className="bg-blue-500 text-white p-3 rounded-r-lg hover:bg-blue-600 disabled:bg-blue-300" disabled={isLoading}>Send</button></div></footer>
    </div>
  );
}

// --- Top-Level Wrapper (Default Export) ---
export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppContent />
    </GoogleOAuthProvider>
  );
}
