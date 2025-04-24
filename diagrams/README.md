# DMV Diagram Gallery

A React web application to display and manage DMV diagram images with editable descriptions and Claude AI integration.

## Features

- Display all diagram images in a responsive grid layout
- Click on images to view them in a larger modal
- Add and edit custom descriptions for each image
- Ask Claude AI to automatically generate descriptions
- Hide unwanted images from the gallery
- Export and import your description data
- Responsive design for mobile and desktop

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn
- Anthropic API key (for Claude AI integration)

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up your Claude API key:
   - Copy `.env.example` to `.env`
   - Add your Anthropic API key to the `.env` file:
   ```
   REACT_APP_ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

4. Start both backend and frontend servers:
```bash
npm run dev
```

This will start:
- React frontend on port 3000
- Express backend on port 6000

### Running in Production

1. Build the frontend:
```bash
npm run build
```

2. Start the production server:
```bash
npm run server
```

This will serve the React app and API from the same server on port 6000.

## How It Works

- The React frontend allows users to view and manage DMV diagram images
- The Express backend handles API requests to Claude for image analysis
- When the "Ask Claude for annotation" button is clicked, the backend:
  1. Loads the image file from disk
  2. Converts it to base64 format
  3. Sends it to Claude API with your API key
  4. Returns the annotation to the frontend
- All user preferences and descriptions are saved to browser localStorage

## Technologies Used

- React for frontend
- Express.js for backend API
- Claude API (Anthropic) for image analysis
- localStorage for data persistence

## License

This project is licensed under the MIT License.