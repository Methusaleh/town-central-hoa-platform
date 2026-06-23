import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword // <-- Added this built-in Firebase method
} from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA-oYpm-4_Mmj377y1NjgMVVSRCWXoJx7c",
  authDomain: "town-central-portal.firebaseapp.com",
  projectId: "town-central-portal",
  storageBucket: "town-central-portal.firebasestorage.app",
  messagingSenderId: "823023752042",
  appId: "1:823023752042:web:7d403f505738f5caaecb13",
  measurementId: "G-3NDC1TRYXR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// Initialize Services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Custom sign-in helper using a clean popup window
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Authentication Error:", error);
    throw error;
  }
};

// Custom traditional email/password registration helper
export const registerWithEmail = async (email, password) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error("Email Registration Error:", error);
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