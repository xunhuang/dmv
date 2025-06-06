const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


const app = express();
const port = process.env.PORT || 6000;

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(bodyParser.json({ limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save uploaded files to a temporary directory first
    const uploadDir = path.join(__dirname, 'temp-uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.png';
    cb(null, uniqueSuffix + ext);
  }
});

// Create the multer instance
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// API endpoint to upload an image
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Process the image with Sharp to ensure it's a valid PNG
    const imageBuffer = await sharp(req.file.path)
      .png() // Convert to PNG format
      .resize({ 
        width: 800, 
        height: 800, 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .toBuffer();

    // Count existing diagram files to determine the next number
    const renamedDir = path.join(__dirname, 'public/images/renamed');
    const files = fs.readdirSync(renamedDir)
      .filter(file => file.startsWith('diagram-') && file.endsWith('.png'));
    
    // Extract numbers from filenames
    const numbers = files.map(file => {
      const match = file.match(/diagram-(\d+)\.png/);
      return match ? parseInt(match[1]) : 0;
    });
    
    // Find the next available number
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;
    
    // Define the final filename and path
    const newFileName = `diagram-${nextNumber}.png`;
    const finalPath = path.join(renamedDir, newFileName);
    
    // Write the optimized image to the final location
    fs.writeFileSync(finalPath, imageBuffer);
    
    // Clean up the temporary file
    fs.unlinkSync(req.file.path);
    
    res.json({ 
      success: true, 
      message: 'Image uploaded successfully',
      file: newFileName
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to process uploaded image' });
    
    // Try to clean up the temporary file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

// API endpoint to get all image files
app.get('/api/images', (req, res) => {
  try {
    const imagesDir = path.join(__dirname, 'public/images/renamed');
    const files = fs.readdirSync(imagesDir)
      .filter(file => file.endsWith('.png'))
      .sort((a, b) => {
        // Sort by numeric part if available
        const numA = parseInt(a.match(/\d+/) || '0');
        const numB = parseInt(b.match(/\d+/) || '0');
        return numA - numB;
      });
    
    res.json({ images: files });
  } catch (error) {
    console.error('Error reading image directory:', error);
    res.status(500).json({ error: 'Failed to read image directory' });
  }
});

// API endpoint to delete images
app.post('/api/delete-images', async (req, res) => {
  try {
    const { images } = req.body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'No images provided for deletion' });
    }
    
    const imagesDir = path.join(__dirname, 'public/images/renamed');
    const results = { success: [], failed: [] };
    
    // Process each image
    for (const image of images) {
      // Validate the filename for security
      if (!image || typeof image !== 'string' || !image.endsWith('.png')) {
        results.failed.push({ file: image, reason: 'Invalid filename' });
        continue;
      }
      
      // Ensure no directory traversal
      const imagePath = path.join(imagesDir, image);
      if (!imagePath.startsWith(imagesDir)) {
        results.failed.push({ file: image, reason: 'Invalid path' });
        continue;
      }
      
      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        results.failed.push({ file: image, reason: 'File not found' });
        continue;
      }
      
      // Delete the file
      try {
        fs.unlinkSync(imagePath);
        results.success.push(image);
      } catch (error) {
        console.error(`Error deleting ${image}:`, error);
        results.failed.push({ file: image, reason: error.message });
      }
    }
    
    res.json({
      message: `Deleted ${results.success.length} images, ${results.failed.length} failures`,
      results
    });
  } catch (error) {
    console.error('Error deleting images:', error);
    res.status(500).json({
      error: 'Error deleting images',
      message: error.message
    });
  }
});

// API endpoint to annotate images with Claude
app.post('/api/annotate', async (req, res) => {
  try {
    const { imageFile } = req.body;

    // Load the image file
    const imagePath = path.join(__dirname, 'public/images/renamed', imageFile);

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image file not found' });
    }

    // Convert image to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Call Claude API
    const apiEndpoint = 'https://api.anthropic.com/v1/messages';
    const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Prepare the request body
    const requestBody = {
      model: "claude-3-haiku-20240307",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please describe this traffic sign or road diagram in a single concise sentence according to calfironia DMV handbook. Focus on what it means or instructs drivers to do."
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: base64Image
              }
            }
          ]
        }
      ]
    };

    // Make the API call
    const response = await axios.post(apiEndpoint, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });

    const annotation = response.data.content[0].text;

    // Return the annotation
    res.json({ annotation });
  } catch (error) {
    console.error('Error annotating image:', error);
    res.status(500).json({
      error: 'Error annotating image',
      message: error.message,
      details: error.response?.data || 'No additional details available'
    });
  }
});

