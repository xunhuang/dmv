import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { firebaseConfig } from './config';

// Initialize Firebase app
let app;
let firestore;
let auth;

try {
  app = initializeApp(firebaseConfig);
  firestore = getFirestore(app);
  auth = getAuth(app);
  
  // Set persistence to LOCAL (this persists the auth state even when the browser is closed)
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log('Firebase persistence set to LOCAL');
    })
    .catch(error => {
      console.error('Error setting persistence:', error);
    });
    
  console.log('Firebase initialized');
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

// Export Firebase auth functions
export { getAuth, onAuthStateChanged };

// Helper function to check if Firebase is correctly initialized
export const isFirebaseInitialized = () => {
  return !!app && !!firestore && !!auth;
};

// Get or create anonymous user
export const getOrCreateUser = async () => {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  try {
    // First set persistence to LOCAL
    await setPersistence(auth, browserLocalPersistence);
    
    // Then sign in with Google popup
    const provider = new GoogleAuthProvider();
    // Add scopes for additional access if needed
    provider.addScope('https://www.googleapis.com/auth/userinfo.email');
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    
    const userCredential = await signInWithPopup(auth, provider);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

// Sign out current user
export const signOutUser = async () => {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Get user profile data from Firestore
export const getUserProfile = async (userId) => {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  try {
    const docRef = doc(firestore, 'userProfiles', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Create new profile if it doesn't exist
      const newProfile = {
        questionCount: 100,
        userName: '',
        userEmail: '',
        sendEmailOnSubmit: true,
        chapterScores: {},
        comprehensiveTestScores: { history: [] },
        lastUpdated: new Date().toISOString()
      };

      await setDoc(docRef, newProfile);
      return newProfile;
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Update user profile in Firestore
export const updateUserProfile = async (userId, profileData) => {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  try {
    const docRef = doc(firestore, 'userProfiles', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      await updateDoc(docRef, {
        ...profileData,
        lastUpdated: new Date().toISOString()
      });
    } else {
      await setDoc(docRef, {
        ...profileData,
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};
