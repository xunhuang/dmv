// Import the combined questions data
import combinedData from './data/combined-questions.json';

// Mock API service to simulate backend calls
export const api = {
  getChapters: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(combinedData.chapters);
      }, 300);
    });
  },
  
  getQuestionsByChapter: (chapterId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(combinedData.questionsByChapter[chapterId]);
      }, 500);
    });
  }
};

// Export the question data for direct access if needed
export const mockQuestionsByChapter = combinedData.questionsByChapter;