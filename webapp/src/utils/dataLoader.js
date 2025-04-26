// This utility ensures that JSON data can be loaded in both development and production environments

let combinedData = null;

// Function to load data either from imported module or from fetch
export const loadData = async () => {
  if (combinedData) {
    return combinedData;
  }

  try {
    // First try importing the JSON directly (works in development with Vite)
    // Use dynamic import for JSON files
    const importedData = await import('../data/california-combined-questions.json');
    combinedData = importedData.default || importedData;
  } catch (err) {
    console.error('Failed to import JSON directly:', err);
    // If import fails, try fetching it as a file (works in production)
    try {
      const response = await fetch('/combined-questions.json');
      combinedData = await response.json();
    } catch (fetchErr) {
      console.error('Failed to load data:', fetchErr);
      // Provide a fallback empty structure
      combinedData = { 
        chapters: [], 
        questionsByChapter: {} 
      };
    }
  }

  return combinedData;
};

// API that mimics the original mockData.js but with more robust data loading
export const api = {
  getChapters: async () => {
    const data = await loadData();
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(data.chapters || []);
      }, 300);
    });
  },
  
  getQuestionsByChapter: async (chapterId, userPreferences = {}) => {
    const data = await loadData();
    return new Promise((resolve) => {
      setTimeout(() => {
        const questions = (data.questionsByChapter && data.questionsByChapter[chapterId]) || [];
        // Use questionsLimit from userPreferences, with fallbacks
        const questionsLimit = userPreferences.questionsLimit ||
          (import.meta.env.DEV ? 2 : Infinity); // Use Vite's import.meta.env.DEV instead of process.env

        // Randomly shuffle the questions array
        const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);

        // Randomize the options order for each question
        const questionsWithRandomizedOptions = shuffledQuestions.slice(0, questionsLimit).map(question => ({
          ...question,
          options: [...question.options].sort(() => Math.random() - 0.5)
        }));
        resolve(questionsWithRandomizedOptions);
      }, 500);
    });
  },

  // New function to save quiz results
  saveQuizResults: async (quizData) => {
    // Mock API call to save quiz results
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          // Log the data that would be saved to the backend
          console.log('Saving quiz results:', quizData);

          // Simulate successful save
          resolve({
            success: true,
            message: 'Quiz results saved successfully',
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          reject({
            success: false,
            message: 'Failed to save quiz results',
            error: error.message
          });
        }
      }, 600);
    });
  },

  // Add the comprehensive questions method to the api object
  getComprehensiveQuestions: async ({ questionsLimit, chapters }) => {
    try {
      // Create an array of promises for all chapter question requests
      const questionPromises = chapters.map(chapter =>
        api.getQuestionsByChapter(chapter.id, {
          questionsLimit: Math.ceil(questionsLimit / chapters.length)
        })
      );

      // Wait for all promises to resolve in parallel
      const chapterQuestionsArrays = await Promise.all(questionPromises);

      // Flatten the array of arrays into a single array of questions
      const allQuestions = chapterQuestionsArrays.flat();

      // Shuffle and limit the questions
      const shuffled = allQuestions.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, questionsLimit);

      return selected;
    } catch (error) {
      console.error("Error in getComprehensiveQuestions:", error);
      return [];
    }
  }
};