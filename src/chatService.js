// chatService.js
import { db } from "./firebase";
import { collection, addDoc, getDocs, doc, setDoc } from "firebase/firestore";

export const saveChat = async (uid, chatId, data) => {
  const chatRef = doc(db, "users", uid, "chats", chatId);
  await setDoc(chatRef, data, { merge: true });
};

export const getChats = async (uid) => {
  const chatsRef = collection(db, "users", uid, "chats");
  const snapshot = await getDocs(chatsRef);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};
