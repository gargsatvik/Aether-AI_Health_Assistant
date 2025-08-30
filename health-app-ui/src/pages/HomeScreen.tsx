import React from 'react';

// Define the types for the props this component will receive
type HomeScreenProps = {
  onNewChat: () => void;
  setPage: (page: 'home' | 'chat') => void;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ onNewChat, setPage }) => {
  return (
    <div className="text-center p-10">
      <h1 className="text-5xl font-extrabold my-8">Your Personal Health Companion</h1>
      <p className="text-gray-400 max-w-2xl mx-auto mb-10">
        Get instant, AI-powered insights into your health symptoms, backed by your personal history for a more accurate analysis.
      </p>
      {/* This button will now work correctly */}
      <button onClick={() => setPage('chat')} className="bg-blue-600 text-white font-semibold py-3 px-8 rounded-full hover:bg-blue-700 transition-transform transform hover:scale-105 text-lg">
        Start New Diagnosis
      </button>
    </div>
  );
};

export default HomeScreen;

