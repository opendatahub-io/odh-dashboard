#!/usr/bin/env node

/**
 * HTML Report Generator for Model Registry Contract Tests
 * Generates a comprehensive HTML report with API details, similar to Cypress mochawesome reports
 */

/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import * as fs from 'fs';
import * as path from 'path';

// Type definitions
interface ApiCallHeaders {
  [key: string]: string;
}

// Type guards
function isApiCallHeaders(obj: unknown): obj is ApiCallHeaders {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Object.values(obj).every((value) => typeof value === 'string')
  );
}

function isRecord(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null;
}

interface ApiResponse {
  status: string | null;
  headers: ApiCallHeaders;
  body: Record<string, unknown>;
}

interface ApiError {
  status: string | null;
  headers: ApiCallHeaders;
  body: Record<string, unknown>;
}

interface ApiCall {
  timestamp: string;
  method: string;
  url: string;
  headers: ApiCallHeaders;
  response: ApiResponse | null;
  error: ApiError | null;
  testName: string;
}

interface TestResults {
  total: number;
  passed: number;
  failed: number;
  duration: string;
}

interface ParsedTestData {
  apiCalls: ApiCall[];
  testResults: TestResults;
}

// Get the test results directory from environment or use latest
const resultsDir =
  process.env.CONTRACT_TEST_RESULTS_DIR || './contract-tests/contract-test-results/latest';
const testOutputFile = path.join(resultsDir, 'contract-test-output.log');
const bffLogFile = path.join(resultsDir, 'bff-mock.log');
const htmlReportFile = path.join(resultsDir, 'contract-test-report-enhanced.html');

// Ensure results directory exists
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

/**
 * Parse test output for enhanced reporting
 */