// API endpoint to generate a question based on image and description using OpenAI
app.post('/api/generate-question', async (req, res) => {
  try {
    const { imageFile, description } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'Description is required to generate a question' });
    }

    // Load the image file
    const imagePath = path.join(__dirname, 'public/images/renamed', imageFile);

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image file not found' });
    }

    // Convert image to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    console.log("making openai call to generate question");
    // OpenAI API Call
    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
        messages: [
          {
            "role": "developer",
            "content": [
              {
                "type": "text",
                "text": "You are a DMV driving test expert. Generate a multiple-choice question based on the provided traffic sign/diagram and its description. The question should test the user's understanding of what action to take or rule to follow when encountering this sign/diagram. Include 4 options (A, B, C, D) with one correct answer. Make the question challenging but fair for a driver's license test.\n[\n    {\n      question: \"When will you need a REAL ID compliant driver's license?\",\n      options: [\n        { text: \"Beginning May 2025 to board domestic flights or enter federal facilities\", isCorrect: true },\n        { text: \"Only when traveling internationally\", isCorrect: false, explanation: \"REAL ID is for domestic flights and entering federal facilities, not international travel.\" },\n        { text: \"Beginning January 2024 for all driving purposes\", isCorrect: false, explanation: \"A REAL ID is not required for driving, only for boarding domestic flights and entering federal facilities.\" },\n        { text: \"Only when driving commercial vehicles\", isCorrect: false, explanation: \"A REAL ID is not specifically for commercial driving.\" }\n      ]\n    },\n    {\n      question: \"What type of card is issued for identification purposes to eligible persons of any age?\",\n      options: [\n        { text: \"ID card\", isCorrect: true },\n        { text: \"Driver's license\", isCorrect: false, explanation: \"A driver's license permits you to drive, while an ID card is for identification only.\" },\n        { text: \"REAL ID card\", isCorrect: false, explanation: \"While a REAL ID can be either a driver's license or ID card, not all ID cards are REAL ID compliant.\" },\n        { text: \"Veteran designation card\", isCorrect: false, explanation: \"A Veteran designation is a feature that can be added to a driver's license or ID card, not a separate type of card.\" }\n      ]\n    }\n  ]"
              }
            ]
          },
          {
            "role": "assistant",
            "content": [
              {
                "type": "text",
                "text": "Please upload the diagram (or provide a clear description of it), and I will generate California DMV–style multiple‑choice questions in the requested JSON format."
              }
            ]
          },
          {
            "role": "user",
            "content": [
              {
                "type": "text",
                "text": `Description of the sign/diagram: ${description}\n\nGenerate a multiple-choice question about this traffic sign/diagram along with 4 options and indicate the correct answer.`
              },
              {
                "type": "image_url",
                "image_url": {
                  "url": `data:image/png;base64,${base64Image}`
                }
              },
            ]
          },
        ],
      response_format: {
        "type": "json_object"
      },
      // reasoning_effort: "medium",
      // store: false,
    });

    console.log(openaiResponse);

    const generatedQuestion = openaiResponse.choices[0].message.content;

    // Return the generated question
    res.json({ question: generatedQuestion });
  } catch (error) {
    console.error('Error generating question:', error);
    res.status(500).json({
      error: 'Error generating question',
      message: error.message,
      details: error.response?.data || 'No additional details available'
    });
  }
});

// Catch-all handler to serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});