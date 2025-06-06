// Simple email notification server
const http = require("http");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Fixed recipient emails
const RECIPIENT_EMAILS = [
  "xhuang@gmail.com",
];

// Define the website URL
const WEBSITE_URL = process.env.WEBSITE_URL || "https://dmvtest-13aec.web.app";

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "app-email@gmail.com",
    pass: process.env.EMAIL_PASS || "app-password",
  },
});

// Create a simple HTTP server
const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only handle POST requests to our endpoint
  if (req.url === "/api/send-quiz-results" && req.method === "POST") {
    let body = "";

    // Collect request body data
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    // Process the request once we have the complete body
    req.on("end", async () => {
      try {
        const { quizData, emailAddress, userName } = JSON.parse(body);

        if (!quizData) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Quiz data is required" }));
          return;
        }

        // Calculate the percentage score
        const percentScore = Math.round(
          (quizData.score / quizData.totalQuestions) * 100
        );

        // Create an HTML table of questions and answers
        let questionsHtml =
          '<table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">';
        questionsHtml +=
          "<tr><th>Question</th><th>Your Answer</th><th>Correct Answer</th><th>Result</th></tr>";

        quizData.questions.forEach((q, index) => {
          const userAnswerIndex = q.selectedAnswer;
          const correctAnswerIndex = q.options.findIndex(
            (opt) => opt.isCorrect
          );
          const isCorrect = userAnswerIndex === correctAnswerIndex;

          // Add image link to the question if applicable
          let questionText = q.question;
          if (q.imgFileName) {
            if (
              q.imgFileName.startsWith(
                "https://www.dmv-written-test.com/images/meta/cover-1024x512.png"
              )
            ) {
              q.imgFileName = null;
            } else {
              const imageUrl = q.imgFileName.startsWith("https://")
                ? q.imgFileName
                : `https://webapp-53152538382.us-central1.run.app/images/${q.imgFileName}`;

              questionText = `${q.question}<br><br><img src="${imageUrl}" alt="Question diagram" style="max-width: 300px; display: block; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px;" />`;
            }
          }

          questionsHtml += `<tr>
            <td>${questionText}</td>
            <td>${q.options[userAnswerIndex]?.text || "No answer"}</td>
            <td>${q.options[correctAnswerIndex]?.text || "Error"}</td>
            <td style="background-color: ${
              isCorrect ? "#d4edda" : "#f8d7da"
            }">${isCorrect ? "Correct" : "Incorrect"}</td>
          </tr>`;
        });

        questionsHtml += "</table>";

        // Prepare HTML for incorrect questions section
        let incorrectQuestionsHtml = "";
        const incorrectQuestions = quizData.questions.filter((q) => {
          const userAnswerIndex = q.selectedAnswer;
          const correctAnswerIndex = q.options.findIndex(
            (opt) => opt.isCorrect
          );
          return userAnswerIndex !== correctAnswerIndex;
        });

        if (incorrectQuestions.length > 0) {
          incorrectQuestionsHtml = "<h2>Incorrect Questions</h2>";

          incorrectQuestions.forEach((q, index) => {
            const userAnswerIndex = q.selectedAnswer;
            const correctAnswerIndex = q.options.findIndex(
              (opt) => opt.isCorrect
            );
            const correctOption = q.options[correctAnswerIndex];

            // Process the image URL if one exists
            let imageHtml = "";
            if (q.imgFileName) {
              if (
                q.imgFileName.startsWith(
                  "https://www.dmv-written-test.com/images/meta/cover-1024x512.png"
                )
              ) {
                q.imgFileName = null;
              } else {
                const imageUrl = q.imgFileName.startsWith("https://")
                  ? q.imgFileName
                  : `https://webapp-53152538382.us-central1.run.app/images/${q.imgFileName}`;

                imageHtml = `
                <div style="margin-bottom: 15px; text-align: center;">
                  <img src="${imageUrl}" alt="Question diagram" 
                       style="max-width: 100%; border: 1px solid #ddd; border-radius: 5px;" />
                </div>
              `;
              }
            }

            incorrectQuestionsHtml += `
              <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                <p style="font-weight: bold; margin-bottom: 10px;">${
                  index + 1
                }. ${q.question}</p>
                
                ${imageHtml}
                
                <div style="margin-left: 20px;">
                  ${q.options
                    .map(
                      (option, idx) => `
                    <div style="margin-bottom: 5px; 
                         ${
                           idx === userAnswerIndex
                             ? "background-color: #f8d7da; padding: 5px; border-radius: 3px;"
                             : ""
                         }
                         ${
                           idx === correctAnswerIndex
                             ? "background-color: #d4edda; padding: 5px; border-radius: 3px;"
                             : ""
                         }">
                      <span style="font-weight: ${
                        idx === correctAnswerIndex ? "bold" : "normal"
                      };">
                        ${String.fromCharCode(65 + idx)}. ${option.text}
                      </span>
                      ${
                        idx === userAnswerIndex && idx !== correctAnswerIndex
                          ? '<span style="color: #dc3545; margin-left: 5px;">✗ Your answer</span>'
                          : ""
                      }
                      ${
                        idx === correctAnswerIndex
                          ? '<span style="color: #28a745; margin-left: 5px;">✓ Correct answer</span>'
                          : ""
                      }
                      ${
                        option.explanation
                          ? `<div style="margin-top: 5px; margin-left: 20px; font-style: italic; color: ${
                              idx === correctAnswerIndex ? "#28a745" : "#666"
                            };">
                           ${option.explanation}
                         </div>`
                          : ""
                      }
                    </div>
                  `
                    )
                    .join("")}
                </div>
              </div>
            `;
          });
        }

        // Generate the retake quiz URL with attempt ID as query parameter
        const retakeQuizUrl = quizData.chapterId === "comprehensive" 
          ? `${WEBSITE_URL}/chaptercomprehensive?attempt=${quizData.attemptId}`
          : `${WEBSITE_URL}/chapter/${quizData.chapterId}?attempt=${quizData.attemptId}`;
        
        // Generate retry missed questions URL with attempt ID and additional 'missed=true' parameter
        const retryMissedUrl = quizData.chapterId === "comprehensive" 
          ? `${WEBSITE_URL}/chaptercomprehensive?attempt=${quizData.attemptId}&missed=true`
          : `${WEBSITE_URL}/chapter/${quizData.chapterId}?attempt=${quizData.attemptId}&missed=true`;
          
        // Prepare email content - same for both recipients
        const emailHtml = `
          <h1>Your DMV Practice Test Results</h1>
          <p><strong>Score:</strong> ${quizData.score}/${
          quizData.totalQuestions
        } (${percentScore}%)</p>
          <p><strong>Test Type:</strong> ${
            quizData.chapterId === "comprehensive"
              ? "Comprehensive Test"
              : `Chapter ${quizData.chapterId} Test`
          }</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Name:</strong> ${userName || "Not provided"}</p>
          <p><strong>Email:</strong> ${emailAddress || "Not provided"}</p>
          
          <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px; text-align: center;">
            <p style="margin-bottom: 15px;"><strong>Practice options:</strong></p>
            <a href="${retakeQuizUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">Retake This Exact Quiz</a>
            ${quizData.score < quizData.totalQuestions ? 
              `<a href="${retryMissedUrl}" style="display: inline-block; background-color: #fd7e14; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Retry Missed Questions</a>` 
              : '<span style="display: inline-block; background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Perfect Score!</span>'
            }
          </div>
          
          <h2>Question Details</h2>
          ${questionsHtml}
          
          ${incorrectQuestionsHtml}
          
          <p>Keep practicing to improve your score!</p>
        `;

        // Determine email recipients
        const toEmails = [...RECIPIENT_EMAILS];

        // Add user email if provided and valid, and not already included
        if (
          emailAddress &&
          emailAddress.includes("@") &&
          !RECIPIENT_EMAILS.includes(emailAddress)
        ) {
          toEmails.push(emailAddress);
        }

        const to = toEmails.join(", ");

        // Create subject line with userName if available
        const subjectLine = (userName
          ? `${userName}'s :` : " ") + `${quizData.chapterId} Results - ${percentScore}% Score (${quizData.totalQuestions} questions)`

        const mailOptions = {
          from: process.env.EMAIL_USER || "app-email@gmail.com",
          to: to,
          subject: subjectLine,
          html: emailHtml,
        };

        // Send the email
        console.log(`Sending email to ${to}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId}`);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            message: "Quiz results sent successfully",
            messageId: info.messageId,
          })
        );
      } catch (error) {
        console.error("Error sending email:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Error sending email",
            message: error.message,
          })
        );
      }
    });
  } else {
    // Return 404 for any other endpoint
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Email server running on port ${PORT}`);
});
