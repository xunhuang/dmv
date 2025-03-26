// This utility ensures that JSON data can be loaded in both development and production environments

let combinedData = null;

// Maximum number of questions to return per chapter - only limited in development
const QUESTIONS_LIMIT = process.env.NODE_ENV === 'development' ? 2 : Infinity;

// Function to load data either from imported module or from fetch
export const loadData = async () => {
  if (combinedData) {
    return combinedData;
  }

  try {
    // First try importing the JSON directly (works in development)
    const importedData = await import('../data/california-combined-questions.json');
    combinedData = importedData.default || importedData;
  } catch (err) {
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
  
  getQuestionsByChapter: async (chapterId) => {
    const data = await loadData();
    return new Promise((resolve) => {
      setTimeout(() => {
        const questions = (data.questionsByChapter && data.questionsByChapter[chapterId]) || [];
        resolve(questions.slice(0, QUESTIONS_LIMIT));
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
  }
};