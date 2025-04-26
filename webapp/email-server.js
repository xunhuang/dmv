// Simple email notification server
const http = require('http');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Fixed recipient email
const RECIPIENT_EMAIL = 'xhuang@gmail.com';

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'app-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'app-password'
  }
});

// Create a simple HTTP server
const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Only handle POST requests to our endpoint
  if (req.url === '/api/send-quiz-results' && req.method === 'POST') {
    let body = '';
    
    // Collect request body data
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    // Process the request once we have the complete body
    req.on('end', async () => {
      try {
        const { quizData, emailAddress } = JSON.parse(body);
        
        if (!quizData) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Quiz data is required' }));
          return;
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
          to: RECIPIENT_EMAIL, // Always send to this fixed email
          subject: `DMV Practice Test Results - ${percentScore}% Score`,
          html: `
            <h1>Your DMV Practice Test Results</h1>
            <p><strong>Score:</strong> ${quizData.score}/${quizData.totalQuestions} (${percentScore}%)</p>
            <p><strong>Test Type:</strong> ${quizData.chapterId === 'comprehensive' ? 'Comprehensive Test' : `Chapter ${quizData.chapterId} Test`}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>User Email:</strong> ${emailAddress || 'Not provided'}</p>
            
            <h2>Question Details</h2>
            ${questionsHtml}
            
            <p>Keep practicing to improve your score!</p>
          `
        };
        
        // Send the email
        console.log(`Sending email to ${RECIPIENT_EMAIL}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Quiz results sent successfully',
          messageId: info.messageId
        }));
      } catch (error) {
        console.error('Error sending email:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Error sending email',
          message: error.message
        }));
      }
    });
  } else {
    // Return 404 for any other endpoint
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Email server running on port ${PORT}`);
});