import React, { createContext, useState, useContext, useEffect } from 'react';
import { isFirebaseInitialized, getOrCreateUser, getUserProfile, updateUserProfile } from '../firebase/firebase';

// Create the UserContext
const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingLocalStorage, setUsingLocalStorage] = useState(false);

  // Initialize user and load profile
  useEffect(() => {
    const initializeUser = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Try to use Firebase if initialized
        if (isFirebaseInitialized()) {
          // Get or create anonymous user
          const firebaseUser = await getOrCreateUser();
          setUser(firebaseUser);
          
          // Get user profile from Firestore
          const userProfile = await getUserProfile(firebaseUser.uid);
          setProfile(userProfile);
          setUsingLocalStorage(false);
        } else {
          // Fall back to localStorage
          console.log('Firebase not initialized, using localStorage');
          setUsingLocalStorage(true);
          loadFromLocalStorage();
        }
      } catch (err) {
        console.error('Error initializing user:', err);
        setError(err);
        // Fall back to localStorage on error
        setUsingLocalStorage(true);
        loadFromLocalStorage();
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  // Load data from localStorage
  const loadFromLocalStorage = () => {
    try {
      // Load profile data from localStorage
      const questionCount = localStorage.getItem('questionCount');
      const userEmail = localStorage.getItem('userEmail');
      const sendEmailOnSubmit = localStorage.getItem('sendEmailOnSubmit');
      const chapterScores = localStorage.getItem('chapterScores');
      const comprehensiveTestScores = localStorage.getItem('comprehensiveTestScores');

      // Set profile with localStorage data
      setProfile({
        questionCount: questionCount ? parseInt(questionCount, 10) : 100,
        userEmail: userEmail || '',
        sendEmailOnSubmit: sendEmailOnSubmit ? JSON.parse(sendEmailOnSubmit) : true,
        chapterScores: chapterScores ? JSON.parse(chapterScores) : {},
        comprehensiveTestScores: comprehensiveTestScores 
          ? JSON.parse(comprehensiveTestScores) 
          : { history: [] }
      });
    } catch (err) {
      console.error('Error loading from localStorage:', err);
      setError(err);
      
      // Initialize with default values if localStorage fails
      setProfile({
        questionCount: 100,
        userEmail: '',
        sendEmailOnSubmit: true,
        chapterScores: {},
        comprehensiveTestScores: { history: [] }
      });
    }
  };

  // Update profile data
  const updateProfile = async (newProfileData) => {
    try {
      // Merge with existing profile
      const updatedProfile = { ...profile, ...newProfileData };
      
      // Update state
      setProfile(updatedProfile);
      
      // Save to localStorage as backup
      saveToLocalStorage(updatedProfile);
      
      // If using Firebase, update Firestore
      if (!usingLocalStorage && user) {
        await updateUserProfile(user.uid, updatedProfile);
      }
      
      return true;
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err);
      return false;
    }
  };

  // Helper function to save to localStorage
  const saveToLocalStorage = (data) => {
    try {
      // Save specific fields to localStorage
      if (data.questionCount !== undefined) {
        localStorage.setItem('questionCount', data.questionCount.toString());
      }
      
      if (data.userEmail !== undefined) {
        localStorage.setItem('userEmail', data.userEmail);
      }
      
      if (data.sendEmailOnSubmit !== undefined) {
        localStorage.setItem('sendEmailOnSubmit', JSON.stringify(data.sendEmailOnSubmit));
      }
      
      if (data.chapterScores !== undefined) {
        localStorage.setItem('chapterScores', JSON.stringify(data.chapterScores));
      }
      
      if (data.comprehensiveTestScores !== undefined) {
        localStorage.setItem('comprehensiveTestScores', JSON.stringify(data.comprehensiveTestScores));
      }
    } catch (err) {
      console.error('Error saving to localStorage:', err);
    }
  };

  // Update specific profile fields
  const updateQuestionCount = (count) => {
    return updateProfile({ questionCount: count });
  };

  const updateEmail = (email) => {
    return updateProfile({ userEmail: email });
  };

  const updateEmailPreference = (sendEmail) => {
    return updateProfile({ sendEmailOnSubmit: sendEmail });
  };

  const updateChapterScores = (chapterScores) => {
    return updateProfile({ chapterScores });
  };

  const updateComprehensiveTestScores = (comprehensiveTestScores) => {
    return updateProfile({ comprehensiveTestScores });
  };

  return (
    <UserContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        usingLocalStorage,
        updateProfile,
        updateQuestionCount,
        updateEmail,
        updateEmailPreference,
        updateChapterScores,
        updateComprehensiveTestScores
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use the UserContext
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;