import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send } from 'lucide-react';

// --- Configuration ---
const BACKEND_URL = 'http://localhost:5000';

// --- Type Definitions ---
// Moved here to resolve the import error.
// For a larger app, these would ideally be in a dedicated types.ts file.
export type User = {
  id: string;
  name: string;
  email: string;
  picture: string;
};

export type Message = {
    sender: 'user' | 'ai';
    text: string;
    localPreds?: { disease: string, confidence: number }[];
};

export type Chat = {
    id: string;
    messages: Message[];
    timestamp: string;
    title: string;
};

type ChatScreenProps = {
  user: User;
  activeChat: Chat | null;
  setActiveChat: (chat: Chat | null) => void;
  onChatSave: () => void; // Function to notify parent to refetch history
};

// --- Helper Components ---
const MessageBubble: React.FC<Message> = ({ sender, text, localPreds }) => (
    <div className={`flex ${sender === 'user' ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}>
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

const TypingIndicator = () => (
    <div className="flex justify-start mb-4">
        <div className="bg-gray-700 rounded-lg px-4 py-3 shadow-md">
            <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
        </div>
    </div>
);


// --- Main ChatScreen Component ---
const ChatScreen: React.FC<ChatScreenProps> = ({ user, activeChat, setActiveChat, onChatSave }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [location, setLocation] = useState('Fetching location...');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Automatically scroll to the bottom of the chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeChat?.messages, isLoading]);

    // Fetch user's location
    useEffect(() => {
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
    
    const saveChat = async (chatToSave: Chat) => {
        if (!user) return;
        try {
            await fetch(`${BACKEND_URL}/save_chat`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ userId: user.id, chatData: chatToSave }) 
            });
            onChatSave(); // Notify parent to refetch history
        } catch (error) { 
            console.error("Failed to save chat:", error); 
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading || !activeChat) return;

        const updatedMessages: Message[] = [...activeChat.messages, { sender: 'user', text: input }];
        let updatedChat: Chat = { ...activeChat, messages: updatedMessages };
        setActiveChat(updatedChat);
        setInput('');
        setIsLoading(true);
        
        const historyForApi = updatedMessages.map(msg => ({ 
            role: msg.sender === 'user' ? 'user' : 'model', 
            parts: [msg.text] 
        }));

        try {
            let localPredictions: { disease: string, confidence: number }[] = [];
            // Only get local model predictions on the first user message
            if (activeChat.messages.length === 1) {
                const localRes = await fetch(`${BACKEND_URL}/predict`, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ symptoms: input }) 
                });
                if (localRes.ok) localPredictions = await localRes.json();
            }

            const chatRes = await fetch(`${BACKEND_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    history: historyForApi,
                    local_predictions: localPredictions,
                    location: location,
                }),
            });
            if (!chatRes.ok) throw new Error('AI assistant request failed.');

            const chatData = await chatRes.json();
            const aiMessage: Message = { sender: 'ai', text: chatData.reply, localPreds: localPredictions };
            
            const finalChat = { ...updatedChat, messages: [...updatedMessages, aiMessage] };
            // Set a title for the chat based on the first message
            if (finalChat.messages.length === 3) { // After first user message and first AI response
                finalChat.title = finalChat.messages[1].text.substring(0, 40) + "...";
            }
            
            setActiveChat(finalChat);
            await saveChat(finalChat);

        } catch (error) {
            console.error("API Error:", error);
            const errorMessage: Message = { sender: 'ai', text: "Sorry, an error occurred. Please try again." };
            setActiveChat(prev => prev ? { ...prev, messages: [...prev.messages, errorMessage] } : null);
        } finally {
            setIsLoading(false);
        }
    };

    if (!activeChat) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-68px)] text-gray-500">
                <p>Select a chat from history or start a new one.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-gray-800 h-[calc(100vh-68px)]">
            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">
                    {activeChat.messages.map((msg, index) => <MessageBubble key={index} {...msg} />)}
                     {isLoading && <TypingIndicator />}
                    <div ref={messagesEndRef} />
                </div>
            </main>
            <footer className="bg-gray-900 p-4 border-t border-gray-700">
                <div className="max-w-4xl mx-auto flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Describe your symptoms..."
                        className="w-full bg-gray-700 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                    <button onClick={handleSend} className="bg-blue-600 rounded-lg p-3 ml-4 hover:bg-blue-700 disabled:opacity-50" disabled={isLoading}>
                        <Send />
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default ChatScreen;

