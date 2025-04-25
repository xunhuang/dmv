// Use specific version of Express to avoid path-to-regexp issues
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

// Set NODE_ENV to production to avoid development-specific middleware
process.env.NODE_ENV = 'production';

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(bodyParser.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'app-email@gmail.com', // replace with environment variable
    pass: process.env.EMAIL_PASS || 'app-password' // replace with environment variable
  }
});

// API endpoint to send quiz results via email
app.post('/api/send-quiz-results', async (req, res) => {
  try {
    const { quizData, emailAddress } = req.body;
    
    if (!quizData || !emailAddress) {
      return res.status(400).json({ error: 'Quiz data and email address are required' });
    }

    // Calculate the percentage score
    const percentScore = Math.round((quizData.score / quizData.totalQuestions) * 100);
    
    // Create an HTML table of questions and answers
    let questionsHtml = '<table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">';
    questionsHtml += '<tr><th>Question</th><th>Your Answer</th><th>Correct Answer</th><th>Result</th></tr>';
    
    quizData.questions.forEach((q, index) => {
      const userAnswerIndex = q.selectedAnswer;
      const correctAnswerIndex = q.options.findIndex(opt => opt.isCorrect);
      const isCorrect = userAnswerIndex === correctAnswerIndex;
      
      questionsHtml += `<tr>
        <td>${q.question}</td>
        <td>${q.options[userAnswerIndex]?.text || 'No answer'}</td>
        <td>${q.options[correctAnswerIndex]?.text || 'Error'}</td>
        <td style="background-color: ${isCorrect ? '#d4edda' : '#f8d7da'}">${isCorrect ? 'Correct' : 'Incorrect'}</td>
      </tr>`;
    });
    
    questionsHtml += '</table>';

    // Prepare email content
    const mailOptions = {
      from: process.env.EMAIL_USER || 'app-email@gmail.com',
      to: emailAddress,
      subject: `DMV Practice Test Results - ${percentScore}% Score`,
      html: `
        <h1>Your DMV Practice Test Results</h1>
        <p><strong>Score:</strong> ${quizData.score}/${quizData.totalQuestions} (${percentScore}%)</p>
        <p><strong>Test Type:</strong> ${quizData.chapterId === 'comprehensive' ? 'Comprehensive Test' : `Chapter ${quizData.chapterId} Test`}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        
        <h2>Question Details</h2>
        ${questionsHtml}
        
        <p>Keep practicing to improve your score!</p>
      `
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      message: 'Quiz results sent successfully',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      error: 'Error sending email',
      message: error.message
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