import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "./mockData";
import { useUser } from "./contexts/UserContext";

const App = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // User context for profile data
  const { 
    profile, 
    loading: profileLoading, 
    updateQuestionCount, 
    updateEmail, 
    updateEmailPreference,
    updateChapterScores,
    updateComprehensiveTestScores,
    usingLocalStorage
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
  // Force light mode only
  const darkMode = false;

  // Get values from profile when available
  const questionCount = profile?.questionCount || 100;
  const emailAddress = profile?.userEmail || "";
  const sendEmailOnSubmit = profile?.sendEmailOnSubmit || true;
  const chapterScores = profile?.chapterScores || {};
  const comprehensiveTestScores = profile?.comprehensiveTestScores || { history: [] };

  // Update questionCount when changed by user
  const handleQuestionCountChange = (count) => {
    updateQuestionCount(parseInt(count, 10));
  };

  // Update email when changed by user
  const handleEmailChange = (email) => {
    updateEmail(email);
  };

  // Update email preference when changed by user
  const handleEmailPreferenceChange = (sendEmail) => {
    updateEmailPreference(sendEmail);
  };

  // Define function to handle quiz starting
  const startQuiz = useCallback(
    async (chapterId, customQuestions = null) => {
      setCurrentChapter(chapterId);
      setCurrentView("quiz");
      setSelectedAnswers({});
      setQuizSubmitted(false);
      setLoading(true);

      // Update URL without reloading the page
      navigate(`/chapter/${chapterId}`);

      try {
        if (customQuestions) {
          // Use the provided custom questions (for retry missed questions feature)
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
    [navigate, questionCount]
  );

  // Define function to handle comprehensive test starting
  const startComprehensiveTest = useCallback(async () => {
    setCurrentChapter("comprehensive");
    setCurrentView("quiz");
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setLoading(true);

    // Update URL for comprehensive test
    navigate("/chaptercomprehensive");

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
  
  // Create initial load handler that depends on the above functions
  const initialChapterLoad = useCallback(
    async (chapterId) => {
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

  // Fetch chapters on component mount
  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const data = await api.getChapters();
        setChapters(data);

        // If the URL includes a chapter ID, load that chapter
        if (currentChapter && currentView === "quiz") {
          await initialChapterLoad(currentChapter);
        }
      } catch (error) {
        console.error("Error fetching chapters:", error);
      }
    };

    fetchChapters();
  }, [currentChapter, currentView, initialChapterLoad]);

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
    
    const quizData = {
      chapterId: currentChapter,
      score: score,
      totalQuestions: questions.length,
      answers: selectedAnswers,
      isRetryQuiz: isRetryQuiz, // Flag to indicate this was a retry quiz
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
            <button
              onClick={() => retryMissedQuestions(currentChapter, reviewAttempt)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
            >
              Retry Missed Questions
            </button>
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
      <div className="absolute top-4 right-4">
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
                            onClick={() => retryMissedQuestions(chapter.id, attempt)}
                            className="text-orange-500 hover:text-orange-600 underline"
                          >
                            Retry Missed
                          </button>
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
                            onClick={() => retryMissedQuestions("comprehensive", attempt)}
                            className="text-orange-500 hover:text-orange-600 underline"
                          >
                            Retry Missed
                          </button>
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
            ? `Practice on Missed Questions - ${
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