import React, { useState, useRef, useEffect } from 'react';
import type { User, Chat } from '../types'; // Import from the central types file
 // Import from the central types file
import { History, User as UserIcon, LogOut, MessageSquarePlus } from 'lucide-react';

type NavbarProps = {
  user: User;
  onLogout: () => void;
  onNewChat: () => void;
  chatHistory: Chat[];
  setActiveChat: (chat: Chat) => void;
  setPage: (page: 'home' | 'chat') => void;
};

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onNewChat, chatHistory, setActiveChat, setPage }) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) setHistoryOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectChat = (chat: Chat) => {
    setActiveChat(chat);
    setPage('chat');
    setHistoryOpen(false);
  };

  return (
    <nav className="bg-gray-900/80 backdrop-blur-lg p-3 flex justify-between items-center sticky top-0 z-50 border-b border-gray-700">
      <div className="flex items-center space-x-4 cursor-pointer" onClick={() => setPage('home')}>
        <span className="font-bold text-xl text-white">Health AI</span>
      </div>
      <div className="flex items-center space-x-4">
        <button onClick={onNewChat} className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
          <MessageSquarePlus size={20} />
          <span>New Chat</span>
        </button>
        
        {/* Chat History Dropdown */}
        <div className="relative" ref={historyRef}>
          <button onClick={() => setHistoryOpen(!historyOpen)} className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
            <History size={20} />
            <span>History</span>
          </button>
          {historyOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-lg shadow-lg p-2 border border-gray-700">
              {chatHistory.length > 0 ? (
                chatHistory.map(chat => (
                  <div key={chat.id} onClick={() => handleSelectChat(chat)} className="p-2 cursor-pointer rounded hover:bg-gray-700">
                    <p className="font-semibold text-sm truncate">{chat.title}</p>
                    <p className="text-xs text-gray-500">{new Date(chat.timestamp).toLocaleString()}</p>
                  </div>
                ))
              ) : (
                <p className="p-2 text-sm text-gray-500">No past chats found.</p>
              )}
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <img src={user.picture} alt="user" className="w-9 h-9 rounded-full cursor-pointer border-2 border-gray-600 hover:border-blue-500 transition-all" onClick={() => setUserMenuOpen(!userMenuOpen)} />
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg py-2 border border-gray-700">
              <div className="px-4 py-2 text-sm text-gray-300 border-b border-gray-700">
                <p className="font-semibold truncate">{user.name}</p>
              </div>
              <button onClick={onLogout} className="w-full text-left flex items-center space-x-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700">
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

