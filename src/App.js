import React, { useState, useEffect } from 'react';

// Mock API service to simulate backend calls
const api = {
  getChapters: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: 1, title: "The California Driver's License" },
          { id: 5, title: "An Introduction to Driving" },
          { id: 9, title: "Alcohol and Drugs" }
        ]);
      }, 300);
    });
  },
  
  getQuestionsByChapter: (chapterId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockQuestionsByChapter[chapterId]);
      }, 500);
    });
  }
};

// Mock questions data (moved outside the component)
const mockQuestionsByChapter = {
    1: [
      {
        question: "What does a California driver's license allow you to do?",
        options: [
          { text: "Drive on public roads with the correct license for your vehicle", isCorrect: true },
          { text: "Drive any vehicle regardless of class", isCorrect: false, explanation: "You must have the correct license for the specific type of vehicle you're driving." },
          { text: "Drive on private roads only", isCorrect: false, explanation: "A California driver's license allows you to drive on public roads, not just private ones." },
          { text: "Drive only during daylight hours", isCorrect: false, explanation: "A standard driver's license doesn't restrict driving to daylight hours only." }
        ]
      },
      {
        question: "When will you need a REAL ID compliant driver's license?",
        options: [
          { text: "Beginning May 2025 to board domestic flights or enter federal facilities", isCorrect: true },
          { text: "Only when traveling internationally", isCorrect: false, explanation: "REAL ID is for domestic flights and entering federal facilities, not international travel." },
          { text: "Beginning January 2024 for all driving purposes", isCorrect: false, explanation: "A REAL ID is not required for driving, only for boarding domestic flights and entering federal facilities." },
          { text: "Only when driving commercial vehicles", isCorrect: false, explanation: "A REAL ID is not specifically for commercial driving." }
        ]
      },
      {
        question: "What type of card is issued for identification purposes to eligible persons of any age?",
        options: [
          { text: "ID card", isCorrect: true },
          { text: "Driver's license", isCorrect: false, explanation: "A driver's license permits you to drive, while an ID card is for identification only." },
          { text: "REAL ID card", isCorrect: false, explanation: "While a REAL ID can be either a driver's license or ID card, not all ID cards are REAL ID compliant." },
          { text: "Veteran designation card", isCorrect: false, explanation: "A Veteran designation is a feature that can be added to a driver's license or ID card, not a separate type of card." }
        ]
      }
    ],
    5: [
      {
        question: "When starting with hand-to-hand steering, where should your hands be positioned?",
        options: [
          { text: "At 9 and 3 o'clock or 8 and 4 o'clock", isCorrect: true },
          { text: "At 10 and 2 o'clock", isCorrect: false, explanation: "The recommended positions are 9 and 3 o'clock or 8 and 4 o'clock, not 10 and 2." },
          { text: "Only at 12 o'clock", isCorrect: false, explanation: "This position doesn't provide enough control of the vehicle." },
          { text: "Anywhere that feels comfortable", isCorrect: false, explanation: "Specific hand positions are recommended for optimal control and safety." }
        ]
      },
      {
        question: "How far ahead should you signal before making a turn?",
        options: [
          { text: "At least 100 feet", isCorrect: true },
          { text: "At least 50 feet", isCorrect: false, explanation: "You should signal at least 100 feet before turning, not just 50 feet." },
          { text: "At least 500 feet", isCorrect: false, explanation: "The requirement is at least 100 feet, not 500 feet." },
          { text: "Only when you start turning", isCorrect: false, explanation: "You should signal well before turning, not just when you start the turn." }
        ]
      },
      {
        question: "When should you dim your high-beam headlights to low beams?",
        options: [
          { text: "Within 500 feet of an oncoming vehicle or 300 feet of a vehicle you're following", isCorrect: true },
          { text: "Only when driving in fog", isCorrect: false, explanation: "You should use low beams in fog, but also when near other vehicles." },
          { text: "Only when driving in city areas", isCorrect: false, explanation: "The requirement is based on distance from other vehicles, not location." },
          { text: "Only when another driver flashes their lights at you", isCorrect: false, explanation: "You should dim your lights based on distance, not wait for other drivers to signal you." }
        ]
      }
    ],
    9: [
      {
        question: "What is the blood alcohol concentration (BAC) limit for drivers 21 years old and over?",
        options: [
          { text: "0.08%", isCorrect: true },
          { text: "0.05%", isCorrect: false, explanation: "The BAC limit for drivers 21 and over is 0.08%, not 0.05%." },
          { text: "0.10%", isCorrect: false, explanation: "The BAC limit for drivers 21 and over is 0.08%, not 0.10%." },
          { text: "Any detectable amount", isCorrect: false, explanation: "For drivers 21 and over, the limit is 0.08%, not any detectable amount." }
        ]
      },
      {
        question: "What is the BAC limit for drivers under 21 years old?",
        options: [
          { text: "0.01%", isCorrect: true },
          { text: "0.05%", isCorrect: false, explanation: "The BAC limit for drivers under 21 is 0.01%, not 0.05%." },
          { text: "0.08%", isCorrect: false, explanation: "The BAC limit for drivers under 21 is 0.01%, not 0.08% (which is the limit for drivers 21 and over)." },
          { text: "0.04%", isCorrect: false, explanation: "The BAC limit for drivers under 21 is 0.01%, not 0.04%." }
        ]
      },
      {
        question: "If you are convicted of a DUI, how long will it remain on your driver's record?",
        options: [
          { text: "10 years", isCorrect: true },
          { text: "3 years", isCorrect: false, explanation: "DUI convictions remain on your record for 10 years, not 3 years." },
          { text: "7 years", isCorrect: false, explanation: "DUI convictions remain on your record for 10 years, not 7 years." },
          { text: "Forever", isCorrect: false, explanation: "DUI convictions remain on your record for 10 years, not permanently." }
        ]
      }
    ]
};

