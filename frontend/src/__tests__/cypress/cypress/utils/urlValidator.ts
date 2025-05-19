import * as http from 'http';
import * as https from 'https';
// eslint-disable-next-line @typescript-eslint/no-var-requires, import/no-extraneous-dependencies
const HttpsProxyAgent: new (options: string | object) => https.Agent = require('https-proxy-agent');

const commonUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36';
const maxRedirects = 5;
const requestTimeout = 30000; // 30 seconds

const makeRequest = (
  urlToTest: string,
  proxyUrlFromTask?: string,
  redirectCount = 0,
): Promise<{ url: string; status: number; error?: string }> => {
  return new Promise((resolve) => {
    let resolved = false; // Flag to prevent double resolving

    const doResolve = (codeValue: number, errorMessage?: string) => {
      if (!resolved) {
        resolved = true;
        // If an errorMessage is present, it signifies an issue (e.g., network error, timeout)
        // that prevented obtaining a standard HTTP status, or a specific condition like 'too many redirects'.
        // In these cases, status will be reported as 0.
        // Actual HTTP status codes (e.g., 200, 404) are passed as codeValue when errorMessage is undefined.
        const reportedStatus = errorMessage ? 0 : codeValue;
        resolve({ url: urlToTest, status: reportedStatus, error: errorMessage });
      }
    };

    if (redirectCount > maxRedirects) {
      doResolve(-2, 'Too many redirects'); // Will set status to 0 due to errorMessage
      return;
    }

    const effectiveProxyUrl =
      proxyUrlFromTask || process.env.https_proxy || process.env.HTTPS_PROXY;
    let agent: http.Agent | undefined;

    if (effectiveProxyUrl && urlToTest.startsWith('https')) {
      try {
        agent = new HttpsProxyAgent(effectiveProxyUrl);
      } catch (e: unknown) {
        // Failed to create HttpsProxyAgent.
        // The request might proceed without a proxy or fail later.
        // Propagating this as a resolution error.
        doResolve(0, e instanceof Error ? e.message : 'Failed to create proxy agent');
        return;
      }
    }

    const protocol = urlToTest.startsWith('https') ? https : http;
    const options: http.RequestOptions = {
      timeout: requestTimeout,
      headers: {
        'User-Agent': commonUserAgent,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    };
    if (agent) {
      options.agent = agent;
    }

    const req = protocol.get(urlToTest, options, (res: http.IncomingMessage) => {
      const statusCode = res.statusCode || 0; // Default to 0 if statusCode is undefined
      const { location } = res.headers;

      if (statusCode >= 300 && statusCode < 400 && location) {
        let nextUrl = location;
        try {
          const currentUrl = new URL(urlToTest);
          nextUrl = new URL(location, currentUrl.origin).toString();
        } catch (e: unknown) {
          doResolve(-3, e instanceof Error ? e.message : 'Invalid redirect URL'); // Will set status to 0
          return;
        }
        res.resume();
        makeRequest(nextUrl, proxyUrlFromTask, redirectCount + 1)
          .then((finalResult) => {
            if (!resolved) {
              resolved = true;
              // Pass through the final result from the redirect chain.
              // If finalResult has an error, its status (due to doResolve) would be 0.
              // If it's a success, its status will be the HTTP status.
              resolve({ url: urlToTest, status: finalResult.status, error: finalResult.error });
            }
          })
          .catch((err) => {
            // This catch is for promise rejections from the recursive makeRequest call.
            doResolve(0, err?.message || 'Error in redirect chain'); // Explicitly status 0 for this error
          });
      } else {
        // Consume data to trigger 'end'. This is necessary for the 'end' event to fire.
        res.on('data', () => {
          /* consume stream */
        });
        res.on('end', () => {
          doResolve(statusCode); // If no errorMessage, status will be statusCode
        });
        res.on('aborted', () => {
          doResolve(-4, 'Response aborted by the server'); // Will set status to 0
        });
      }
    });

    req.on('error', (err: Error & { code?: string; errors?: Array<Error & { code?: string }> }) => {
      let clientErrorMessage = err.message;
      if (err.code) {
        clientErrorMessage = `Code: ${err.code} - ${err.message}`;
      }
      // Check for .errors property if err.name suggests an AggregateError.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (err.name === 'AggregateError' && Array.isArray(err.errors)) {
        clientErrorMessage = err.errors
          .map((e) => `(Code: ${e.code || 'N/A'} - ${e.message})`)
          .join('; ');
      }
      doResolve(-5, clientErrorMessage); // Will set status to 0
    });

    req.on('timeout', () => {
      req.destroy(); // Important to destroy the request on timeout
      doResolve(-1, `Request timed out after ${requestTimeout}ms`); // Will set status to 0
    });
  });
};

export async function validateHttpsUrls(
  urls: string[],
  proxyUrlFromTask?: string,
): Promise<{ url: string; status: number; error?: string }[]> {
  const promises = urls.map((url) => makeRequest(url, proxyUrlFromTask));
  return Promise.all(promises);
}