function parseTestOutput(logContent: string): ParsedTestData {
  const apiCalls: ApiCall[] = [];
  const testResults: TestResults = {
    total: 0,
    passed: 0,
    failed: 0,
    duration: '0s',
  };

  const lines = logContent.split('\n');
  let currentApiCall: ApiCall | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Parse API calls - look for the 🌐 log pattern
    if (line.includes('🌐 [') && line.includes('] GET')) {
      const timestampMatch = line.match(/🌐 \[(.*?)\]/);
      const timestamp = timestampMatch ? timestampMatch[1] : '';
      const urlMatch = line.match(/] GET (.*?)$/);
      const url = urlMatch ? urlMatch[1].trim() : '';

      currentApiCall = {
        timestamp,
        method: 'GET',
        url,
        headers: {},
        response: null,
        error: null,
        testName: '',
      };
    }

    // Parse request headers - look for 📤 pattern followed by JSON
    if (line.includes('📤 Request Headers:') && currentApiCall) {
      const headerText = line.split('📤 Request Headers: ')[1];

      // Check if it's inline JSON (like "📤 Request Headers: {}")
      if (headerText && headerText.trim().length > 0) {
        try {
          const parsedHeaders = JSON.parse(headerText.trim());
          if (isApiCallHeaders(parsedHeaders)) {
            currentApiCall.headers = parsedHeaders;
          }
        } catch (e) {
          // If inline parsing fails, it might be multi-line JSON
          // Parse multi-line JSON starting from next line
          let jsonStr = headerText.trim(); // Start with what we have
          let braceCount = 0;

          // Count braces in the initial text
          for (const char of jsonStr) {
            if (char === '{') {
              braceCount++;
            }
            if (char === '}') {
              braceCount--;
            }
          }

          // If braces are balanced, try parsing now
          if (braceCount === 0) {
            try {
              const parsedHeaders = JSON.parse(jsonStr);
              if (isApiCallHeaders(parsedHeaders)) {
                currentApiCall.headers = parsedHeaders;
              }
            } catch (e2) {
              console.log(
                'Failed to parse inline request headers:',
                e2 instanceof Error ? e2.message : String(e2),
                jsonStr,
              );
            }
          } else {
            // Continue parsing multi-line JSON
            for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
              const nextLine = lines[j].trim();

              if (
                nextLine.includes('at logApiCall') ||
                nextLine.includes('at Object.<anonymous>')
              ) {
                break; // End of this log entry
              }

              jsonStr += nextLine;

              // Count braces to know when JSON object is complete
              for (const char of nextLine) {
                if (char === '{') {
                  braceCount++;
                }
                if (char === '}') {
                  braceCount--;
                }
              }

              if (braceCount === 0 && jsonStr.trim().length > 0) {
                try {
                  const parsedHeaders = JSON.parse(jsonStr);
                  if (isApiCallHeaders(parsedHeaders)) {
                    currentApiCall.headers = parsedHeaders;
                  }
                } catch (e3) {
                  console.log(
                    'Failed to parse multi-line request headers:',
                    e3 instanceof Error ? e3.message : String(e3),
                    jsonStr,
                  );
                }
                break;
              }
            }
          }
        }
      }
    }

    // Parse successful responses - look for 📥 pattern
    if (line.includes('📥 [') && line.includes('] Response for')) {
      if (currentApiCall) {
        const testNameMatch = line.match(/Response for "([^"]*)":/);
        currentApiCall.testName = testNameMatch ? testNameMatch[1] : '';
        currentApiCall.response = { status: null, headers: {}, body: {} };

        // Look ahead for response details
        for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
          const nextLine = lines[j].trim();

          if (nextLine.includes('📊 Status:')) {
            currentApiCall.response.status = nextLine.split('📊 Status: ')[1]?.trim() || null;
          }

          if (nextLine.includes('📋 Headers:')) {
            // Parse multi-line JSON for response headers
            let jsonStr = '';
            let braceCount = 0;
            let startedJson = false;

            for (let k = j + 1; k < Math.min(j + 10, lines.length); k++) {
              const jsonLine = lines[k].trim();

              if (
                jsonLine.includes('at logApiResponse') ||
                jsonLine.includes('📄 Response Body:')
              ) {
                break;
              }

              if (jsonLine.startsWith('{') || startedJson) {
                startedJson = true;
                jsonStr += jsonLine;

                for (const char of jsonLine) {
                  if (char === '{') {
                    braceCount++;
                  }
                  if (char === '}') {
                    braceCount--;
                  }
                }

                if (braceCount === 0 && jsonStr.trim().length > 0) {
                  try {
                    const parsedHeaders = JSON.parse(jsonStr);
                    if (isApiCallHeaders(parsedHeaders) && currentApiCall.response) {
                      currentApiCall.response.headers = parsedHeaders;
                    }
                  } catch (e) {
                    console.log(
                      'Failed to parse multi-line response headers:',
                      e instanceof Error ? e.message : String(e),
                    );
                  }
                  break;
                }
              }
            }
          }

          if (nextLine.includes('📄 Response Body:')) {
            const bodyText = nextLine.split('📄 Response Body: ')[1];

            if (bodyText && bodyText.trim().length > 0) {
              // Try inline JSON first
              try {
                const parsedBody = JSON.parse(bodyText.trim());
                if (isRecord(parsedBody) && currentApiCall.response) {
                  currentApiCall.response.body = parsedBody;
                }
              } catch (e) {
                // Parse multi-line JSON for response body
                let jsonStr = bodyText.trim();
                let braceCount = 0;

                for (const char of jsonStr) {
                  if (char === '{') {
                    braceCount++;
                  }
                  if (char === '}') {
                    braceCount--;
                  }
                }

                if (braceCount !== 0) {
                  for (let k = j + 1; k < Math.min(j + 10, lines.length); k++) {
                    const jsonLine = lines[k].trim();

                    if (
                      jsonLine.includes('at logApiResponse') ||
                      jsonLine.includes('⏱️  Response Time:')
                    ) {
                      break;
                    }

                    jsonStr += jsonLine;

                    for (const char of jsonLine) {
                      if (char === '{') {
                        braceCount++;
                      }
                      if (char === '}') {
                        braceCount--;
                      }
                    }

                    if (braceCount === 0 && jsonStr.trim().length > 0) {
                      try {
                        const parsedBody = JSON.parse(jsonStr);
                        if (isRecord(parsedBody) && currentApiCall.response) {
                          currentApiCall.response.body = parsedBody;
                        }
                      } catch (e2) {
                        console.log(
                          'Failed to parse multi-line response body:',
                          e2 instanceof Error ? e2.message : String(e2),
                          jsonStr,
                        );
                      }
                      break;
                    }
                  }
                }
              }
            }

            // This is the end of response parsing, add the call
            apiCalls.push({ ...currentApiCall });
            currentApiCall = null;
            break;
          }
        }
      }
    }

    // Parse error responses - look for ❌ pattern
    if (line.includes('❌ [') && line.includes('] Error for')) {
      if (currentApiCall) {
        const testNameMatch = line.match(/Error for "([^"]*)":/);
        currentApiCall.testName = testNameMatch ? testNameMatch[1] : '';
        currentApiCall.error = { status: null, headers: {}, body: {} };

        // Look ahead for error details
        for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
          const nextLine = lines[j].trim();

          if (nextLine.includes('📊 Error Status:')) {
            currentApiCall.error.status = nextLine.split('📊 Error Status: ')[1]?.trim() || null;
          }

          if (nextLine.includes('📋 Error Headers:')) {
            // Parse multi-line JSON for error headers
            let jsonStr = '';
            let braceCount = 0;
            let startedJson = false;

            for (let k = j + 1; k < Math.min(j + 10, lines.length); k++) {
              const jsonLine = lines[k].trim();

              if (jsonLine.includes('at logApiError') || jsonLine.includes('📄 Error Body:')) {
                break;
              }

              if (jsonLine.startsWith('{') || startedJson) {
                startedJson = true;
                jsonStr += jsonLine;

                for (const char of jsonLine) {
                  if (char === '{') {
                    braceCount++;
                  }
                  if (char === '}') {
                    braceCount--;
                  }
                }

                if (braceCount === 0 && jsonStr.trim().length > 0) {
                  try {
                    const parsedHeaders = JSON.parse(jsonStr);
                    if (isApiCallHeaders(parsedHeaders) && currentApiCall.error) {
                      currentApiCall.error.headers = parsedHeaders;
                    }
                  } catch (e) {
                    console.log(
                      'Failed to parse multi-line error headers:',
                      e instanceof Error ? e.message : String(e),
                    );
                  }
                  break;
                }
              }
            }
          }

          if (nextLine.includes('📄 Error Body:')) {
            const bodyText = nextLine.split('📄 Error Body: ')[1];

            if (bodyText && bodyText.trim().length > 0) {
              // Try inline JSON first
              try {
                const parsedBody = JSON.parse(bodyText.trim());
                if (isRecord(parsedBody) && currentApiCall.error) {
                  currentApiCall.error.body = parsedBody;
                }
              } catch (e) {
                // Parse multi-line JSON for error body
                let jsonStr = bodyText.trim();
                let braceCount = 0;

                for (const char of jsonStr) {
                  if (char === '{') {
                    braceCount++;
                  }
                  if (char === '}') {
                    braceCount--;
                  }
                }

                if (braceCount !== 0) {
                  for (let k = j + 1; k < Math.min(j + 10, lines.length); k++) {
                    const jsonLine = lines[k].trim();

                    if (jsonLine.includes('at logApiError')) {
                      break;
                    }

                    jsonStr += jsonLine;

                    for (const char of jsonLine) {
                      if (char === '{') {
                        braceCount++;
                      }
                      if (char === '}') {
                        braceCount--;
                      }
                    }

                    if (braceCount === 0 && jsonStr.trim().length > 0) {
                      try {
                        const parsedBody = JSON.parse(jsonStr);
                        if (isRecord(parsedBody) && currentApiCall.error) {
                          currentApiCall.error.body = parsedBody;
                        }
                      } catch (e2) {
                        console.log(
                          'Failed to parse multi-line error body:',
                          e2 instanceof Error ? e2.message : String(e2),
                          jsonStr,
                        );
                      }
                      break;
                    }
                  }
                }
              }
            }

            // This is the end of error parsing, add the call
            apiCalls.push({ ...currentApiCall });
            currentApiCall = null;
            break;
          }
        }
      }
    }

    // Parse test results summary
    if (line.includes('Test Suites:')) {
      // Handle different formats: "1 failed, 1 total" or "1 passed, 1 total"
      const failedMatch = line.match(/(\d+) failed/);
      const passedMatch = line.match(/(\d+) passed/);
      const totalMatch = line.match(/(\d+) total/);

      if (failedMatch) {
        testResults.failed = parseInt(failedMatch[1], 10);
      }
      if (passedMatch) {
        testResults.passed = parseInt(passedMatch[1], 10);
      }
      if (totalMatch) {
        testResults.total = parseInt(totalMatch[1], 10);
      }
    }

    if (line.includes('Tests:')) {
      // Format: "3 passed, 3 total" or "2 failed, 1 passed, 3 total"
      const failedMatch = line.match(/(\d+) failed/);
      const passedMatch = line.match(/(\d+) passed/);
      const totalMatch = line.match(/(\d+) total/);

      if (failedMatch) {
        testResults.failed = parseInt(failedMatch[1], 10);
      }
      if (passedMatch) {
        testResults.passed = parseInt(passedMatch[1], 10);
      }
      if (totalMatch) {
        testResults.total = parseInt(totalMatch[1], 10);
      }
    }

    if (line.includes('Time:')) {
      const timeMatch = line.match(/Time:\s+([\d.]+\s*s)/);
      if (timeMatch) {
        [, testResults.duration] = timeMatch;
      }
    }
  }

  console.log(`📊 Parsed ${apiCalls.length} API calls`);
  console.log('📈 Test Results:', testResults);

  return { apiCalls, testResults };
}

