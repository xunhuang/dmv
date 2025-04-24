import React, { useState, useEffect, useCallback, useRef } from 'react';
import './ImageUploader.css';

// Function to call Claude API - defined outside the component to avoid hook issues
const claudeAnnotateAPI = async (imageFile) => {
  console.log('Requesting annotation from Claude for', imageFile);
  
  try {
    // Call our local backend API instead of Claude directly
    const apiEndpoint = '/api/annotate';
    
    // Make the API call to our backend
    const apiResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageFile })
    });
    
    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      throw new Error(`API error: ${apiResponse.status} - ${errorData.error || errorData.message || 'Unknown error'}`);
    }
    
    const data = await apiResponse.json();
    return data.annotation;
  } catch (error) {
    console.error('Error calling annotation API:', error);
    
    // Fallback responses if API fails
    const number = imageFile.replace('diagram-', '').replace('.png', '');
    const fallbackResponses = {
      '1': 'Speed limit sign showing 25 mph maximum speed.',
      '2': 'Stop sign at intersection, requiring full stop.',
      '6': 'Yield sign indicating drivers must give way to traffic on main road.',
      '7': 'No U-turn sign prohibiting 180-degree turns.',
      '10': 'School zone ahead, reduce speed when lights are flashing.',
      '20': 'Railroad crossing sign warning of train tracks ahead.',
      '25': 'Traffic light signal showing standard red, yellow, and green lights.',
      '30': 'Pedestrian crossing sign indicating crosswalk ahead.',
      'unknown': 'Road sign showing traffic regulations or warnings.'
    };
    
    return fallbackResponses[number] || 'Traffic sign or road diagram used in DMV training materials.';
  }
};

