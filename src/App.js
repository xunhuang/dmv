import React, { useState, useEffect } from 'react';
import { api } from './mockData';

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