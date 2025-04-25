# DMV Practice Test Scraper

A simple Node.js script to scrape DMV practice test questions from https://www.dmv-written-test.com/california/practice-test-1.html.

## Setup

1. Install dependencies:
```
npm install
```

## Usage

Run the script:
```
npm start
```

The script will:
1. Fetch the DMV practice test page
2. Extract all questions, options, correct answers, and explanations
3. Save the data as a JSON file (`dmv-questions.json`)