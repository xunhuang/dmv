// This utility ensures that JSON data can be loaded in both development and production environments

let combinedData = null;

// Function to load data either from imported module or from fetch
export const loadData = async () => {
  if (combinedData) {
    return combinedData;
  }

  try {
    // First try importing the JSON directly (works in development)
    const importedData = await import('../data/combined-questions.json');
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
        resolve((data.questionsByChapter && data.questionsByChapter[chapterId]) || []);
      }, 500);
    });
  }
};