/**
 * Generate HTML report
 */
function generateHtmlReport(
  apiCalls: ApiCall[],
  testResults: TestResults,
  bffLogs: string,
): string {
  const timestamp = new Date().toISOString();
  const successRate =
    testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) : '0';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Model Registry Contract Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
            color: #333;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header h1 {
            margin: 0;
            font-size: 2.5rem;
            display: flex;
            align-items: center;
        }
        .header h1::before {
            content: "🔬";
            margin-right: 15px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-number {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .total { color: #6c757d; }
        .success-rate { color: #007bff; }
        
        .section {
            background: white;
            margin-bottom: 20px;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section-header {
            background: #f8f9fa;
            padding: 20px;
            border-bottom: 1px solid #dee2e6;
            font-size: 1.25rem;
            font-weight: 600;
            display: flex;
            align-items: center;
        }
        .section-content {
            padding: 20px;
        }
        
        .api-call {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            background: #fdfdfd;
        }
        .api-call.error {
            border-left: 4px solid #dc3545;
            background: #fff5f5;
        }
        .api-call.success {
            border-left: 4px solid #28a745;
            background: #f8fff8;
        }
        
        .api-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 15px;
        }
        .method {
            background: #007bff;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.875rem;
            font-weight: 600;
            margin-right: 10px;
        }
        .url {
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.875rem;
            flex: 1;
            color: #495057;
        }
        .timestamp {
            font-size: 0.75rem;
            color: #6c757d;
        }
        
        .json-display {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 15px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.875rem;
            overflow-x: auto;
            margin: 10px 0;
        }
        
        .error-details {
            background: #fff5f5;
            border: 1px solid #f8d7da;
            border-radius: 4px;
            padding: 15px;
            margin: 10px 0;
        }
        .error-status {
            font-weight: bold;
            color: #dc3545;
            margin-bottom: 10px;
        }
        
        .logs {
            background: #212529;
            color: #f8f9fa;
            padding: 20px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.875rem;
            border-radius: 5px;
            overflow-x: auto;
            white-space: pre-wrap;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #6c757d;
            border-top: 1px solid #dee2e6;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Model Registry Contract Test Report</h1>
        <p>Generated on ${timestamp}</p>
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="stat-number passed">${testResults.passed}</div>
            <div>Passed</div>
        </div>
        <div class="stat-card">
            <div class="stat-number failed">${testResults.failed}</div>
            <div>Failed</div>
        </div>
        <div class="stat-card">
            <div class="stat-number total">${testResults.total}</div>
            <div>Total Tests</div>
        </div>
        <div class="stat-card">
            <div class="stat-number success-rate">${successRate}%</div>
            <div>Success Rate</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${testResults.duration}</div>
            <div>Duration</div>
        </div>
    </div>

    <div class="section">
        <div class="section-header">
            🌐 API Contract Test Details
        </div>
        <div class="section-content">
            ${
              apiCalls.length === 0
                ? `
                <div class="api-call">
                    <p>⚠️ No API calls were parsed from the test output. This might indicate a parsing issue.</p>
                    <p>Check the console output of the HTML report generator for more details.</p>
                </div>
            `
                : apiCalls
                    .map(
                      (call) => `
                <div class="api-call ${call.error ? 'error' : 'success'}">
                    <div class="api-header">
                        <span class="method">${call.method}</span>
                        <span class="url">${call.url}</span>
                        <span class="timestamp">${call.timestamp}</span>
                    </div>
                    
                    ${call.testName ? `<h4>🧪 Test: ${call.testName}</h4>` : ''}
                    
                    <h5>📤 Request Headers:</h5>
                    <div class="json-display">${JSON.stringify(call.headers, null, 2)}</div>
                    
                    ${
                      call.error
                        ? `
                        <div class="error-details">
                            <div class="error-status">❌ HTTP ${
                              call.error.status ?? 'Unknown'
                            }</div>
                            <h5>📄 Error Response:</h5>
                            <div class="json-display">${JSON.stringify(
                              call.error.body,
                              null,
                              2,
                            )}</div>
                            ${
                              Object.keys(call.error.headers).length > 0
                                ? `
                                <h5>📋 Error Headers:</h5>
                                <div class="json-display">${JSON.stringify(
                                  call.error.headers,
                                  null,
                                  2,
                                )}</div>
                            `
                                : ''
                            }
                        </div>
                    `
                        : ''
                    }
                    
                    ${
                      call.response
                        ? `
                        <div class="success-details">
                            <div class="success-status" style="color: #28a745; font-weight: bold; margin-bottom: 10px;">✅ HTTP ${
                              call.response.status ?? 'Unknown'
                            }</div>
                            <h5>📥 Response Body:</h5>
                            <div class="json-display">${JSON.stringify(
                              call.response.body,
                              null,
                              2,
                            )}</div>
                            ${
                              Object.keys(call.response.headers).length > 0
                                ? `
                                <h5>📋 Response Headers:</h5>
                                <div class="json-display">${JSON.stringify(
                                  call.response.headers,
                                  null,
                                  2,
                                )}</div>
                            `
                                : ''
                            }
                        </div>
                    `
                        : ''
                    }
                </div>
            `,
                    )
                    .join('')
            }
        </div>
    </div>

    <div class="section">
        <div class="section-header">
            🖥️ Mock BFF Server Logs
        </div>
        <div class="section-content">
            <div class="logs">${bffLogs.replace(/\n/g, '<br>')}</div>
        </div>
    </div>

    <div class="footer">
        <p>📊 Model Registry Contract Tests | 🔬 OpenAPI Schema Validation | 🧪 Mock BFF Backend</p>
        <p>Generated by ODH Dashboard Contract Testing Framework</p>
    </div>
</body>
</html>
  `;

  return html;
}

// Main execution
try {
  console.log('📊 Generating Enhanced HTML Report...');

  // Read log files
  let testOutput = '';
  let bffLogs = '';

  if (fs.existsSync(testOutputFile)) {
    testOutput = fs.readFileSync(testOutputFile, 'utf8');
    console.log('✅ Test output loaded');
  } else {
    console.log('⚠️  No test output file found');
  }

  if (fs.existsSync(bffLogFile)) {
    bffLogs = fs.readFileSync(bffLogFile, 'utf8');
    console.log('✅ BFF logs loaded');
  } else {
    console.log('⚠️  No BFF log file found');
  }

  // Parse test data
  const { apiCalls, testResults } = parseTestOutput(testOutput);
  console.log(`📈 Parsed ${apiCalls.length} API calls`);

  // Generate HTML report
  const htmlContent = generateHtmlReport(apiCalls, testResults, bffLogs);
  fs.writeFileSync(htmlReportFile, htmlContent);

  console.log('🎉 Enhanced HTML Report generated!');
  console.log(`📁 Report location: ${path.resolve(htmlReportFile)}`);
  console.log(`🌐 Open in browser: file://${path.resolve(htmlReportFile)}`);
} catch (error) {
  console.error('❌ Error generating HTML report:', error);
  process.exit(1);
}
