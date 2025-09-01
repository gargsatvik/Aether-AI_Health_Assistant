import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

// --- Firebase Setup (Merged from firebase.js) ---
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBNC-CErH0i1qKowMQcDqGdywTcwGZ3jE4",
  authDomain: "health-app-3375e.firebaseapp.com",
  projectId: "health-app-3375e",
  storageBucket: "health-app-3375e.firebasestorage.app",
  messagingSenderId: "141929602793",
  appId: "1:141929602793:web:c1f3d0fb5506d19e33da78",
  measurementId: "G-81YPHWPWEW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// --- API Layer (Merged from api.js) ---
const API_BASE = "http://localhost:5000";

async function getPrediction(symptoms) {
  try {
    const res = await axios.post(`${API_BASE}/predict`, { symptoms });
    return res.data || [];
  } catch (err) {
    console.error("Prediction error:", err.response?.data || err.message);
    throw err;
  }
}

async function chatWithAI(history, predictions, location) {
  try {
    const res = await axios.post(`${API_BASE}/chat`, {
      history,
      local_predictions: predictions,
      location,
    });
    return res.data;
  } catch (err) {
    console.error("Chat error:", err.response?.data || err.message);
    throw err;
  }
}

async function getChats(userId) {
  try {
    const res = await axios.post(`${API_BASE}/get_chats`, { user_id: userId });
    return res.data || [];
  } catch (err) {
    console.error("Get chats error:", err.response?.data || err.message);
    throw err;
  }
}

async function saveChat(userId, chatData) {
  try {
    const res = await axios.post(`${API_BASE}/save_chat`, { userId, chatData });
    return res.data;
  } catch (err) {
    console.error("Save chat error:", err.response?.data || err.message);
    throw err;
  }
}


// --- Helper Components ---
const ChatMessage = ({ message }) => {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} my-2`}>
      <div
        className={`p-3 rounded-lg max-w-lg ${
          isUser
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-800"
        }`}
      >
        <p style={{ whiteSpace: "pre-wrap" }}>{message.content}</p>
      </div>
    </div>
  );
};

const LoginScreen = ({ handleLogin }) => (
  <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
    <h1 className="text-3xl font-bold mb-2 text-gray-700">Health AI Assistant</h1>
    <p className="text-gray-500 mb-6">Sign in to manage your chat history.</p>
    <button
      onClick={handleLogin}
      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
    >
      Login with Google
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
  const chatEndRef = useRef(null);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setChats([]);
        setActiveChatId(null);
        setMessages([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch chats when user logs in
  useEffect(() => {
    if (user) {
      fetchUserChats();
    }
  }, [user]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchUserChats = async () => {
    if (!user) return;
    try {
      const userChats = await getChats(user.uid);
      setChats(userChats);
    } catch (err) {
      console.error("Failed to fetch user chats:", err);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setLocalPredictions([]);
    setUserInput("");
  };

  const handleSelectChat = (chat) => {
    setActiveChatId(chat.id);
    setMessages(chat.messages);
    setLocalPredictions(chat.localPredictions || []);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || loading) return;

    const userMessage = { role: "user", content: userInput };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setUserInput("");
    setLoading(true);

    let currentChatId = activeChatId;
    let preds = localPredictions;

    try {
      if (updatedMessages.length === 1) {
        preds = await getPrediction(userInput);
        setLocalPredictions(preds);
      }
      
      const history = updatedMessages.map(m => ({ role: m.role, parts: [m.content] }));
      
      const res = await chatWithAI(history, preds, "user's location");
      const aiMessage = { role: "model", content: res.reply };

      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);

      if (user) {
        const chatToSave = {
          id: currentChatId || uuidv4(),
          messages: finalMessages,
          localPredictions: preds,
          timestamp: new Date().toISOString(),
          title: finalMessages[0]?.content.substring(0, 30) || "New Chat"
        };
        
        if (!currentChatId) {
            setActiveChatId(chatToSave.id);
        }

        await saveChat(user.uid, chatToSave);
        await fetchUserChats();
      }
    } catch (err) {
      console.error("Error in chat flow:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <LoginScreen handleLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen font-sans bg-gray-100">
      <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-bold text-lg">{user.displayName}'s Chats</h2>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">Logout</button>
        </div>
        <div className="flex-grow overflow-y-auto">
          <button 
            onClick={handleNewChat} 
            className="w-full text-left p-4 font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border-b"
          >
            + New Chat
          </button>
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => handleSelectChat(chat)}
              className={`p-4 cursor-pointer border-b border-gray-200 ${
                activeChatId === chat.id ? "bg-gray-200" : "hover:bg-gray-50"
              }`}
            >
              <p className="font-semibold truncate">{chat.title || "Chat"}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="w-3/4 flex flex-col">
        <div className="flex-grow p-6 overflow-y-auto">
          {messages.length === 0 ? (
             <div className="flex items-center justify-center h-full text-gray-500">
                Start a new conversation by typing your symptoms below.
             </div>
          ) : (
            messages.map((msg, index) => <ChatMessage key={index} message={msg} />)
          )}
          <div ref={chatEndRef} />
        </div>
        
        {localPredictions.length > 0 && (
             <div className="px-6 pb-2">
                 <div className="p-3 border rounded-lg bg-gray-50 text-sm">
                    <h3 className="font-bold mb-1">Initial Quick Scan:</h3>
                    <ul className="list-disc list-inside">
                        {localPredictions.map((p, i) => (
                        <li key={i}>{p.disease} ({(p.confidence * 100).toFixed(1)}% confidence)</li>
                        ))}
                    </ul>
                 </div>
             </div>
        )}

        <div className="p-6 bg-white border-t border-gray-200">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Describe your symptoms..."
              className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 text-white font-bold py-3 px-6 rounded-lg disabled:bg-blue-300 hover:bg-blue-600"
            >
              {loading ? "Thinking..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;

