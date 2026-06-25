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
  const body = JSON.stringify(template, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join('\n');

  const credentialSetup = credentials
    ? `const baseURL = "https://${escapeDoubleQuotedString(credentials.hostname)}";
const apiKey = "${escapeDoubleQuotedString(credentials.apiKey)}";`
    : `// Prerequisites: Node.js 18+, npm install @kubernetes/client-node
// Save as .mjs or add "type": "module" to package.json
import * as k8s from "@kubernetes/client-node";

// Loads kubeconfig from the default location (~/.kube/config or KUBECONFIG env var).
// Ensure you are logged in to the cluster (e.g. via "oc login") before running this script.
const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

// Fetch the OGX credentials from the Kubernetes secret
const secret = await k8sApi.readNamespacedSecret({
  name: "<SECRET_NAME>",
  namespace: "<NAMESPACE>",
});

// Secret values are base64-encoded; decode them to get the raw strings
const decode = (key) => Buffer.from(secret.data[key], "base64").toString();
const baseURL = decode("OGX_CLIENT_BASE_URL");
const apiKey = decode("OGX_CLIENT_API_KEY");`;

  return `${credentialSetup}

// Build the JSON request body
const payload = ${body};

// Send a request to the Responses API
const response = await fetch(\`\${baseURL}/v1/responses\`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": \`Bearer \${apiKey}\`,
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
  const params = jsonToPython(template, 0);

  const credentialSetup = credentials
    ? `base_url = "https://${escapeDoubleQuotedString(credentials.hostname)}"
api_key = "${escapeDoubleQuotedString(credentials.apiKey)}"`
    : `# Prerequisites: pip install kubernetes requests
import base64
import requests
from kubernetes import client, config

# Loads kubeconfig from the default location (~/.kube/config or KUBECONFIG env var).
# Ensure you are logged in to the cluster (e.g. via "oc login") before running this script.
config.load_config()
v1 = client.CoreV1Api()

# Fetch the OGX credentials from the Kubernetes secret
secret = v1.read_namespaced_secret("<SECRET_NAME>", "<NAMESPACE>")

# Secret values are base64-encoded; decode them to get the raw strings
base_url = base64.b64decode(secret.data["OGX_CLIENT_BASE_URL"]).decode()
api_key = base64.b64decode(secret.data["OGX_CLIENT_API_KEY"]).decode()`;

  return `${credentialSetup}

# Build the request payload
payload = ${params}

# Send a request to the Responses API
response = requests.post(
    f"{base_url}/v1/responses",
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    },
    json=payload,
    timeout=30,
)
response.raise_for_status()

result = response.json()
print(result.get("output", result))`;
};
