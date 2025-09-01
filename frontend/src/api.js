import axios from "axios";

// The base URL for your Flask backend
const API_BASE = "http://localhost:5000";

/**
 * Gets initial disease predictions from the local model.
 * @param {string} symptoms - The user's initial symptoms.
 * @returns {Promise<Array>} A list of prediction objects.
 */
export async function getPrediction(symptoms) {
  try {
    const res = await axios.post(`${API_BASE}/predict`, { symptoms });
    return res.data || []; // Return data directly, default to empty array
  } catch (err) {
    console.error("Prediction error:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * Sends chat history to the Gemini model for a response.
 * @param {Array} history - The conversation history.
 * @param {Array} predictions - The predictions from the local model.
 * @param {string} location - The user's location.
 * @returns {Promise<Object>} The AI's reply and any returned predictions.
 */
export async function chatWithAI(history, predictions, location) {
  try {
    const res = await axios.post(`${API_BASE}/chat`, {
      history,
      local_predictions: predictions, // Ensure key matches server
      location,
    });
    return res.data;
  } catch (err) {
    console.error("Chat error:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * Retrieves all past chat sessions for a user from Firestore.
 * @param {string} userId - The user's unique Firebase ID.
 * @returns {Promise<Array>} A list of past chat objects.
 */
export async function getChats(userId) {
  try {
    // The key here is 'user_id', which we will match on the server
    const res = await axios.post(`${API_BASE}/get_chats`, { user_id: userId });
    return res.data || []; // Return data directly, default to empty array
  } catch (err) {
    console.error("Get chats error:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * Saves or updates a chat session in Firestore.
 * @param {string} userId - The user's unique Firebase ID.
 * @param {Object} chatData - The chat object to save.
 * @returns {Promise<Object>} The response from the server.
 */
export async function saveChat(userId, chatData) {
  try {
    // Send payload in the format the server expects: { userId, chatData }
    const res = await axios.post(`${API_BASE}/save_chat`, { userId, chatData });
    return res.data;
  } catch (err) {
    console.error("Save chat error:", err.response?.data || err.message);
    throw err;
  }
}
