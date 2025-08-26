// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

// --- Configuration ---
const BACKEND_URL = 'http://localhost:5000';

// --- Helper Components ---
const Message = ({ sender, text, localPreds }) => (
  <div className={`flex ${sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
    <div 
      className={`rounded-lg px-4 py-2 max-w-lg ${sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
    >
      <div className="prose">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
      {localPreds && localPreds.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-300">
          <h4 className="font-semibold text-sm mb-1">Local Model Quick Scan:</h4>
          <ul className="list-disc list-inside text-sm">
            {localPreds.map((pred, index) => (
              <li key={index}>
                {pred.disease} ({(pred.confidence * 100).toFixed(1)}%)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  </div>
);

const TypingIndicator = () => (
  <div className="flex justify-start mb-4">
    <div className="bg-gray-200 rounded-lg px-4 py-2">
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-75"></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></div>
      </div>
    </div>
  </div>
);


// --- Main App Component ---
export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`session_${Date.now()}`);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    // Initial greeting from the AI
    setMessages([{ 
      sender: 'ai', 
      text: "Hello! I'm your AI Health Assistant. Please describe your symptoms to get started." 
    }]);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let localPredictions = [];
      // Only call the local model on the first message
      if (messages.length <= 1) { 
        const localRes = await fetch(`${BACKEND_URL}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symptoms: input }),
        });
        if (localRes.ok) {
          localPredictions = await localRes.json();
        }
      }

      // Call the Gemini chat model
      const chatRes = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, session_id: sessionId }),
      });
      
      if (!chatRes.ok) throw new Error('Failed to get response from AI assistant.');

      const chatData = await chatRes.json();
      const aiMessage = { 
        sender: 'ai', 
        text: chatData.reply, 
        localPreds: localPredictions 
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("API Error:", error);
      const errorMessage = { 
        sender: 'ai', 
        text: "Sorry, I'm having trouble connecting to my brain right now. Please try again in a moment." 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="font-sans bg-gray-100 flex flex-col h-screen">
      <header className="bg-white shadow-md p-4">
        <h1 className="text-2xl font-bold text-gray-800 text-center">
          🩺 AI Diagnostic Assistant
        </h1>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          {messages.map((msg, index) => (
            <Message key={index} sender={msg.sender} text={msg.text} localPreds={msg.localPreds} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="bg-white border-t p-4">
        <div className="max-w-3xl mx-auto flex items-center">
          <input
            type="text"
            className="flex-1 border rounded-l-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe your symptoms..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            className="bg-blue-500 text-white p-3 rounded-r-lg hover:bg-blue-600 disabled:bg-blue-300"
            disabled={isLoading}
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}
