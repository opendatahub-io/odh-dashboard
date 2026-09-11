import type { ResponsesTemplate } from '~/app/types/autoragPattern';

export type SnippetCredentials = {
  hostname: string;
  apiKey: string;
};

export type SnippetParams = {
  template: ResponsesTemplate;
  secretName: string;
  namespace: string;
};

const escapeShellDoubleQuote = (s: string): string =>
  s.replace(/[\\"$`!\n]/g, (c) => (c === '\n' ? '\\n' : `\\${c}`));

const escapeShellSingleQuote = (s: string): string => s.replace(/'/g, "'\\''");

const escapeDoubleQuotedString = (s: string): string =>
  s.replace(/[\\"]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

export const generateCurlSnippet = (
  { template, secretName, namespace }: SnippetParams,
  credentials?: SnippetCredentials,
): string => {
  const body = escapeShellSingleQuote(JSON.stringify(template, null, 2));
  if (credentials) {
    const hostname = escapeShellDoubleQuote(credentials.hostname);
    const apiKey = escapeShellDoubleQuote(credentials.apiKey);
    const authHeader = apiKey ? `  -H "Authorization: Bearer ${apiKey}" \\\n` : '';
    return `curl -X POST "https://${hostname}/v1/responses" \\
  -H "Content-Type: application/json" \\
${authHeader}  -d '${body}'`;
  }
  return `MAAS_BASE_URL=$(oc get secret ${secretName} -n ${namespace} \\
  -o jsonpath='{.data.MAAS_BASE_URL}' | base64 -d)
MAAS_API_KEY=$(oc get secret ${secretName} -n ${namespace} \\
  -o jsonpath='{.data.MAAS_API_KEY}' | base64 -d)

curl -X POST "\${MAAS_BASE_URL}/v1/responses" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer \${MAAS_API_KEY}" \\
  -d '${body}'`;
};

export const generateNodeSnippet = (
  { template, secretName, namespace }: SnippetParams,
  credentials?: SnippetCredentials,
): string => {
  const body = JSON.stringify(template, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join('\n');
  if (credentials) {
    const hostname = escapeDoubleQuotedString(credentials.hostname);
    const apiKey = escapeDoubleQuotedString(credentials.apiKey);
    const authHeader = apiKey ? `\n    "Authorization": "Bearer ${apiKey}",` : '';
    return `// Build the JSON request body
const payload = ${body};

// Send a request to the Responses API
const response = await fetch("https://${hostname}/v1/responses", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",${authHeader}
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
  }
  return `// Prerequisites: Node.js 18+, npm install @kubernetes/client-node
// Save as .mjs or add "type": "module" to package.json
import * as k8s from "@kubernetes/client-node";

// Loads kubeconfig from the default location (~/.kube/config or KUBECONFIG env var).
// Ensure you are logged in to the cluster (e.g. via "oc login") before running this script.
const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

// Fetch the MaaS credentials from the Kubernetes secret
const secret = await k8sApi.readNamespacedSecret({
  name: "${secretName}",
  namespace: "${namespace}",
});

// Secret values are base64-encoded; decode them to get the raw strings
const decode = (key) => {
  const raw = secret.data?.[key];
  if (!raw) {
    return "";
  }
  return Buffer.from(raw, "base64").toString();
};
const baseURL = decode("MAAS_BASE_URL");
const apiKey = decode("MAAS_API_KEY");
const headers = { "Content-Type": "application/json" };
if (apiKey) {
  headers.Authorization = \`Bearer \${apiKey}\`;
}

// Build the JSON request body
const payload = ${body};

// Send a request to the Responses API
const response = await fetch(\`\${baseURL}/v1/responses\`, {
  method: "POST",
  headers,
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
  { template, secretName, namespace }: SnippetParams,
  credentials?: SnippetCredentials,
): string => {
  const body = JSON.stringify(template, null, 2)
    .split('\n')
    .map((line, i) =>
      i === 0 ? `\tpayload := []byte(${JSON.stringify(line)}` : `\t\t${JSON.stringify(line)}`,
    )
    .join(' +\n');
  if (credentials) {
    const hostname = escapeDoubleQuotedString(credentials.hostname);
    const apiKey = escapeDoubleQuotedString(credentials.apiKey);
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
      '\t// Build the JSON request body',
      `${body})`,
      '',
      `\tbaseURL := "https://${hostname}"`,
      `\tapiKey := "${apiKey}"`,
      '',
      '\t// Send a POST request to the Responses API',
      '\treq, err := http.NewRequest("POST", baseURL+"/v1/responses", bytes.NewBuffer(payload))',
      '\tif err != nil {',
      '\t\tpanic(err)',
      '\t}',
      '',
      '\treq.Header.Set("Content-Type", "application/json")',
      '\treq.Header.Set("Authorization", "Bearer "+apiKey)',
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
  }
  const lines = [
    '// Prerequisites: go get k8s.io/client-go k8s.io/apimachinery',
    'package main',
    '',
    'import (',
    '\t"bytes"',
    '\t"context"',
    '\t"fmt"',
    '\t"io"',
    '\t"net/http"',
    '\t"time"',
    '',
    '\tmetav1 "k8s.io/apimachinery/pkg/apis/meta/v1"',
    '\t"k8s.io/client-go/kubernetes"',
    '\t"k8s.io/client-go/tools/clientcmd"',
    ')',
    '',
    'func main() {',
    '\t// Loads kubeconfig from the default location (~/.kube/config or KUBECONFIG env var).',
    '\t// Ensure you are logged in to the cluster (e.g. via "oc login") before running this script.',
    '\trules := clientcmd.NewDefaultClientConfigLoadingRules()',
    '\tconfig, err := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(rules, nil).ClientConfig()',
    '\tif err != nil {',
    '\t\tpanic(err)',
    '\t}',
    '',
    '\tclientset, err := kubernetes.NewForConfig(config)',
    '\tif err != nil {',
    '\t\tpanic(err)',
    '\t}',
    '',
    '\t// Fetch the MaaS credentials from the Kubernetes secret',
    `\tsecret, err := clientset.CoreV1().Secrets("${namespace}").Get(context.Background(), "${secretName}", metav1.GetOptions{})`,
    '\tif err != nil {',
    '\t\tpanic(err)',
    '\t}',
    '',
    '\t// secret.Data values are already raw bytes (the K8s client decodes base64 automatically)',
    '\tbaseURL := string(secret.Data["MAAS_BASE_URL"])',
    '\tapiKey := string(secret.Data["MAAS_API_KEY"])',
    '',
    '\t// Build the JSON request body',
    `${body})`,
    '',
    '\t// Send a POST request to the Responses API',
    '\treq, err := http.NewRequest("POST", baseURL+"/v1/responses", bytes.NewBuffer(payload))',
    '\tif err != nil {',
    '\t\tpanic(err)',
    '\t}',
    '',
    '\treq.Header.Set("Content-Type", "application/json")',
    '\treq.Header.Set("Authorization", "Bearer "+apiKey)',
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
  { template, secretName, namespace }: SnippetParams,
  credentials?: SnippetCredentials,
): string => {
  const params = jsonToPython(template, 0);
  if (credentials) {
    const hostname = escapeDoubleQuotedString(credentials.hostname);
    const apiKey = escapeDoubleQuotedString(credentials.apiKey);
    const authHeader = apiKey ? `\n        "Authorization": "Bearer ${apiKey}",` : '';
    return `import requests

base_url = "https://${hostname}"

# Build the request payload
payload = ${params}

# Send a request to the Responses API
response = requests.post(
    f"{base_url}/v1/responses",
    headers={
        "Content-Type": "application/json",${authHeader}
    },
    json=payload,
    timeout=30,
)
response.raise_for_status()

result = response.json()
print(result.get("output", result))`;
  }
  return `# Prerequisites: pip install kubernetes requests
import base64
import requests
from kubernetes import client, config

# Loads kubeconfig from the default location (~/.kube/config or KUBECONFIG env var).
# Ensure you are logged in to the cluster (e.g. via "oc login") before running this script.
config.load_config()
v1 = client.CoreV1Api()

# Fetch the MaaS credentials from the Kubernetes secret
secret = v1.read_namespaced_secret("${secretName}", "${namespace}")

# Secret values are base64-encoded; decode them to get the raw strings
def decode_secret(name):
    raw = (secret.data or {}).get(name)
    if not raw:
        return ""
    return base64.b64decode(raw).decode()

base_url = decode_secret("MAAS_BASE_URL")
api_key = decode_secret("MAAS_API_KEY")
headers = {"Content-Type": "application/json"}
if api_key:
    headers["Authorization"] = f"Bearer {api_key}"

# Build the request payload
payload = ${params}

# Send a request to the Responses API
response = requests.post(
    f"{base_url}/v1/responses",
    headers=headers,
    json=payload,
    timeout=30,
)
response.raise_for_status()

result = response.json()
print(result.get("output", result))`;
};
