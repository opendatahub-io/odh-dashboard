import type { ResponsesTemplate } from '~/app/types/autoragPattern';

export type SnippetCredentials = {
  hostname: string;
  apiKey: string;
};

const escapeShellDoubleQuote = (s: string): string =>
  s.replace(/[\\"$`!\n]/g, (c) => (c === '\n' ? '\\n' : `\\${c}`));

const escapeShellSingleQuote = (s: string): string => s.replace(/'/g, "'\\''");

const escapeDoubleQuotedString = (s: string): string =>
  s.replace(/[\\"]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

export const generateCurlSnippet = (
  template: ResponsesTemplate,
  credentials?: SnippetCredentials,
): string => {
  const hostname = credentials ? escapeShellDoubleQuote(credentials.hostname) : '<HOSTNAME>';
  const apiKey = credentials ? escapeShellDoubleQuote(credentials.apiKey) : '<API_KEY>';
  const body = escapeShellSingleQuote(JSON.stringify(template, null, 2));
  return `curl -X POST "https://${hostname}/v1/responses" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '${body}'`;
};

export const generateNodeSnippet = (
  template: ResponsesTemplate,
  credentials?: SnippetCredentials,
): string => {
  const hostname = credentials ? escapeDoubleQuotedString(credentials.hostname) : '<HOSTNAME>';
  const apiKey = credentials ? escapeDoubleQuotedString(credentials.apiKey) : '<API_KEY>';
  const body = JSON.stringify(template, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join('\n');
  return `// Build the JSON request body
const payload = ${body};

// Send a request to the Responses API
const response = await fetch("https://${hostname}/v1/responses", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${apiKey}",
  },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(30_000),
});

if (!response.ok) {
  const errorBody = await response.text();
  throw new Error(\`Request failed (\${response.status}): \${errorBody}\`);
}

const result = await response.json();
console.log(result.output ?? result);`;
};

export const generateGoSnippet = (
  template: ResponsesTemplate,
  credentials?: SnippetCredentials,
): string => {
  const hostname = credentials ? escapeDoubleQuotedString(credentials.hostname) : '<HOSTNAME>';
  const apiKey = credentials ? escapeDoubleQuotedString(credentials.apiKey) : '<API_KEY>';
  const body = JSON.stringify(template, null, 2)
    .split('\n')
    .map((line, i) =>
      i === 0 ? `\tpayload := []byte(${JSON.stringify(line)}` : `\t\t${JSON.stringify(line)}`,
    )
    .join(' +\n');
  const lines = [
    'package main',
    '',
    'import (',
    '\t"bytes"',
    '\t"fmt"',
    '\t"io"',
    '\t"net/http"',
    '\t"time"',
    ')',
    '',
    'func main() {',
    `${body})`,
    '',
    `\treq, err := http.NewRequest("POST", "https://${hostname}/v1/responses", bytes.NewBuffer(payload))`,
    '\tif err != nil {',
    '\t\tpanic(err)',
    '\t}',
    '',
    '\treq.Header.Set("Content-Type", "application/json")',
    `\treq.Header.Set("Authorization", "Bearer ${apiKey}")`,
    '',
    '\tclient := &http.Client{Timeout: 30 * time.Second}',
    '\tresp, err := client.Do(req)',
    '\tif err != nil {',
    '\t\tpanic(err)',
    '\t}',
    '\tdefer resp.Body.Close()',
    '',
    '\tbody, _ := io.ReadAll(resp.Body)',
    '\tif resp.StatusCode < 200 || resp.StatusCode >= 300 {',
    '\t\tpanic(fmt.Sprintf("request failed (%d): %s", resp.StatusCode, string(body)))',
    '\t}',
    '\tfmt.Println(string(body))',
    '}',
  ];
  return lines.join('\n');
};

const jsonToPython = (value: unknown, indent = 0): string => {
  const pad = '    '.repeat(indent);
  const innerPad = '    '.repeat(indent + 1);

  if (value === null || value === undefined) {
    return 'None';
  }
  if (typeof value === 'boolean') {
    return value ? 'True' : 'False';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    const items = value.map((v) => `${innerPad}${jsonToPython(v, indent + 1)}`).join(',\n');
    return `[\n${items},\n${pad}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return '{}';
    }
    const items = entries
      .map(([k, v]) => `${innerPad}${JSON.stringify(k)}: ${jsonToPython(v, indent + 1)}`)
      .join(',\n');
    return `{\n${items},\n${pad}}`;
  }
  return JSON.stringify(value);
};

export const generatePythonSnippet = (
  template: ResponsesTemplate,
  credentials?: SnippetCredentials,
): string => {
  const hostname = credentials ? escapeDoubleQuotedString(credentials.hostname) : '<HOSTNAME>';
  const apiKey = credentials ? escapeDoubleQuotedString(credentials.apiKey) : '<API_KEY>';
  const params = jsonToPython(template, 0);
  return `# Prerequisites: pip install requests

# Build the request payload
payload = ${params}

# Send a request to the Responses API
response = requests.post(
    "https://${hostname}/v1/responses",
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer ${apiKey}",
    },
    json=payload,
    timeout=30,
)
response.raise_for_status()

result = response.json()
print(result.get("output", result))`;
};
