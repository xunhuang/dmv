import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  isFirebaseInitialized, 
  getOrCreateUser, 
  getUserProfile, 
  updateUserProfile,
  signInWithGoogle,
  signOutUser,
  getAuth,
  onAuthStateChanged
} from '../firebase/firebase';

// Create the UserContext
const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingLocalStorage, setUsingLocalStorage] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize user and load profile
  useEffect(() => {
    const initializeUser = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Try to use Firebase if initialized
        if (isFirebaseInitialized()) {
          // Set up auth state listener to handle automatically signing in
          const auth = getAuth();
          const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
              // User is signed in (could be anonymous or with Google)
              console.log('User is already signed in:', firebaseUser.isAnonymous ? 'anonymously' : 'with Google');
              setUser(firebaseUser);
              setIsAuthenticated(firebaseUser.isAnonymous === false);
              
              // Get user profile from Firestore
              const userProfile = await getUserProfile(firebaseUser.uid);
              setProfile(userProfile);
              setUsingLocalStorage(false);
            } else {
              // No user is signed in, create an anonymous user
              console.log('No user signed in, creating anonymous user');
              const newUser = await getOrCreateUser();
              setUser(newUser);
              setIsAuthenticated(false);
              
              // Get user profile from Firestore
              const userProfile = await getUserProfile(newUser.uid);
              setProfile(userProfile);
              setUsingLocalStorage(false);
            }
            setLoading(false);
          });
          
          // Return cleanup function
          return () => unsubscribe();
        } else {
          // Fall back to localStorage
          console.log('Firebase not initialized, using localStorage');
          setUsingLocalStorage(true);
          loadFromLocalStorage();
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing user:', err);
        setError(err);
        // Fall back to localStorage on error
        setUsingLocalStorage(true);
        loadFromLocalStorage();
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
        userName: localStorage.getItem('userName') || '',
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
        userName: '',
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
      
      if (data.userName !== undefined) {
        localStorage.setItem('userName', data.userName);
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
  
  const updateUserName = (name) => {
    return updateProfile({ userName: name });
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

  // Sign in with Google and migrate local data if needed
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const googleUser = await signInWithGoogle();
      setUser(googleUser);
      setIsAuthenticated(true);
      
      // Get existing profile or create new one
      let userProfile = await getUserProfile(googleUser.uid);
      
      // If we have local data, merge it properly with cloud data
      if (profile) {
        const mergedProfile = mergeProfiles(profile, userProfile);
        
        // Update user info from Google account
        mergedProfile.userName = googleUser.displayName || mergedProfile.userName;
        mergedProfile.userEmail = googleUser.email || mergedProfile.userEmail;
        
        // Update the cloud with merged data
        await updateUserProfile(googleUser.uid, mergedProfile);
        userProfile = mergedProfile;
      } else {
        // Just update the Google info
        userProfile.userName = googleUser.displayName || userProfile.userName;
        userProfile.userEmail = googleUser.email || userProfile.userEmail;
        await updateUserProfile(googleUser.uid, userProfile);
      }
      
      setProfile(userProfile);
      setUsingLocalStorage(false);
      return googleUser;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to intelligently merge profiles
  // Prioritizes keeping the most data and best scores
  const mergeProfiles = (localProfile, cloudProfile) => {
    // Start with base preferences from cloud, fallback to local
    const merged = {
      ...localProfile,
      ...cloudProfile,
    };
    
    // Special handling for chapter scores - merge histories
    merged.chapterScores = mergeChapterScores(
      localProfile.chapterScores || {}, 
      cloudProfile.chapterScores || {}
    );
    
    // Merge comprehensive test scores
    merged.comprehensiveTestScores = mergeComprehensiveScores(
      localProfile.comprehensiveTestScores || { history: [] },
      cloudProfile.comprehensiveTestScores || { history: [] }
    );
    
    return merged;
  };
  
  // Helper to merge chapter scores intelligently
  const mergeChapterScores = (localScores, cloudScores) => {
    const mergedScores = { ...cloudScores };
    
    // Process each chapter in local scores
    Object.keys(localScores).forEach(chapterId => {
      if (!mergedScores[chapterId]) {
        // If chapter doesn't exist in cloud, use local data
        mergedScores[chapterId] = localScores[chapterId];
      } else {
        // Merge histories, keeping the best scores and most attempts
        const localHistory = localScores[chapterId].history || [];
        const cloudHistory = mergedScores[chapterId].history || [];
        
        // Combine histories and keep the latest 5 unique attempts
        const combinedHistory = [...localHistory, ...cloudHistory]
          // Sort by date descending (newest first)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          // Remove duplicates by date (simplified approach)
          .filter((attempt, index, self) => 
            index === self.findIndex(a => a.date === attempt.date)
          )
          // Keep only the latest 5
          .slice(0, 5);
        
        // Find best score across all attempts
        let bestScore = 0;
        let bestTotal = 0;
        
        if (combinedHistory.length > 0) {
          const bestAttempt = combinedHistory.reduce((best, current) => {
            const bestRatio = best.score / best.total;
            const currentRatio = current.score / current.total;
            return currentRatio > bestRatio ? current : best;
          }, combinedHistory[0]);
          
          bestScore = bestAttempt.score;
          bestTotal = bestAttempt.total;
        }
        
        // Update merged scores for this chapter
        mergedScores[chapterId] = {
          score: bestScore,
          total: bestTotal,
          history: combinedHistory
        };
      }
    });
    
    return mergedScores;
  };
  
  // Helper to merge comprehensive test scores
  const mergeComprehensiveScores = (localScores, cloudScores) => {
    // Start with whichever has the best score
    const localRatio = localScores.score && localScores.total 
      ? localScores.score / localScores.total 
      : 0;
    const cloudRatio = cloudScores.score && cloudScores.total 
      ? cloudScores.score / cloudScores.total 
      : 0;
    
    // Combine histories like we did with chapter scores
    const combinedHistory = [...(localScores.history || []), ...(cloudScores.history || [])]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .filter((attempt, index, self) => 
        index === self.findIndex(a => a.date === attempt.date)
      )
      .slice(0, 5);
    
    // Get best total score
    let bestScore = 0;
    let bestTotal = 0;
    
    if (combinedHistory.length > 0) {
      const bestAttempt = combinedHistory.reduce((best, current) => {
        const bestRatio = best.score / best.total;
        const currentRatio = current.score / current.total;
        return currentRatio > bestRatio ? current : best;
      }, combinedHistory[0]);
      
      bestScore = bestAttempt.score;
      bestTotal = bestAttempt.total;
    }
    
    return {
      score: bestScore,
      total: bestTotal,
      history: combinedHistory
    };
  };
  
  // Sign out the user
  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOutUser();
      
      // Switch to anonymous user
      const anonUser = await getOrCreateUser();
      setUser(anonUser);
      setIsAuthenticated(false);
      
      // Get anonymous profile data
      const anonProfile = await getUserProfile(anonUser.uid);
      setProfile(anonProfile);
      
      return true;
    } catch (error) {
      console.error("Error signing out:", error);
      setError(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        usingLocalStorage,
        isAuthenticated,
        updateProfile,
        updateQuestionCount,
        updateUserName,
        updateEmail,
        updateEmailPreference,
        updateChapterScores,
        updateComprehensiveTestScores,
        signInWithGoogle: handleGoogleSignIn,
        signOut: handleSignOut
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