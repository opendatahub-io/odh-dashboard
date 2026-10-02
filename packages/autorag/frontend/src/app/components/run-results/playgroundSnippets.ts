import type { ResponsesTemplate } from '~/app/types/autoragPattern';

export type SnippetParams = {
  template: ResponsesTemplate;
  namespace: string;
  dbSecretName: string;
  maasSecretName: string;
};

const dashboardTokenPlaceholder = '<DASHBOARD_TOKEN>';

const buildResponsesEndpoint = ({
  namespace,
  dbSecretName,
  maasSecretName,
}: SnippetParams): string => {
  const query = new URLSearchParams({ namespace, dbSecretName, maasSecretName });
  return `/autorag/api/v1/responses?${query.toString()}`;
};

const escapeShellSingleQuote = (s: string): string => s.replace(/'/g, "'\\''");

const escapeDoubleQuotedString = (s: string): string =>
  s.replace(/[\\"]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

export const generateCurlSnippet = ({ template, ...params }: SnippetParams): string => {
  const body = escapeShellSingleQuote(JSON.stringify(template, null, 2));
  const endpointPath = buildResponsesEndpoint({ template, ...params });
  return `# Set DASHBOARD_URL to the dashboard origin without a trailing slash.
DASHBOARD_URL="\${DASHBOARD_URL:-https://<DASHBOARD_HOST>}"
DASHBOARD_TOKEN="\${DASHBOARD_TOKEN:-${dashboardTokenPlaceholder}}"

curl -N -X POST "\${DASHBOARD_URL}${escapeDoubleQuotedString(endpointPath)}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer \${DASHBOARD_TOKEN}" \\
  -d '${body}'`;
};

export const generateNodeSnippet = ({ template, ...params }: SnippetParams): string => {
  const body = JSON.stringify(template, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join('\n');
  const endpointPath = escapeDoubleQuotedString(buildResponsesEndpoint({ template, ...params }));
  return `// Replace with a token that authenticates to the dashboard BFF
 const dashboardUrl = (process.env.DASHBOARD_URL ?? "https://<DASHBOARD_HOST>").replace(/\\/$/, "");
const dashboardToken = process.env.DASHBOARD_TOKEN ?? "${dashboardTokenPlaceholder}";
const endpointPath = "${endpointPath}";

// Build the JSON request body
const payload = ${body};

// Send the request to the AutoRAG BFF
const response = await fetch(\`\${dashboardUrl}\${endpointPath}\`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": \`Bearer \${dashboardToken}\`,
  },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(30_000),
});

if (!response.ok) {
  const errorBody = await response.text();
  throw new Error(\`Request failed (\${response.status}): \${errorBody}\`);
}

console.log(await response.text());`;
};

export const generateGoSnippet = ({ template, ...params }: SnippetParams): string => {
  const body = JSON.stringify(template, null, 2)
    .split('\n')
    .map((line, i) =>
      i === 0 ? `\tpayload := []byte(${JSON.stringify(line)}` : `\t\t${JSON.stringify(line)}`,
    )
    .join(' +\n');
  const endpointPath = escapeDoubleQuotedString(buildResponsesEndpoint({ template, ...params }));
  return `package main

import (
\t"bytes"
\t"fmt"
\t"io"
 \t"net/http"
 \t"os"
 \t"strings"
 \t"time"
)

func main() {
 \t// Set DASHBOARD_URL to the dashboard origin and DASHBOARD_TOKEN to a dashboard token.
 \tdashboardURL := os.Getenv("DASHBOARD_URL")
 \tif dashboardURL == "" {
 \t\tdashboardURL = "https://<DASHBOARD_HOST>"
 \t}
 \tdashboardURL = strings.TrimRight(dashboardURL, "/")
 \tdashboardToken := os.Getenv("DASHBOARD_TOKEN")
 \tif dashboardToken == "" {
 \t\tdashboardToken = "${dashboardTokenPlaceholder}"
 \t}
 \tendpointPath := "${endpointPath}"

\t// Build the JSON request body
${body})

 \treq, err := http.NewRequest("POST", dashboardURL+endpointPath, bytes.NewBuffer(payload))
\tif err != nil {
\t\tpanic(err)
\t}
\treq.Header.Set("Content-Type", "application/json")
\treq.Header.Set("Authorization", "Bearer "+dashboardToken)

\tclient := &http.Client{Timeout: 30 * time.Second}
\tresp, err := client.Do(req)
\tif err != nil {
\t\tpanic(err)
\t}
\tdefer resp.Body.Close()

\tbody, _ := io.ReadAll(resp.Body)
\tif resp.StatusCode < 200 || resp.StatusCode >= 300 {
\t\tpanic(fmt.Sprintf("request failed (%d): %s", resp.StatusCode, string(body)))
\t}
\tfmt.Println(string(body))
}`;
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
    const items = Object.entries(value)
      .map(([k, v]) => `${innerPad}${JSON.stringify(k)}: ${jsonToPython(v, indent + 1)}`)
      .join(',\n');
    return items ? `{\n${items},\n${pad}}` : '{}';
  }
  return JSON.stringify(value);
};

export const generatePythonSnippet = ({ template, ...params }: SnippetParams): string => {
  const body = jsonToPython(template);
  const endpointPath = escapeDoubleQuotedString(buildResponsesEndpoint({ template, ...params }));
  return `import requests
import os

# Set DASHBOARD_URL to the dashboard origin and DASHBOARD_TOKEN to a dashboard token.
dashboard_url = os.environ.get("DASHBOARD_URL", "https://<DASHBOARD_HOST>").rstrip("/")
dashboard_token = os.environ.get("DASHBOARD_TOKEN", "${dashboardTokenPlaceholder}")
endpoint_path = "${endpointPath}"

# Build the request payload
payload = ${body}

# Send the request to the AutoRAG BFF
response = requests.post(
    f"{dashboard_url}{endpoint_path}",
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {dashboard_token}",
    },
    json=payload,
    timeout=30,
)
response.raise_for_status()

print(response.text)`;
};
