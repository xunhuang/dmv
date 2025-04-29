import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from './config';

// Initialize Firebase app
let app;
let firestore;
let auth;

try {
  app = initializeApp(firebaseConfig);
  firestore = getFirestore(app);
  auth = getAuth(app);
  console.log('Firebase initialized');
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

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
