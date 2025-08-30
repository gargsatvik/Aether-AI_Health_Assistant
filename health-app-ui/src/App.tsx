import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

// Import pages and components
import Navbar from './components/Navbar';
import LoginScreen from './pages/LoginScreen';
import HomeScreen from './pages/HomeScreen';
import ChatScreen from './pages/ChatScreen';

// Import types from our central file
import type { User, Chat } from './types';

// --- Configuration ---
const GOOGLE_CLIENT_ID = "810392593008-9hnmbvurr1ankeoc8mdiqh5jo7edrou9.apps.googleusercontent.com";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<'home' | 'chat'>('home');
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  // Check for logged-in user on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem('healthAppUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Fetch chat history when user logs in
  useEffect(() => {
    if (user) {
      fetchChatHistory();
    }
  }, [user]);

  const fetchChatHistory = async () => {
    if (!user) return;
    try {
      const res = await fetch('http://localhost:5000/get_chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) throw new Error(`Backend error: ${res.statusText}`);
      const data = await res.json();
      if (Array.isArray(data)) setChatHistory(data);
      else setChatHistory([]);
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
      setChatHistory([]);
    }
  };

  const handleLoginSuccess = (credentialResponse: { credential?: string }) => {
    if (credentialResponse.credential) {
      const decoded: any = jwtDecode(credentialResponse.credential);
      const userData: User = { id: decoded.sub, name: decoded.name, email: decoded.email, picture: decoded.picture };
      setUser(userData);
      localStorage.setItem('healthAppUser', JSON.stringify(userData));
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('healthAppUser');
    setPage('home');
    setChatHistory([]);
  };
  
  const startNewChat = () => {
    const newChat: Chat = {
      id: `chat_${Date.now()}`,
      messages: [{ sender: 'ai', text: "Hello! I'm your AI Health Assistant. Please describe your symptoms." }],
      timestamp: new Date().toISOString(),
      title: "New Diagnosis"
    };
    setActiveChat(newChat);
    setPage('chat');
  };

  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        onNewChat={startNewChat}
        chatHistory={chatHistory}
        setActiveChat={setActiveChat}
        setPage={setPage}
      />
      <main>
        {/* --- THIS IS THE FIX --- */}
        {/* We now pass the `setPage` function to the HomeScreen */}
        {page === 'home' && <HomeScreen onNewChat={startNewChat} setPage={setPage} />}
        
        {page === 'chat' && (
          <ChatScreen 
            user={user}
            activeChat={activeChat}
            setActiveChat={setActiveChat}
            onChatSave={fetchChatHistory}
          />
        )}
      </main>
    </div>
  );
}

// Wrap App with the GoogleOAuthProvider
const WrappedApp = () => (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
);

export default WrappedApp;

