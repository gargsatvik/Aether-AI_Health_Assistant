// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";


// IMPORTANT: Replace with your own Firebase configuration from your project's settings.
// It's highly recommended to use environment variables (.env file) for this to keep your keys secure.
const firebaseConfig = {
  apiKey: "AIzaSyBNC-CErH0i1qKowMQcDqGdywTcwGZ3jE4",
  authDomain: "health-app-3375e.firebaseapp.com",
  projectId: "health-app-3375e",
  storageBucket: "health-app-3375e.firebasestorage.app",
  messagingSenderId: "141929602793",
  appId: "1:141929602793:web:c1f3d0fb5506d19e33da78",
  measurementId: "G-81YPHWPWEW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export Firebase services
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export { signInWithPopup, signOut };
