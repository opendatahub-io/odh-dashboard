// Disabled due to AI Generated code
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import * as fs from 'fs';
import * as path from 'path';

interface ApiCallHeaders {
  [key: string]: string;
}
function isApiCallHeaders(obj: unknown): obj is ApiCallHeaders {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Object.values(obj).every((v) => typeof v === 'string')
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

const resultsDir =
  process.env.CONTRACT_TEST_RESULTS_DIR || './contract-tests/contract-test-results/latest';
const testOutputFile = path.join(resultsDir, 'contract-test-output.log');
const bffLogFile = path.join(resultsDir, 'bff-mock.log');
const htmlReportFile = path.join(resultsDir, 'contract-test-report-enhanced.html');

if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

function parseTestOutput(logContent: string): ParsedTestData {
  const apiCalls: ApiCall[] = [];
  const testResults: TestResults = { total: 0, passed: 0, failed: 0, duration: '0s' };
  const lines = logContent.split('\n');
  let currentApiCall: ApiCall | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('🌐 [') && line.includes('] GET')) {
      const ts = (line.match(/🌐 \[(.*?)\]/) || [])[1] || '';
      const url = (line.match(/] GET (.*?)$/) || [])[1]?.trim() || '';
      currentApiCall = {
        timestamp: ts,
        method: 'GET',
        url,
        headers: {},
        response: null,
        error: null,
        testName: '',
      };
    }
    if (line.includes('📤 Request Headers:') && currentApiCall) {
      const headerText = line.split('📤 Request Headers: ')[1];
      if (headerText && headerText.trim().length > 0) {
        try {
          const parsed = JSON.parse(headerText.trim());
          if (isApiCallHeaders(parsed)) currentApiCall.headers = parsed;
        } catch {
          // ignore; best-effort parse
        }
      }
    }
    if (line.includes('📥 [') && line.includes('] Response for')) {
      if (currentApiCall) {
        currentApiCall.testName = (line.match(/Response for "([^"]*)":/) || [])[1] || '';
        currentApiCall.response = { status: null, headers: {}, body: {} };
        for (let j = i + 1; j < Math.min(i + 50, lines.length); j++) {
          const nl = lines[j].trim();
          if (nl.includes('📊 Status:'))
            currentApiCall.response.status = nl.split('📊 Status: ')[1]?.trim() || null;
          if (nl.includes('📋 Headers:')) {
            if (j + 1 < lines.length) {
              try {
                const parsed = JSON.parse(lines[j + 1].trim());
                if (isApiCallHeaders(parsed) && currentApiCall.response) {
                  currentApiCall.response.headers = parsed;
                }
              } catch {
                // ignore
              }
            }
          }
          if (nl.includes('📄 Response Body:')) {
            const bt = nl.split('📄 Response Body: ')[1];
            try {
              const parsed = JSON.parse((bt || '').trim());
              if (isRecord(parsed) && currentApiCall.response) {
                currentApiCall.response.body = parsed;
              }
            } catch {
              // ignore
            }
            apiCalls.push({ ...currentApiCall });
            currentApiCall = null;
            break;
          }
        }
      }
    }
    if (line.includes('❌ [') && line.includes('] Error for')) {
      if (currentApiCall) {
        currentApiCall.testName = (line.match(/Error for "([^"]*)":/) || [])[1] || '';
        currentApiCall.error = { status: null, headers: {}, body: {} };
        for (let j = i + 1; j < Math.min(i + 50, lines.length); j++) {
          const nl = lines[j].trim();
          if (nl.includes('📊 Error Status:'))
            currentApiCall.error.status = nl.split('📊 Error Status: ')[1]?.trim() || null;
          if (nl.includes('📋 Error Headers:')) {
            if (j + 1 < lines.length) {
              try {
                const parsed = JSON.parse(lines[j + 1].trim());
                if (isApiCallHeaders(parsed) && currentApiCall.error) {
                  currentApiCall.error.headers = parsed;
                }
              } catch {
                // ignore
              }
            }
          }
          if (nl.includes('📄 Error Body:')) {
            const bt = nl.split('📄 Error Body: ')[1];
            try {
              const parsed = JSON.parse((bt || '').trim());
              if (isRecord(parsed) && currentApiCall.error) {
                currentApiCall.error.body = parsed;
              }
            } catch {
              // ignore
            }
            apiCalls.push({ ...currentApiCall });
            currentApiCall = null;
            break;
          }
        }
      }
    }
    if (line.includes('Tests:')) {
      const [, failed] = line.match(/(\d+) failed/) || [];
      const [, passed] = line.match(/(\d+) passed/) || [];
      const [, total] = line.match(/(\d+) total/) || [];
      if (failed) testResults.failed = parseInt(failed, 10);
      if (passed) testResults.passed = parseInt(passed, 10);
      if (total) testResults.total = parseInt(total, 10);
    }
    if (line.includes('Time:')) {
      const [, duration] = line.match(/Time:\s+([\d.]+\s*s)/) || [];
      if (duration) testResults.duration = duration;
    }
  }
  return { apiCalls, testResults };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function generateHtmlReport(
  apiCalls: ApiCall[],
  testResults: TestResults,
  bffLogs: string,
): string {
  const timestamp = new Date().toISOString();
  const successRate =
    testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) : '0';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Contract Test Report</title></head><body>
  <h1>Contract Test Report</h1>
  <p>Generated: ${timestamp}</p>
  <h2>Results</h2>
  <ul><li>Passed: ${testResults.passed}</li><li>Failed: ${testResults.failed}</li><li>Total: ${
    testResults.total
  }</li><li>Success: ${successRate}%</li><li>Duration: ${testResults.duration}</li></ul>
  <h2>API Calls (${apiCalls.length})</h2>
  ${apiCalls
    .map((c) => {
      const body = escapeHtml(JSON.stringify(c.error?.body ?? c.response?.body ?? {}, null, 2));
      const method = escapeHtml(c.method);
      const url = escapeHtml(c.url);
      const label = c.testName ? `— ${escapeHtml(c.testName)}` : '';
      return `<div><strong>${method}</strong> ${url} ${label}<pre>${body}</pre></div>`;
    })
    .join('')}
  <h2>Mock BFF Logs</h2>
  <pre>${escapeHtml(bffLogs)}</pre>
  </body></html>`;
}

try {
  let testOutput = '';
  let bffLogs = '';
  if (fs.existsSync(testOutputFile)) testOutput = fs.readFileSync(testOutputFile, 'utf8');
  if (fs.existsSync(bffLogFile)) bffLogs = fs.readFileSync(bffLogFile, 'utf8');
  const { apiCalls, testResults } = parseTestOutput(testOutput);
  const htmlContent = generateHtmlReport(apiCalls, testResults, bffLogs);
  fs.writeFileSync(htmlReportFile, htmlContent);
  // eslint-disable-next-line no-console
  console.log(`Report generated: ${path.resolve(htmlReportFile)}`);
} catch (e) {
  // eslint-disable-next-line no-console
  console.error('Failed to generate report', e);
  process.exit(1);
}
