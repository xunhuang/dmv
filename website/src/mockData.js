// Use the more robust data loader utility
import { api, loadData } from './utils/dataLoader';

// Initialize data loading immediately
loadData();

// Export the API
export { api };

// Export mockQuestionsByChapter for backward compatibility
export const mockQuestionsByChapter = {};