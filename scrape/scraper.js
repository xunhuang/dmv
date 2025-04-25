// scraper.js
const fs = require('fs');
const https = require('https');
const { JSDOM } = require('jsdom');
const path = require('path');

// Base URL pattern to scrape
const baseUrlPattern = 'https://www.dmv-written-test.com/california/practice-test-{test}.html?page={page}';

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Function to get HTML from URL
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to load page, status code: ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        resolve(data);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Function to extract JSON-LD data from HTML
function extractJsonLd(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Find all script tags with type "application/ld+json"
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  const jsonLdContents = [];
  
  // Extract and parse JSON from each script tag
  jsonLdScripts.forEach((script) => {
    try {
      const jsonContent = JSON.parse(script.textContent);
      jsonLdContents.push(jsonContent);
    } catch (error) {
      console.warn('Failed to parse JSON-LD content:', error.message);
    }
  });
  
  return jsonLdContents;
}

// Process a single page of a test
async function processTestPage(testNum, pageNum) {
  const url = baseUrlPattern
    .replace('{test}', testNum)
    .replace('{page}', pageNum);
    
  console.log(`Fetching test ${testNum}, page ${pageNum}: ${url}`);
  
  try {
    const html = await fetchHTML(url);
    console.log(`Extracting JSON-LD data from test ${testNum}, page ${pageNum}...`);
    const jsonLdContents = extractJsonLd(html);
    
    // Save the raw JSON-LD data for this test/page
    const outputFile = path.join(outputDir, `test-${testNum}-page-${pageNum}-raw-jsonld.json`);
    fs.writeFileSync(outputFile, JSON.stringify(jsonLdContents, null, 2));
    console.log(`Saved raw JSON-LD data from test ${testNum}, page ${pageNum} to ${outputFile}`);
    
    return {
      test: testNum,
      page: pageNum,
      data: jsonLdContents
    };
  } catch (error) {
    console.error(`Error processing test ${testNum}, page ${pageNum}:`, error.message);
    return null;
  }
}

// Process all pages for a single test
async function processTest(testNum) {
  console.log(`Starting to process test ${testNum}...`);
  const testData = [];
  
  // Process pages 1 through 6 for this test
  for (let page = 1; page <= 6; page++) {
    const pageData = await processTestPage(testNum, page);
    if (pageData) {
      testData.push(pageData);
    }
    
    // Add a small delay between page requests
    if (page < 6) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }
  
  // Save combined data for this test
  const testOutputFile = path.join(outputDir, `test-${testNum}-all-pages.json`);
  fs.writeFileSync(testOutputFile, JSON.stringify(testData, null, 2));
  console.log(`Completed test ${testNum}. Data saved to ${testOutputFile}`);
  
  return testData;
}

// Main function
async function main() {
  try {
    console.log('Starting scraper for DMV practice tests 1-24, each with pages 1-6...');
    
    // Array to collect all data from all tests
    const allData = [];
    
    // Process tests 1 through 24
    for (let test = 1; test <= 24; test++) {
      const testData = await processTest(test);
      if (testData && testData.length > 0) {
        allData.push({
          test,
          pages: testData
        });
      }
      
      // Add a delay between tests to avoid overloading the server
      if (test < 24) {
        console.log(`Waiting before starting test ${test + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
      }
    }
    
    // Save combined data for all tests
    const combinedFile = path.join(outputDir, 'all-tests-all-pages.json');
    fs.writeFileSync(combinedFile, JSON.stringify(allData, null, 2));
    console.log(`Successfully scraped all tests. Combined data saved to ${combinedFile}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the script
main();