const App = () => {
  const [currentView, setCurrentView] = useState('home');
  const [currentChapter, setCurrentChapter] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [chapterScores, setChapterScores] = useState({});
  const [chapters, setChapters] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch chapters on component mount
  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const data = await api.getChapters();
        setChapters(data);
      } catch (error) {
        console.error("Error fetching chapters:", error);
      }
    };
    
    fetchChapters();
  }, []);

  const startQuiz = async (chapterId) => {
    setCurrentChapter(chapterId);
    setCurrentView('quiz');
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setLoading(true);
    
    try {
      const questionData = await api.getQuestionsByChapter(chapterId);
      setQuestions(questionData);
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex, optionIndex) => {
    if (quizSubmitted) return;

    setSelectedAnswers({
      ...selectedAnswers,
      [questionIndex]: optionIndex
    });
  };

  const submitQuiz = () => {
    setQuizSubmitted(true);
    const score = calculateScore();
    setChapterScores({
      ...chapterScores,
      [currentChapter]: {
        score: score,
        total: questions.length
      }
    });
  };

  const retakeQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setQuizSubmitted(false);
  };

  const returnToChapters = () => {
    setCurrentView('home');
    setCurrentChapter(null);
  };

  const calculateScore = () => {
    let score = 0;

    for (let i = 0; i < questions.length; i++) {
      if (selectedAnswers[i] !== undefined &&
        questions[i].options[selectedAnswers[i]].isCorrect) {
        score++;
      }
    }

    return score;
  };

  const renderHome = () => (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">California DMV Handbook Practice Tests</h1>
      <p className="text-center mb-6">Select a chapter to start a practice test:</p>
      <div className="grid md:grid-cols-1 gap-4">
        {chapters.map((chapter) => (
          <div key={chapter.id} className="bg-white p-4 rounded-lg shadow-md flex justify-between items-center">
            <div className="flex flex-col">
              <div className="text-lg font-semibold">
                Chapter {chapter.id}: {chapter.title}
              </div>
              {chapterScores[chapter.id] && (
                <div className="text-sm text-gray-600 mt-1">
                  Previous score: {chapterScores[chapter.id].score}/{chapterScores[chapter.id].total}
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
        ))}
      </div>
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

    const allQuestionsAnswered = questions.every((_, index) => selectedAnswers[index] !== undefined);
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

        <h2 className="text-2xl font-bold mb-6">Chapter {currentChapter}: {chapters.find(c => c.id === currentChapter)?.title}</h2>

        {questions.map((question, questionIndex) => (
          <div key={questionIndex} className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-xl font-semibold mb-4">Question {questionIndex + 1}: {question.question}</h3>

            <div className="space-y-3">
              {question.options.map((option, optionIndex) => (
                <div
                  key={optionIndex}
                  onClick={() => handleAnswerSelect(questionIndex, optionIndex)}
                  className={`p-3 rounded-md cursor-pointer border ${selectedAnswers[questionIndex] === optionIndex
                      ? quizSubmitted
                        ? option.isCorrect
                          ? 'bg-green-100 border-green-500'
                          : 'bg-red-100 border-red-500'
                        : 'bg-blue-100 border-blue-500'
                      : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                    }`}
                >
                  <div className="flex items-start">
                    <div className="mr-2 font-bold">{String.fromCharCode(65 + optionIndex)}.</div>
                    <div>{option.text}</div>
                  </div>

                  {quizSubmitted && selectedAnswers[questionIndex] === optionIndex && !option.isCorrect && (
                    <div className="mt-2 text-red-600 text-sm">{option.explanation}</div>
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
            className={`mt-6 py-2 px-6 rounded-md font-semibold ${!allQuestionsAnswered
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
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

  return (
    <div className="min-h-screen bg-gray-100">
      {currentView === 'home' ? renderHome() : renderQuiz()}
    </div>
  );
};

export default App;