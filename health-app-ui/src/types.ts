// src/types.ts

// Represents the logged-in user's information
export type User = {
  id: string;
  name: string;
  email: string;
  picture: string;
};

// Represents a single message in a conversation
export type Message = {
    sender: 'user' | 'ai';
    text: string;
    localPreds?: { disease: string, confidence: number }[];
};

// Represents an entire chat conversation
export type Chat = {
    id: string;
    messages: Message[];
    timestamp: string;
    title: string;
};
