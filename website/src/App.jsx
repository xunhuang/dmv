import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { api } from "./mockData";
import { useUser } from "./contexts/UserContext";
import { v4 as uuidv4 } from 'uuid';

const App = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get attempt ID from URL query param if present
  const searchParams = new URLSearchParams(location.search);
  const attemptId = searchParams.get('attempt');
  
  // User context for profile data
  const { 
    user,
    profile, 
    loading: profileLoading, 
    updateQuestionCount,
    updateUserName,
    updateEmail, 
    updateEmailPreference,
    updateChapterScores,
    updateComprehensiveTestScores,
    usingLocalStorage,
    isAuthenticated,
    signInWithGoogle,
    signOut
  } = useUser();

  const [currentView, setCurrentView] = useState(id ? "quiz" : "home");
  const [currentChapter, setCurrentChapter] = useState(id || null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reviewAttempt, setReviewAttempt] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = React.useRef(null);
  // Force light mode only
  const darkMode = false;

  // Get values from profile when available
  const questionCount = profile?.questionCount || 100;
  const userName = profile?.userName || "";
  const emailAddress = profile?.userEmail || "";
  const sendEmailOnSubmit = profile?.sendEmailOnSubmit || true;
  const chapterScores = profile?.chapterScores || {};
  const comprehensiveTestScores = profile?.comprehensiveTestScores || { history: [] };

  // Update questionCount when changed by user
  const handleQuestionCountChange = (count) => {
    updateQuestionCount(parseInt(count, 10));
  };

  // Update username when changed by user
  const handleUserNameChange = (name) => {
    updateUserName(name);
  };

  // Update email when changed by user
  const handleEmailChange = (email) => {
    updateEmail(email);
  };

  // Update email preference when changed by user
  const handleEmailPreferenceChange = (sendEmail) => {
    updateEmailPreference(sendEmail);
  };
  
  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      setShowProfileMenu(false); // Close menu after successful sign-in
    } catch (error) {
      console.error("Error during Google sign-in:", error);
    }
  };
  
  // Handle sign-out
  const handleSignOut = async () => {
    try {
      await signOut();
      setShowProfileMenu(false); // Close menu after signing out
    } catch (error) {
      console.error("Error during sign-out:", error);
    }
  };
  
  // Handle clicks outside of profile menu to close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    
    // Add event listener when menu is open
    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    // Clean up event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  // Define function to handle quiz starting
  const startQuiz = useCallback(
    async (chapterId, customQuestions = null) => {
      setCurrentChapter(chapterId);
      setCurrentView("quiz");
      setSelectedAnswers({});
      setQuizSubmitted(false);
      setLoading(true);

      // Update URL without reloading the page
      if (chapterId !== id) {
        navigate(`/chapter/${chapterId}`);
      }

      try {
        if (customQuestions) {
          // Use the provided custom questions (for retry missed questions or exact retake)
          setQuestions(customQuestions);
          
          // Also save these questions in state for persistence during navigation
          setCustomQuestionsState(customQuestions);
        } else {
          // Reset custom questions state if we're not using them
          setCustomQuestionsState(null);
          
          // Fetch normal questions from API
          const questionData = await api.getQuestionsByChapter(chapterId, {
            questionsLimit: questionCount,
          });
          setQuestions(questionData);
        }
      } catch (error) {
        console.error("Error fetching questions:", error);
      } finally {
        setLoading(false);
      }
    },
    [navigate, questionCount, id]
  );

  // Define function to handle comprehensive test starting
  const startComprehensiveTest = useCallback(async () => {
    setCurrentChapter("comprehensive");
    setCurrentView("quiz");
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setLoading(true);

    // Update URL for comprehensive test
    if (location.pathname !== "/chaptercomprehensive") {
      navigate("/chaptercomprehensive");
    }

    try {
      // Wait for chapters to be loaded if needed
      if (chapters.length === 0) {
        const data = await api.getChapters();
        setChapters(data);
      }

      const questionData = await api.getComprehensiveQuestions({
        questionsLimit: questionCount * (chapters.length || 1),
        chapters: chapters.length ? chapters : [],
      });
      setQuestions(questionData);
    } catch (error) {
      console.error("Error fetching questions for comprehensive test:", error);
    } finally {
      setLoading(false);
    }
  }, [navigate, questionCount, chapters]);

  // State to preserve custom questions when navigating
  const [customQuestionsState, setCustomQuestionsState] = useState(null);
  
  // Function to find an attempt by its ID
  const findAttemptById = useCallback((attemptId) => {
    if (!attemptId) return null;
    
    // Check comprehensive test attempts
    if (comprehensiveTestScores && comprehensiveTestScores.history) {
      const comprehensiveAttempt = comprehensiveTestScores.history.find(
        attempt => attempt.attemptId && attempt.attemptId === attemptId
      );
      if (comprehensiveAttempt) {
        return { 
          attempt: comprehensiveAttempt, 
          chapterId: "comprehensive" 
        };
      }
    }
    
    // Check chapter-specific attempts
    for (const chapterId in chapterScores) {
      if (chapterScores[chapterId] && chapterScores[chapterId].history) {
        const chapterAttempt = chapterScores[chapterId].history.find(
          attempt => attempt.attemptId && attempt.attemptId === attemptId
        );
        if (chapterAttempt) {
          return { 
            attempt: chapterAttempt, 
            chapterId 
          };
        }
      }
    }
    
    return null;
  }, [chapterScores, comprehensiveTestScores]);
  
  // Create initial load handler that depends on the above functions
  const initialChapterLoad = useCallback(
    async (chapterId) => {
      // Simple router - just handle chapter ID routing
      if (chapterId === "comprehensive") {
        await startComprehensiveTest();
      } else {
        // If we have custom questions saved in state, use them
        if (customQuestionsState && currentChapter === chapterId) {
          await startQuiz(chapterId, customQuestionsState);
        } else {
          await startQuiz(chapterId);
        }
      }
    },
    [startComprehensiveTest, startQuiz, customQuestionsState, currentChapter]
  );

  // Fetch chapters and handle initial routing on component mount
  useEffect(() => {
    const fetchChaptersAndInitialize = async () => {
      try {
        // Only set loading true if we don't already have chapters
        if (chapters.length === 0) {
          setLoading(true);
        }
        
        // Load chapters if needed
        if (chapters.length === 0) {
          const data = await api.getChapters();
          setChapters(data);
        }
        
        // If we have an attempt ID in the URL but user isn't authenticated,
        // we might want to sign in first to access attempt history

        // Check for attempt ID in URL
        if (attemptId && profile) {
          console.log("Found attempt ID in URL:", attemptId);
          console.log("Current chapter ID from URL:", id);
          console.log("Current chapters in profile:", 
            profile.chapterScores ? Object.keys(profile.chapterScores) : "none", 
            "comprehensive scores:", profile.comprehensiveTestScores ? "exists" : "none");
          
          // Check if user is authenticated before attempting to load from history
          if (!isAuthenticated) {
            console.log("User not authenticated, signing in first before accessing attempt");
            try {
              await signInWithGoogle();
              // After sign-in, we'll refresh the page which will reload the URL with attemptId
              return;
            } catch (error) {
              console.error("Failed to sign in:", error);
              // Still try to load without authentication, as a fallback
            }
          }
          
          // Find the attempt in the user's history
          const attemptInfo = findAttemptById(attemptId);
          
          if (attemptInfo) {
            console.log("Found matching attempt for chapter:", attemptInfo.chapterId);
            console.log("Attempt data:", JSON.stringify({
              questions: attemptInfo.attempt.questions.length,
              score: attemptInfo.attempt.score,
              total: attemptInfo.attempt.total
            }));
            
            // Check if we should only retry missed questions (from the missed=true parameter)
            const shouldRetryMissed = searchParams.get('missed') === 'true';
            let questionsToUse = [];
            
            if (shouldRetryMissed) {
              // Filter only the questions that were answered incorrectly
              questionsToUse = attemptInfo.attempt.questions.filter(question => {
                const selectedAnswer = question.selectedAnswer;
                const correctAnswerIndex = question.options.findIndex(opt => opt.isCorrect);
                return selectedAnswer !== correctAnswerIndex;
              });
              
              // If there are no missed questions, use all questions
              if (questionsToUse.length === 0) {
                console.log("No missed questions found, using all questions");
                questionsToUse = attemptInfo.attempt.questions;
              } else {
                console.log(`Found ${questionsToUse.length} missed questions to retry`);
              }
            } else {
              // Use all questions for normal retake
              questionsToUse = attemptInfo.attempt.questions;
            }
            
            // Reset the questions for retaking (remove selected answers)
            const resetQuestions = questionsToUse.map(question => {
              const { selectedAnswer, ...questionWithoutAnswer } = question;
              return questionWithoutAnswer;
            });
            
            // Set up the quiz with these questions
            setCurrentChapter(attemptInfo.chapterId);
            setQuestions(resetQuestions);
            setCustomQuestionsState(resetQuestions);
            setCurrentView("quiz");
            setSelectedAnswers({});
            setQuizSubmitted(false);
            
            // Remove the parameters from URL to prevent repeated loading on refresh
            const newUrl = location.pathname;
            navigate(newUrl, { replace: true });
            
            console.log("Successfully loaded attempt questions, total:", resetQuestions.length);
            return;
          } else {
            // If this is the first time visiting with this attempt ID, it might not be 
            // in history yet. Use the chapter ID from the URL to load standard questions
            console.log("Could not find matching attempt with ID:", attemptId);
            if (id) {
              console.log("Loading standard questions for chapter:", id);
              
              // Create a placeholder attempt to be filled in when quiz is submitted
              if (id === "comprehensive") {
                await initialChapterLoad("comprehensive");
              } else {
                await initialChapterLoad(id);
              }
              
              // Still remove the attempt ID to prevent confusion
              navigate(location.pathname, { replace: true });
              return;
            }
          }
        }

        // Handle comprehensive test route (if no attempt ID handling)
        if (location.pathname === '/chaptercomprehensive') {
          await initialChapterLoad("comprehensive");
        }
        // Handle normal chapter routes (if no attempt ID handling)
        else if (id) {
          await initialChapterLoad(id);
        }
        // If we have a current chapter already in state
        else if (currentChapter && currentView === "quiz") {
          // No need to reload if we're already there
        }
      } catch (error) {
        console.error("Error during initialization:", error);
      } finally {
        setLoading(false);
      }
    };

    // Only run this effect when profile is loaded, search params change, or location changes
    if (profile) {
      fetchChaptersAndInitialize();
    }
  }, [location.pathname, location.search, id, attemptId, initialChapterLoad, chapters.length, profile, findAttemptById]);

  const handleAnswerSelect = (questionIndex, optionIndex) => {
    if (quizSubmitted) return;

    setSelectedAnswers({
      ...selectedAnswers,
      [questionIndex]: optionIndex,
    });
  };

  const submitQuiz = async () => {
    setQuizSubmitted(true);
    const score = calculateScore();
    
    // Determine if this is a "Retry Missed Questions" quiz
    const isRetryQuiz = customQuestionsState !== null;
    
    // Generate a unique ID for this attempt
    const newAttemptId = uuidv4();
    
    const quizData = {
      chapterId: currentChapter,
      score: score,
      totalQuestions: questions.length,
      answers: selectedAnswers,
      isRetryQuiz: isRetryQuiz, // Flag to indicate this was a retry quiz
      attemptId: newAttemptId, // Add the unique attempt ID
      questions: questions.map((q, index) => ({
        question: q.question,
        selectedAnswer: selectedAnswers[index],
        correctAnswer: q.options.findIndex((opt) => opt.isCorrect),
        imgFileName: q.imgFileName || null,
        options: q.options.map((opt) => ({
          text: opt.text,
          isCorrect: opt.isCorrect,
          explanation: opt.explanation || null,
        })),
      })),
    };

    try {
      await api.saveQuizResults(quizData);
      // Send email with test results if enabled and email is provided
      if (sendEmailOnSubmit ) {
        try {
          // Log the data being sent for debugging
          console.log("Quiz Data for email:", JSON.stringify(quizData.questions.map(q => ({
            question: q.question.substring(0, 30) + "...",
            hasImage: !!q.imgFileName,
            imgFileName: q.imgFileName
          }))));
          
          // Create a simple API call to the email server to send email
          const emailServerUrl =
            import.meta.env.VITE_EMAIL_SERVER_URL ||
            "https://webapp-53152538382.us-central1.run.app";
          console.log("emailServerUrl", emailServerUrl);
          const response = await fetch(
            `${emailServerUrl}/api/send-quiz-results`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                quizData,
                emailAddress,
                userName,
              }),
            }
          );

          const result = await response.json();
          if (!result.success) {
            console.error("Error sending email:", result.error);
          }
        } catch (emailError) {
          console.error("Error sending email:", emailError);
        }
      }

      if (currentChapter === "comprehensive") {
        // Handle comprehensive test scores
        const currentHistory = comprehensiveTestScores.history || [];
        const updatedScores = {
          score: score,
          total: questions.length,
          history: [
            {
              date: new Date().toISOString(), // Use ISO format for better Firebase compatibility
              score: score,
              total: questions.length,
              attemptId: quizData.attemptId, // Include the attempt ID
              questions: quizData.questions,
            },
            ...currentHistory,
          ].slice(0, 5), // Keep only the last 5 attempts
        };

        // Update comprehensive test scores in context
        updateComprehensiveTestScores(updatedScores);
      } else {
        // Handle chapter-specific scores
        const currentHistory = chapterScores[currentChapter]?.history || [];
        const updatedScores = {
          ...chapterScores,
          [currentChapter]: {
            score: score,
            total: questions.length,
            history: [
              {
                date: new Date().toISOString(), // Use ISO format for better Firebase compatibility
                score: score,
                total: questions.length,
                attemptId: quizData.attemptId, // Include the attempt ID
                questions: quizData.questions,
              },
              ...currentHistory,
            ].slice(0, 5), // Keep only the last 5 attempts
          },
        };

        // Update chapter scores in context
        updateChapterScores(updatedScores);
      }
    } catch (error) {
      console.error("Error saving quiz results:", error);
    }
  };

  const retakeQuiz = () => {
    setSelectedAnswers({});
    setQuizSubmitted(false);
  };

  const returnToChapters = useCallback(() => {
    setCurrentView("home");
    setCurrentChapter(null);
    setCustomQuestionsState(null); // Clear custom questions when returning to home
    navigate("/");
  }, [navigate]);

  const calculateScore = () => {
    let score = 0;

    for (let i = 0; i < questions.length; i++) {
      if (
        selectedAnswers[i] !== undefined &&
        questions[i].options[selectedAnswers[i]].isCorrect
      ) {
        score++;
      }
    }

    return score;
  };

  const viewAttemptReview = (chapterId, attempt) => {
    setCurrentChapter(chapterId);
    setReviewAttempt(attempt);
    setCurrentView("review");
  };
  
  const retryMissedQuestions = (chapterId, attempt) => {
    // Filter for questions the user answered incorrectly from this specific attempt
    const missedQuestions = attempt.questions.filter((question) => {
      const selectedAnswer = question.selectedAnswer;
      const correctAnswerIndex = question.options.findIndex(opt => opt.isCorrect);
      return selectedAnswer !== correctAnswerIndex;
    });
    
    // If there are no missed questions, show a message and return
    if (missedQuestions.length === 0) {
      alert("Great job! You didn't miss any questions in this attempt.");
      return;
    }
    
    // Store custom questions in state to preserve them during navigation
    setCustomQuestionsState(missedQuestions);
    
    // Start a quiz with only the exact missed questions from this attempt
    startQuiz(chapterId, missedQuestions);
  };
  
  // Function to retake the exact same quiz with the same questions
  const retakeExactQuiz = (chapterId, attempt) => {
    // Get the exact questions from the attempt
    const exactQuestions = attempt.questions;
    
    // Reset the selected answers from the previous attempt
    const resetQuestions = exactQuestions.map(question => {
      // Create a new question object without the selectedAnswer property
      const { selectedAnswer, ...questionWithoutAnswer } = question;
      return questionWithoutAnswer;
    });
    
    // Store custom questions in state to preserve them during navigation
    setCustomQuestionsState(resetQuestions);
    
    // Start a quiz with the exact same questions
    if (chapterId === "comprehensive") {
      setCurrentChapter("comprehensive");
      setQuestions(resetQuestions);
      setCurrentView("quiz");
      setSelectedAnswers({});
      setQuizSubmitted(false);
      navigate("/chaptercomprehensive");
    } else {
      setCurrentChapter(chapterId);
      setQuestions(resetQuestions);
      setCurrentView("quiz");
      setSelectedAnswers({});
      setQuizSubmitted(false);
      navigate(`/chapter/${chapterId}`);
    }
  };

  const renderReview = () => {
    if (!reviewAttempt) return null;

    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={returnToChapters}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded transition duration-300"
          >
            ← Back to Chapters
          </button>
          <div className="flex items-center gap-4">
            <div className="text-xl font-bold">
              Score: {reviewAttempt.score}/{reviewAttempt.total}
            </div>
            <div className="space-x-2">
              <button
                onClick={() => retakeExactQuiz(currentChapter, reviewAttempt)}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
              >
                Retake Same Quiz
              </button>
              {reviewAttempt.score < reviewAttempt.total && (
                <button
                  onClick={() => retryMissedQuestions(currentChapter, reviewAttempt)}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                >
                  Retry Missed Questions
                </button>
              )}
            </div>
          </div>
        </div>

        <h2
          className={`text-2xl font-bold mb-6 ${
            darkMode ? "" : "text-gray-900"
          }`}
        >
          {currentChapter === "comprehensive"
            ? "Review - Comprehensive DMV Test"
            : `Review - Chapter ${currentChapter}: ${
                chapters.find((c) => c.id === parseInt(currentChapter))
                  ?.title || ""
              }`}
        </h2>
        <p className="text-gray-600 mb-6">
          Attempt from {new Date(reviewAttempt.date).toLocaleString()}
        </p>

        {reviewAttempt.questions.map((question, index) => (
          <div
            key={index}
            className={`p-6 rounded-lg shadow-md mb-6 border ${
              darkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-300"
            }`}
          >
            <h3
              className={`text-xl font-semibold mb-4 ${
                darkMode ? "" : "text-gray-900"
              }`}
            >
              Question {index + 1}: {question.question}
            </h3>

            {question.imgFileName &&
              !question.imgFileName.startsWith(
                "https://www.dmv-written-test."
              ) && (
                <div className="mb-4">
                  <img
                    src={
                      question.imgFileName.startsWith("https://")
                        ? question.imgFileName
                        : `/images/${question.imgFileName}`
                    }
                    alt={`Question ${index + 1} diagram`}
                    className="max-w-full rounded-md border border-gray-300 mx-auto"
                  />
                </div>
              )}

            <div className="space-y-3">
              {question.options.map((option, optIndex) => (
                <div
                  key={optIndex}
                  className={`p-3 rounded-md border ${
                    question.selectedAnswer === optIndex
                      ? option.isCorrect
                        ? "bg-green-100 border-green-500"
                        : "bg-red-100 border-red-500"
                      : option.isCorrect
                      ? "bg-green-900 border-green-600 text-white"
                      : "bg-gray-100 border-gray-300"
                  }`}
                >
                  <div className="flex items-start">
                    <div className="mr-2 font-bold">
                      {String.fromCharCode(65 + optIndex)}.
                    </div>
                    <div>{option.text}</div>
                  </div>
                  {question.selectedAnswer === optIndex &&
                    !option.isCorrect && (
                      <div className="mt-2 text-red-400 text-sm">
                        {option.explanation}
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderHome = () => (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Profile Button */}
      <div className="absolute top-4 right-4" ref={profileMenuRef}>
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-full transition duration-300 flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        {/* Profile Menu Dropdown */}
        {showProfileMenu && (
          <div
            className={`absolute right-0 mt-2 w-64 ${
              darkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-300"
            } rounded-md shadow-lg z-10 border`}
          >
            <div
              className={`p-4 border-b ${
                darkMode ? "border-gray-700" : "border-gray-300"
              }`}
            >
              <h3
                className={`font-medium ${
                  darkMode ? "text-gray-200" : "text-gray-700"
                } mb-2`}
              >
                User Preferences
              </h3>
              <div className="flex flex-col gap-3">
                <div>
                  <label
                    htmlFor="questionCount"
                    className={`text-sm ${
                      darkMode ? "text-gray-300" : "text-gray-600"
                    } mb-1`}
                  >
                    Questions per quiz:
                  </label>
                  <select
                    id="questionCount"
                    value={questionCount}
                    onChange={(e) => handleQuestionCountChange(e.target.value)}
                    className={`border ${
                      darkMode
                        ? "border-gray-600 bg-gray-700 text-white"
                        : "border-gray-300 bg-white text-gray-900"
                    } rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full mt-1`}
                  >
                    <option value={2}>2 questions</option>
                    <option value={5}>5 questions</option>
                    <option value={10}>10 questions</option>
                    <option value={15}>15 questions</option>
                    <option value={100}>All questions</option>
                  </select>
                </div>
                <div className="mt-2">
                  <label
                    htmlFor="userName"
                    className={`text-sm ${
                      darkMode ? "text-gray-300" : "text-gray-600"
                    } mb-1 block`}
                  >
                    Your Name:
                  </label>
                  <input
                    type="text"
                    id="userName"
                    value={userName}
                    onChange={(e) => handleUserNameChange(e.target.value)}
                    placeholder="Enter your name"
                    className={`border ${
                      darkMode
                        ? "border-gray-600 bg-gray-700 text-white"
                        : "border-gray-300 bg-white text-gray-900"
                    } rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full mt-1`}
                  />
                </div>
                
                <div className="mt-2">
                  <label
                    htmlFor="emailAddress"
                    className={`text-sm ${
                      darkMode ? "text-gray-300" : "text-gray-600"
                    } mb-1 block`}
                  >
                    Email for Results:
                  </label>
                  <input
                    type="email"
                    id="emailAddress"
                    value={emailAddress}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="Enter your email"
                    className={`border ${
                      darkMode
                        ? "border-gray-600 bg-gray-700 text-white"
                        : "border-gray-300 bg-white text-gray-900"
                    } rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full mt-1`}
                  />
                </div>
                <div className="mt-1">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={sendEmailOnSubmit}
                      onChange={(e) => handleEmailPreferenceChange(e.target.checked)}
                      className="rounded text-blue-500 focus:ring-blue-500"
                    />
                    <span
                      className={`text-sm ${
                        darkMode ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Send results to
                      {emailAddress ? ` ${emailAddress}` : " your email"}
                    </span>
                  </label>
                </div>
                {/* Storage indicator */}
                <div className="mt-3 text-xs text-gray-500 italic">
                  {usingLocalStorage 
                    ? "Data stored locally" 
                    : "Data synced with cloud"}
                </div>
                
                {/* Google Auth Section */}
                <div className="mt-5 pt-4 border-t border-gray-200">
                  {isAuthenticated ? (
                    <div>
                      <div className="flex items-center mb-2">
                        {user?.photoURL && (
                          <img 
                            src={user.photoURL} 
                            alt="Profile" 
                            className="w-8 h-8 rounded-full mr-2" 
                          />
                        )}
                        <div className="text-sm truncate">
                          {user?.displayName || user?.email || "Signed in user"}
                        </div>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-3 rounded transition duration-300"
                      >
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleGoogleSignIn}
                      className="w-full flex items-center justify-center bg-white hover:bg-gray-100 text-gray-800 font-medium py-2 px-3 border border-gray-300 rounded transition duration-300"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Sign in with Google
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <h1
        className={`text-3xl font-bold text-center mb-8 ${
          darkMode ? "text-blue-300" : "text-blue-700"
        }`}
      >
        California DMV Handbook Practice Tests
      </h1>

      <p
        className={`text-center mb-6 ${
          darkMode ? "text-gray-300" : "text-gray-600"
        }`}
      >
        Select a chapter to start a practice test:
      </p>
      
      {/* Loading indicator for profile data */}
      {profileLoading ? (
        <div className="flex justify-center items-center p-8">
          <div className="text-xl">Loading your profile data...</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-1 gap-4">
          {chapters.map((chapter) => (
            <div
              key={chapter.id}
              className={`p-4 rounded-lg shadow-md border ${
                darkMode
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-300"
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col">
                  <div
                    className={`text-lg font-semibold ${
                      darkMode ? "text-blue-300" : "text-blue-700"
                    }`}
                  >
                    Chapter {chapter.id}: {chapter.title || ""}
                  </div>
                  {chapterScores[chapter.id] && (
                    <div
                      className={`text-sm mt-1 ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Latest score: {chapterScores[chapter.id].score}/
                      {chapterScores[chapter.id].total}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => startQuiz(chapter.id)}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                >
                  Start Quiz
                </button>
              </div>

              {/* Quiz History Section */}
              {chapterScores[chapter.id]?.history && (
                <div className="mt-2 border-t pt-2">
                  <div className="text-sm font-medium mb-1">
                    Previous Attempts:
                  </div>
                  <div className="space-y-1">
                    {chapterScores[chapter.id].history.map((attempt, index) => (
                      <div
                        key={index}
                        className="text-sm text-gray-600 flex justify-between items-center"
                      >
                        <span>{new Date(attempt.date).toLocaleString()}</span>
                        <div className="flex items-center">
                          <span className="mr-4">
                            Score: {attempt.score}/{attempt.total}
                          </span>
                          <button
                            onClick={() => viewAttemptReview(chapter.id, attempt)}
                            className="text-blue-500 hover:text-blue-600 underline mr-3"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => retakeExactQuiz(chapter.id, attempt)}
                            className="text-green-500 hover:text-green-600 underline mr-3"
                          >
                            Retake Same
                          </button>
                          {attempt.score < attempt.total && (
                            <button
                              onClick={() => retryMissedQuestions(chapter.id, attempt)}
                              className="text-orange-500 hover:text-orange-600 underline"
                            >
                              Retry Missed
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Comprehensive Test Section */}
          <div
            className={`p-4 rounded-lg shadow-md border-2 border-blue-500 mt-8 ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col">
                <div
                  className={`text-lg font-semibold ${
                    darkMode ? "text-blue-300" : "text-blue-700"
                  }`}
                >
                  Comprehensive DMV Test
                </div>
                <div
                  className={`text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Test your knowledge across all chapters
                </div>
                {comprehensiveTestScores.score !== undefined && (
                  <div
                    className={`text-sm mt-1 ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Latest score: {comprehensiveTestScores.score}/
                    {comprehensiveTestScores.total}
                  </div>
                )}
              </div>
              <button
                onClick={startComprehensiveTest}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition duration-300"
              >
                Start Test
              </button>
            </div>

            {/* Comprehensive Test History Section */}
            {comprehensiveTestScores.history &&
              comprehensiveTestScores.history.length > 0 && (
                <div className="mt-2 border-t pt-2">
                  <div className="text-sm font-medium mb-1">
                    Previous Attempts:
                  </div>
                  <div className="space-y-1">
                    {comprehensiveTestScores.history.map((attempt, index) => (
                      <div
                        key={index}
                        className="text-sm text-gray-600 flex justify-between items-center"
                      >
                        <span>{new Date(attempt.date).toLocaleString()}</span>
                        <div className="flex items-center">
                          <span className="mr-4">
                            Score: {attempt.score}/{attempt.total}
                          </span>
                          <button
                            onClick={() => viewAttemptReview("comprehensive", attempt)}
                            className="text-blue-500 hover:text-blue-600 underline mr-3"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => retakeExactQuiz("comprehensive", attempt)}
                            className="text-green-500 hover:text-green-600 underline mr-3"
                          >
                            Retake Same
                          </button>
                          {attempt.score < attempt.total && (
                            <button
                              onClick={() => retryMissedQuestions("comprehensive", attempt)}
                              className="text-orange-500 hover:text-orange-600 underline"
                            >
                              Retry Missed
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );

  const renderQuiz = () => {
    if (loading) {
      return (
        <div className="p-6 max-w-4xl mx-auto flex justify-center items-center h-64">
          <div className="text-xl">Loading questions...</div>
        </div>
      );
    }

    const allQuestionsAnswered = questions.every(
      (_, index) => selectedAnswers[index] !== undefined
    );
    const score = calculateScore();

    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={returnToChapters}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded transition duration-300"
          >
            ← Back to Chapters
          </button>
          {quizSubmitted && (
            <div className="text-xl font-bold">
              Score: {score}/{questions.length}
            </div>
          )}
        </div>

        <h2
          className={`text-2xl font-bold mb-6 ${
            darkMode ? "" : "text-gray-900"
          }`}
        >
          {customQuestionsState 
            ? searchParams.get('missed') === 'true' || location.search.includes('missed=true')
              ? `Retry Missed Questions - ${
                  currentChapter === "comprehensive"
                    ? "Comprehensive Test"
                    : `Chapter ${currentChapter}`
                }`
              : `Practice on Missed Questions - ${
                  currentChapter === "comprehensive"
                    ? "Comprehensive Test"
                    : `Chapter ${currentChapter}`
                }`
            : currentChapter === "comprehensive"
            ? "Comprehensive DMV Test"
            : `Chapter ${currentChapter}: ${
                chapters.find((c) => c.id === parseInt(currentChapter))
                  ?.title || ""
              }`}
        </h2>

        {questions.map((question, questionIndex) => (
          <div
            key={questionIndex}
            className={`p-6 rounded-lg shadow-md mb-6 border ${
              darkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-300"
            }`}
          >
            <h3
              className={`text-xl font-semibold mb-4 ${
                darkMode ? "" : "text-gray-900"
              }`}
            >
              Question {questionIndex + 1}: {question.question}
            </h3>

            {question.imgFileName &&
              !question.imgFileName.startsWith(
                "https://www.dmv-written-test.com/images/meta/cover-1024x512.png"
              ) && (
                <div className="mb-4">
                  <img
                    src={
                      question.imgFileName.startsWith("https://")
                        ? question.imgFileName
                        : `/images/${question.imgFileName}`
                    }
                    alt={`Question ${questionIndex + 1} diagram`}
                    className="max-w-full rounded-md border border-gray-300 mx-auto"
                  />
                </div>
              )}

            <div className="space-y-3">
              {question.options.map((option, optionIndex) => (
                <div
                  key={optionIndex}
                  onClick={() => handleAnswerSelect(questionIndex, optionIndex)}
                  className={`p-3 rounded-md cursor-pointer border ${
                    selectedAnswers[questionIndex] === optionIndex
                      ? quizSubmitted
                        ? option.isCorrect
                          ? "bg-green-500 border-green-500 text-white"
                          : "bg-red-500 border-red-500 text-white"
                        : "bg-blue-500 border-blue-500 text-white"
                      : "bg-gray-100 border-gray-300 hover:bg-gray-200"
                  }`}
                >
                  <div className="flex items-start">
                    <div className="mr-2 font-bold">
                      {String.fromCharCode(65 + optionIndex)}.
                    </div>
                    <div>{option.text}</div>
                  </div>

                  {quizSubmitted &&
                    selectedAnswers[questionIndex] === optionIndex &&
                    !option.isCorrect && (
                      <div className="mt-2 text-white text-sm">
                        {option.explanation}
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {!quizSubmitted ? (
          <button
            onClick={submitQuiz}
            disabled={!allQuestionsAnswered}
            className={`mt-6 py-2 px-6 rounded-md font-semibold ${
              !allQuestionsAnswered
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            Submit Quiz
          </button>
        ) : (
          <button
            onClick={retakeQuiz}
            className="mt-6 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-md transition duration-300"
          >
            Retake Quiz
          </button>
        )}
      </div>
    );
  };

  // Show an overall loading state while profile is loading
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center">
        <div className="text-xl">Loading your data...</div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-900"
      }`}
    >
      {currentView === "home"
        ? renderHome()
        : currentView === "review"
        ? renderReview()
        : renderQuiz()}
    </div>
  );
};

export default App;