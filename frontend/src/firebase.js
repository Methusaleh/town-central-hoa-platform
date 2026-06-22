import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Your web app's Firebase configuration
// These can be replaced with your live credentials once you create your Firebase Console project
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-api-key",
  authDomain: "town-central-hoa.firebaseapp.com",
  projectId: "town-central-hoa",
  storageBucket: "town-central-hoa.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Custom sign-in helper using a clean popup window
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // This gives you the authenticated user object (name, email, photoURL, etc.)
    return result.user;
  } catch (error) {
    console.error("Google Authentication Error:", error);
    throw error;
  }
};

// Custom logout helper
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
  }
};