const DiagramGallery = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [descriptions, setDescriptions] = useState({});
  const [questions, setQuestions] = useState({});
  const [editingDescription, setEditingDescription] = useState(null);
  const [newDescription, setNewDescription] = useState('');
  const [hiddenImages, setHiddenImages] = useState(() => {
    const saved = localStorage.getItem('hiddenImages');
    return saved ? JSON.parse(saved) : [];
  });
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [batchAnnotating, setBatchAnnotating] = useState(false);
  const [annotationProgress, setAnnotationProgress] = useState({ current: 0, total: 0 });
  
  // Question generation state
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [generatedQuestion, setGeneratedQuestion] = useState(null);
  
  // For importing data
  const jsonInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const dropzoneRef = useRef(null);
  
  // Dynamically load image files from the server
  const [defaultImageFiles, setDefaultImageFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Image Upload State
  const [showUploader, setShowUploader] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Process file selection - using useCallback to avoid dependency issues
  const handleFile = useCallback((file) => {
    if (!file) return;
    
    // Reset state
    setUploadError(null);
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size should be less than 5MB');
      return;
    }
    
    // Set file and create preview
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setUploadPreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);
  
  // Fetch the image list from the server
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/images');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch images: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.images && Array.isArray(data.images)) {
          setDefaultImageFiles(data.images);
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (err) {
        console.error('Error fetching images:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchImages();
  }, []);
  
  // Filter out hidden images
  const imageFiles = defaultImageFiles.filter(img => !hiddenImages.includes(img));
  
  // Load descriptions and questions from localStorage on mount
  useEffect(() => {
    try {
      const savedDescriptions = localStorage.getItem('imageDescriptions');
      console.log('Retrieved descriptions from localStorage:', savedDescriptions);
      
      if (savedDescriptions) {
        const parsedDescriptions = JSON.parse(savedDescriptions);
        console.log('Parsed descriptions:', parsedDescriptions);
        setDescriptions(parsedDescriptions);
      }
      
      const savedQuestions = localStorage.getItem('imageQuestions');
      console.log('Retrieved questions from localStorage:', savedQuestions);
      
      if (savedQuestions) {
        try {
          const parsedQuestions = JSON.parse(savedQuestions);
          console.log('Parsed questions:', parsedQuestions);
          
          // For compatibility - ensure we're handling both formats
          // This enables a smooth transition from the old format to the new format
          const validatedQuestions = {};
          let needsUpdate = false;
          
          // Check each question and validate it's in the correct format
          Object.keys(parsedQuestions).forEach(key => {
            const question = parsedQuestions[key];
            if (typeof question === 'string') {
              // Keep the old format for now, it will be updated when regenerated
              validatedQuestions[key] = question;
            } else if (question && typeof question === 'object') {
              // New format - make sure it has the expected structure
              if (question.question && Array.isArray(question.options)) {
                validatedQuestions[key] = question;
              } else {
                console.log(`Invalid question format for ${key}, skipping`);
                needsUpdate = true;
              }
            }
          });
          
          setQuestions(validatedQuestions);
          
          // Update localStorage if we had to fix anything
          if (needsUpdate) {
            localStorage.setItem('imageQuestions', JSON.stringify(validatedQuestions));
          }
        } catch (parseError) {
          console.error('Error parsing questions:', parseError);
          // Clear invalid data
          localStorage.removeItem('imageQuestions');
          setQuestions({});
        }
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }
  }, []);
  
  // Save descriptions to localStorage whenever they change
  useEffect(() => {
    // Only save if descriptions object is not empty
    if (Object.keys(descriptions).length > 0) {
      console.log('Saving descriptions to localStorage:', descriptions);
      localStorage.setItem('imageDescriptions', JSON.stringify(descriptions));
    }
  }, [descriptions]);
  
  // Save questions to localStorage whenever they change
  useEffect(() => {
    // Only save if questions object is not empty
    if (Object.keys(questions).length > 0) {
      console.log('Saving questions to localStorage:', questions);
      localStorage.setItem('imageQuestions', JSON.stringify(questions));
    }
  }, [questions]);
  
  const openModal = (imagePath) => {
    setSelectedImage(imagePath);
    setEditingDescription(null);
    
    // If there's a saved question for this image, load it
    if (questions[imagePath]) {
      // Handle both string and object formats
      setGeneratedQuestion(questions[imagePath]);
    } else {
      setGeneratedQuestion(null);
    }
  };
  
  const closeModal = () => {
    setSelectedImage(null);
    setEditingDescription(null);
    setGeneratedQuestion(null);
  };
  
  // Function to generate a question with ChatGPT
  const generateQuestion = useCallback(async (image) => {
    if (isGeneratingQuestion || !descriptions[image]) {
      return;
    }
    
    try {
      setIsGeneratingQuestion(true);
      setGeneratedQuestion(null);
      
      // Call backend to generate question
      const response = await fetch('/api/generate-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageFile: image,
          description: descriptions[image]
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate question');
      }
      
      const data = await response.json();
      
      // Parse the question data as JSON
      const questionData = JSON.parse(data.question);
      
      // Set the generated question in state
      setGeneratedQuestion(questionData);
      
      // Save the question to the questions state
      setQuestions(prevQuestions => ({
        ...prevQuestions,
        [image]: questionData
      }));
      
    } catch (error) {
      console.error('Error generating question:', error);
      alert('Failed to generate question. Please try again.');
    } finally {
      setIsGeneratingQuestion(false);
    }
  }, [descriptions, isGeneratingQuestion]);
  
  const startEditing = (image, event) => {
    event.stopPropagation();
    setEditingDescription(image);
    setNewDescription(descriptions[image] || '');
  };
  
  // Save hidden images to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('hiddenImages', JSON.stringify(hiddenImages));
  }, [hiddenImages]);
  
  const saveDescription = useCallback((image) => {
    const updatedDescriptions = {
      ...descriptions,
      [image]: newDescription
    };
    
    console.log('Saving description for', image, ':', newDescription);
    console.log('Updated descriptions:', updatedDescriptions);
    
    try {
      // Manually save to localStorage immediately
      localStorage.setItem('imageDescriptions', JSON.stringify(updatedDescriptions));
      console.log('Successfully saved to localStorage');
      
      setDescriptions(updatedDescriptions);
      setEditingDescription(null);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      alert('Failed to save description. Please try again.');
    }
  }, [descriptions, newDescription]);
  
  const requestClaudeAnnotation = useCallback(async (image) => {
    if (isAnnotating) {
      return;
    }
    
    try {
      setIsAnnotating(true);
      
      // Call Claude API for annotation
      const annotationResult = await claudeAnnotateAPI(image);
      
      // Update the description with Claude's annotation
      const updatedDescriptions = {
        ...descriptions,
        [image]: annotationResult
      };
      
      // Save to state and localStorage
      setDescriptions(updatedDescriptions);
      localStorage.setItem('imageDescriptions', JSON.stringify(updatedDescriptions));
      
      console.log('Successfully annotated with Claude:', annotationResult);
    } catch (error) {
      console.error('Error getting annotation from Claude:', error);
      alert('Failed to get annotation from Claude. Please try again.');
    } finally {
      setIsAnnotating(false);
    }
  }, [descriptions, isAnnotating]);
  
  const hideImage = useCallback((image, event) => {
    event.stopPropagation();
    const updatedHiddenImages = [...hiddenImages, image];
    setHiddenImages(updatedHiddenImages);
    
    // If this image was selected in the modal, close the modal
    if (selectedImage === image) {
      setSelectedImage(null);
    }
  }, [hiddenImages, selectedImage]);
  
  const restoreAllImages = () => {
    setHiddenImages([]);
  };
  
  const importData = () => {
    jsonInputRef.current?.click();
  };
  
  // Function to batch annotate all images without descriptions
  const batchAnnotateAll = useCallback(async () => {
    // Filter images that don't have descriptions yet
    const imagesToAnnotate = imageFiles.filter(image => !descriptions[image]);
    
    if (imagesToAnnotate.length === 0) {
      alert('All images already have descriptions!');
      return;
    }
    
    setBatchAnnotating(true);
    setAnnotationProgress({ current: 0, total: imagesToAnnotate.length });
    
    const newDescriptions = { ...descriptions };
    
    // Process images sequentially to avoid overwhelming the API
    for (let i = 0; i < imagesToAnnotate.length; i++) {
      try {
        setAnnotationProgress({ current: i + 1, total: imagesToAnnotate.length });
        
        // Skip if we already have a description (might have been added in a previous iteration)
        if (newDescriptions[imagesToAnnotate[i]]) {
          continue;
        }
        
        // Call Claude API for annotation
        const annotation = await claudeAnnotateAPI(imagesToAnnotate[i]);
        
        // Update descriptions object
        newDescriptions[imagesToAnnotate[i]] = annotation;
        
        // Update state every few images to show progress
        if (i % 3 === 0 || i === imagesToAnnotate.length - 1) {
          setDescriptions({ ...newDescriptions });
          localStorage.setItem('imageDescriptions', JSON.stringify(newDescriptions));
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error(`Error annotating image ${imagesToAnnotate[i]}:`, error);
      }
    }
    
    // Final update to ensure all descriptions are saved
    setDescriptions(newDescriptions);
    localStorage.setItem('imageDescriptions', JSON.stringify(newDescriptions));
    
    setBatchAnnotating(false);
    alert(`Annotations complete! Added descriptions for ${imagesToAnnotate.length} images.`);
  }, [descriptions, imageFiles]);
  
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Validate the data format and import descriptions
        if (data.descriptions && typeof data.descriptions === 'object') {
          setDescriptions(prevDescriptions => ({
            ...prevDescriptions,
            ...data.descriptions
          }));
          localStorage.setItem('imageDescriptions', JSON.stringify({
            ...descriptions,
            ...data.descriptions
          }));
        }
        
        // Import questions if available
        if (data.questions && typeof data.questions === 'object') {
          setQuestions(prevQuestions => ({
            ...prevQuestions,
            ...data.questions
          }));
          localStorage.setItem('imageQuestions', JSON.stringify({
            ...questions,
            ...data.questions
          }));
        }
        
        // Import hidden images
        if (data.hiddenImages && Array.isArray(data.hiddenImages)) {
          setHiddenImages(data.hiddenImages);
          localStorage.setItem('hiddenImages', JSON.stringify(data.hiddenImages));
        }
        
        alert('Data imported successfully!');
      } catch (error) {
        console.error('Error importing data:', error);
        alert('Failed to import data. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = null;
  };
  
  const exportData = () => {
    // Create a map of visible images and their descriptions
    const visibleImageDescriptions = {};
    const visibleImageQuestions = {};
    
    imageFiles.forEach(image => {
      if (descriptions[image]) {
        visibleImageDescriptions[image] = descriptions[image];
      }
      if (questions[image]) {
        visibleImageQuestions[image] = questions[image];
      }
    });
    
    // Collect all data
    const exportData = {
      descriptions: visibleImageDescriptions,
      questions: visibleImageQuestions,
      hiddenImages,
      exportDate: new Date().toISOString(),
      totalImages: {
        visible: imageFiles.length,
        hidden: hiddenImages.length,
        total: defaultImageFiles.length
      }
    };
    
    // Convert to JSON string
    const jsonData = JSON.stringify(exportData, null, 2);
    
    // Create a blob and download link
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `dmv-diagrams-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };
  
  // Helper function to refresh images - memoized with useCallback 
  const refreshImages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/images');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.images && Array.isArray(data.images)) {
        setDefaultImageFiles(data.images);
      }
    } catch (err) {
      console.error('Error refreshing images:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    handleFile(file);
  };

  // Handle file drop
  const handleFileDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    dropzoneRef.current?.classList.remove('active');
    
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFile(event.dataTransfer.files[0]);
    }
  };
  
  // Handle upload action
  const handleUpload = async () => {
    if (!uploadFile) return;
    
    try {
      setUploading(true);
      setUploadProgress(10);
      
      const formData = new FormData();
      formData.append('image', uploadFile);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      setUploadProgress(70);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      setUploadProgress(90);
      
      // Get the response data
      await response.json();
      
      // Reset the uploader
      setUploadFile(null);
      setUploadPreview(null);
      setShowUploader(false);
      
      // Refresh the image list
      try {
        await refreshImages();
      } catch (error) {
        console.error('Error refreshing images:', error);
        // Continue anyway, don't prevent success
      }
      
      setUploadProgress(100);
      
      // Success message
      alert('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };
  
  // Drag events for dropzone
  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropzoneRef.current?.classList.add('active');
  };
  
  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropzoneRef.current?.classList.remove('active');
  };
  
  // Cancel upload
  const cancelUpload = () => {
    setUploadFile(null);
    setUploadPreview(null);
    setUploadError(null);
  };
  
  // Handle clipboard paste on main page
  const handleClipboardPaste = useCallback(async (event) => {
    // Only process if not currently uploading
    if (uploading || isAnnotating) {
      return;
    }
    
    const clipboardData = event.clipboardData;
    if (!clipboardData) {
      return;
    }
    
    // Check if clipboard contains images
    const items = clipboardData.items;
    let imageItem = null;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        imageItem = items[i];
        break;
      }
    }
    
    if (!imageItem) {
      return;
    }
    
    try {
      setUploading(true);
      
      // Get the file from clipboard
      const file = imageItem.getAsFile();
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size should be less than 5MB');
      }
      
      // Create FormData for upload
      const formData = new FormData();
      formData.append('image', file);
      
      // Upload the image
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      // Get the response data
      const data = await response.json();
      
      // Refresh the image list
      await refreshImages();
      
      // Request Claude annotation for the newly uploaded image
      if (data.file) {
        setIsAnnotating(true);
        try {
          const annotationResult = await claudeAnnotateAPI(data.file);
          
          // Update descriptions with Claude's annotation
          const updatedDescriptions = {
            ...descriptions,
            [data.file]: annotationResult
          };
          
          // Save to state and localStorage
          setDescriptions(updatedDescriptions);
          localStorage.setItem('imageDescriptions', JSON.stringify(updatedDescriptions));
        } catch (annotateError) {
          console.error('Error getting annotation from Claude:', annotateError);
        } finally {
          setIsAnnotating(false);
        }
      }
      
      // Show a brief notification
      alert('Image pasted and uploaded successfully!');
    } catch (error) {
      console.error('Error processing pasted image:', error);
      alert(`Failed to upload image: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }, [uploading, isAnnotating, refreshImages, descriptions]);
  
  // Add clipboard paste event listener
  useEffect(() => {
    window.addEventListener('paste', handleClipboardPaste);
    
    return () => {
      window.removeEventListener('paste', handleClipboardPaste);
    };
  }, [handleClipboardPaste]);
  
  // Render loading state or error
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md flex flex-col items-center">
          <svg className="animate-spin h-12 w-12 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <h2 className="text-xl font-semibold text-gray-800">Loading Gallery...</h2>
          <p className="text-gray-600 mt-2">Discovering available images</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <div className="flex items-center mb-4">
            <svg className="h-10 w-10 text-red-500 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-800">Error Loading Images</h2>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-blue-700">DMV Diagram Gallery</h1>
        
        <div className="flex flex-wrap gap-2">
          {batchAnnotating ? (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded flex items-center">
              <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Annotating {annotationProgress.current}/{annotationProgress.total}...
            </div>
          ) : (
            <button 
              onClick={batchAnnotateAll}
              className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              Auto-Annotate All
            </button>
          )}
          
          <button 
            onClick={() => setShowUploader(true)}
            className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 transition flex items-center"
            disabled={batchAnnotating || uploading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Upload Image
            <span className="ml-2 text-xs opacity-75">(or Cmd+V to paste)</span>
          </button>
          
          <button 
            onClick={refreshImages}
            className="bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-600 transition flex items-center"
            disabled={batchAnnotating || loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Refresh Images
          </button>
          
          <button 
            onClick={exportData}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition flex items-center"
            disabled={batchAnnotating}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Export Data
          </button>
          
          <button 
            onClick={importData}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition flex items-center"
            disabled={batchAnnotating}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.707-8.707a1 1 0 00-1.414 0L3 10.586V3a1 1 0 00-2 0v7.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 000-1.414z" clipRule="evenodd" transform="translate(20, 0) scale(-1, 1)" />
            </svg>
            Import Data
          </button>
          
          {/* Hidden file input for importing */}
          <input 
            type="file" 
            ref={jsonInputRef}
            style={{ display: 'none' }}
            accept=".json"
            onChange={handleFileUpload}
          />
          
          {hiddenImages.length > 0 && (
            <button 
              onClick={restoreAllImages}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition"
              disabled={batchAnnotating}
            >
              Restore Hidden Images ({hiddenImages.length})
            </button>
          )}
        </div>
      </div>
      
      {/* Image Upload Modal */}
      {showUploader && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Upload New Image</h3>
              <button 
                onClick={() => {
                  setShowUploader(false);
                  cancelUpload();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {!uploadFile ? (
                <div 
                  className="image-upload-dropzone"
                  ref={dropzoneRef}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleFileDrop}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                  />
                  <svg className="image-upload-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="image-upload-text">Click or drag to upload an image</p>
                    <p className="image-upload-hint mb-3">PNG, JPG, GIF up to 5MB</p>
                    <div className="image-upload-shortcut">
                      <kbd className="bg-gray-200 px-2 py-1 rounded text-sm border border-gray-300">Ctrl</kbd>
                      <span className="mx-1">+</span>
                      <kbd className="bg-gray-200 px-2 py-1 rounded text-sm border border-gray-300">V</kbd>
                      <span className="ml-2">to paste from clipboard</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="upload-preview">
                    <img src={uploadPreview} alt="Upload preview" />
                  </div>
                  
                  {uploading && (
                    <div className="upload-progress mt-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-bar-fill"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {uploadError && (
                    <div className="error-message">
                      {uploadError}
                    </div>
                  )}
                  
                  <div className="upload-buttons">
                    <button
                      onClick={cancelUpload}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded transition"
                      disabled={uploading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpload}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition flex items-center"
                      disabled={uploading}
                    >
                      {uploading && <span className="loading-spinner"></span>}
                      Upload
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Image count display and paste instructions */}
      <div className="mb-4 flex flex-wrap justify-between items-center">
        <div className="flex flex-col gap-1">
          <div className="text-gray-600">
            Showing {imageFiles.length} of {defaultImageFiles.length} images
            {hiddenImages.length > 0 && ` (${hiddenImages.length} hidden)`}
          </div>
          <div className="text-gray-500 text-sm italic">
            <kbd className="bg-gray-200 px-2 py-0.5 rounded text-xs border border-gray-300">Cmd</kbd>
            <span className="mx-1">+</span>
            <kbd className="bg-gray-200 px-2 py-0.5 rounded text-xs border border-gray-300">V</kbd>
            <span className="ml-2">anywhere on this page to paste and upload an image with automatic annotation</span>
          </div>
        </div>
        
        {uploading && (
          <div className="text-amber-600 flex items-center">
            <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing pasted image...
          </div>
        )}
        
        {isAnnotating && (
          <div className="text-indigo-600 flex items-center">
            <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating description with Claude...
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {imageFiles.map((image, index) => (
          <div 
            key={index}
            className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition duration-300 relative"
            onClick={() => openModal(image)}
          >
            <button
              className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-600 z-10"
              onClick={(e) => hideImage(image, e)}
              title="Hide this image"
            >
              ×
            </button>
            <div className="aspect-w-1 aspect-h-1">
              <img 
                src={`/images/renamed/${image}`} 
                alt={`Diagram ${index + 1}`}
                className="object-contain w-full h-48"
              />
            </div>
            <div className="p-2 text-sm text-gray-700">
              <div className="text-center mb-1 font-medium flex items-center justify-center gap-1">
                <span className="text-gray-800">{index + 1}.</span> 
                <span className="font-mono text-xs break-all">{image}</span>
                {questions[image] && (
                  <span title="Has practice question" className="flex-shrink-0">
                    <svg className="h-4 w-4 text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                )}
              </div>
              
              {editingDescription === image ? (
                <div className="mt-1 flex">
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        saveDescription(image);
                      }
                    }}
                    className="border border-gray-300 rounded px-2 py-1 w-full text-sm"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      saveDescription(image);
                    }}
                    className="ml-1 bg-green-500 text-white px-2 rounded hover:bg-green-600"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <div 
                    className="italic text-sm text-gray-500 overflow-hidden text-ellipsis min-h-[20px] cursor-pointer hover:bg-gray-100 p-1 rounded"
                    onClick={(e) => startEditing(image, e)}
                  >
                    {descriptions[image] || 'Click to add description...'}
                  </div>
                  {questions[image] && (
                    <div className="flex items-center text-xs text-teal-600">
                      <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {typeof questions[image] === 'string' ? (
                        <span>Has practice question</span>
                      ) : (
                        <span>Quiz: "{questions[image]?.question?.substring(0, 30) || 'Practice question'}..."</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Modal for enlarged image view */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={closeModal}>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="relative bg-white rounded-lg shadow-xl">
              <button 
                className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600"
                onClick={closeModal}
              >
                ×
              </button>
              <div className="p-4">
                <img 
                  src={`/images/renamed/${selectedImage}`} 
                  alt="Enlarged diagram" 
                  className="max-h-[80vh] mx-auto"
                />
              </div>
              <div className="p-4 text-gray-700">
                <div className="text-center font-bold text-lg mb-2">
                  <span className="font-mono text-sm break-all">{selectedImage}</span>
                </div>
                
                {editingDescription === selectedImage ? (
                  <div className="flex mt-2">
                    <input
                      type="text"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          saveDescription(selectedImage);
                        }
                      }}
                      className="border border-gray-300 rounded px-3 py-2 w-full"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        saveDescription(selectedImage);
                      }}
                      className="ml-2 bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div 
                      className="border border-gray-200 rounded p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer min-h-[40px]"
                      onClick={(e) => startEditing(selectedImage, e)}
                    >
                      {descriptions[selectedImage] || 'Click to add description...'}
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          requestClaudeAnnotation(selectedImage);
                        }}
                        disabled={isAnnotating}
                        className={`flex-1 py-2 px-3 rounded flex items-center justify-center ${
                          isAnnotating 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                      >
                        {isAnnotating ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Getting annotation...
                          </>
                        ) : (
                          <>
                            <svg className="h-5 w-5 mr-1" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M10.5 8a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                              <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
                            </svg>
                            Ask Claude for annotation
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          generateQuestion(selectedImage);
                        }}
                        disabled={isGeneratingQuestion || !descriptions[selectedImage]}
                        className={`flex-1 py-2 px-3 rounded flex items-center justify-center ${
                          isGeneratingQuestion || !descriptions[selectedImage]
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-teal-600 hover:bg-teal-700 text-white'
                        }`}
                        title={!descriptions[selectedImage] ? "Description required to generate a question" : ""}
                      >
                        {isGeneratingQuestion ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating question...
                          </>
                        ) : (
                          <>
                            <svg className="h-5 w-5 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {questions[selectedImage] ? 'Update Question' : 'Generate Question'}
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Display the generated question */}
                    {generatedQuestion && (
                      <div className="mt-4 border-t pt-4">
                        <h3 className="font-semibold text-lg mb-2">Practice Question:</h3>
                        {typeof generatedQuestion === 'string' ? (
                          // Handle legacy string format
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-gray-800 whitespace-pre-line">
                            {generatedQuestion}
                          </div>
                        ) : (
                          // Handle new JSON format
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-gray-800">
                            {/* Display the question */}
                            <p className="font-medium mb-3">{generatedQuestion.question}</p>
                            
                            {/* Display options as a list */}
                            <div className="space-y-2">
                              {generatedQuestion.options && generatedQuestion.options.map((option, index) => (
                                <div 
                                  key={index} 
                                  className={`p-2 rounded ${option.isCorrect 
                                    ? 'bg-green-100 border border-green-300' 
                                    : 'bg-blue-50 border border-blue-100'}`}
                                >
                                  <div className="flex items-start">
                                    <span className={`font-bold mr-2 ${option.isCorrect ? 'text-green-700' : 'text-gray-700'}`}>
                                      {String.fromCharCode(65 + index)}.
                                    </span>
                                    <span className={option.isCorrect ? 'text-green-800 font-medium' : 'text-gray-800'}>
                                      {option.text}
                                      {option.isCorrect && 
                                        <span className="ml-2 text-green-600 font-semibold text-sm whitespace-nowrap">✓ Correct</span>
                                      }
                                    </span>
                                  </div>
                                  {!option.isCorrect && option.explanation && (
                                    <p className="text-sm text-gray-600 mt-1 ml-6 italic">
                                      {option.explanation}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagramGallery;