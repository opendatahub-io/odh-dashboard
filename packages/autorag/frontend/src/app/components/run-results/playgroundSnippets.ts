import type { ResponsesTemplate } from '~/app/types/autoragPattern';

type SnippetParams = {
  template: ResponsesTemplate;
  secretName: string;
  namespace: string;
};

export const generateCurlSnippet = ({ template, secretName, namespace }: SnippetParams): string => {
  const body = JSON.stringify(template, null, 2);
  return `OGX_CLIENT_BASE_URL=$(oc get secret ${secretName} -n ${namespace} \\
  -o jsonpath='{.data.OGX_CLIENT_BASE_URL}' | base64 -d)
OGX_CLIENT_API_KEY=$(oc get secret ${secretName} -n ${namespace} \\
  -o jsonpath='{.data.OGX_CLIENT_API_KEY}' | base64 -d)

curl -X POST "\${OGX_CLIENT_BASE_URL}/v1/responses" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer \${OGX_CLIENT_API_KEY}" \\
  -d '${body}'`;
};

export const generateNodeSnippet = ({ template, secretName, namespace }: SnippetParams): string => {
  const body = JSON.stringify(template, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join('\n');
  return `// Prerequisites: npm install openai @kubernetes/client-node
// Save as .mjs or add "type": "module" to package.json
import OpenAI from "openai";
import * as k8s from "@kubernetes/client-node";

// Loads kubeconfig from the default location (~/.kube/config or KUBECONFIG env var).
// Ensure you are logged in to the cluster (e.g. via "oc login") before running this script.
const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

// Fetch the OGX credentials from the Kubernetes secret
const secret = await k8sApi.readNamespacedSecret({
  name: "${secretName}",
  namespace: "${namespace}",
});

// Secret values are base64-encoded; decode them to get the raw strings
const decode = (key) => Buffer.from(secret.data[key], "base64").toString();
const baseURL = decode("OGX_CLIENT_BASE_URL");
const apiKey = decode("OGX_CLIENT_API_KEY");

// Initialize the OpenAI client pointing to the OGX endpoint
const client = new OpenAI({
  baseURL: \`\${baseURL}/v1\`,
  apiKey,
});

// Send a request to the Responses API
const response = await client.responses.create(${body});

console.log(response.output);`;
};

export const generateGoSnippet = ({ template, secretName, namespace }: SnippetParams): string => {
  const body = JSON.stringify(template, null, 2)
    .split('\n')
    .map((line, i) =>
      i === 0 ? `\tpayload := []byte(${JSON.stringify(line)}` : `\t\t${JSON.stringify(line)}`,
    )
    .join(' +\n');
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
    '\t// Fetch the OGX credentials from the Kubernetes secret',
    `\tsecret, err := clientset.CoreV1().Secrets("${namespace}").Get(context.Background(), "${secretName}", metav1.GetOptions{})`,
    '\tif err != nil {',
    '\t\tpanic(err)',
    '\t}',
    '',
    '\t// secret.Data values are already raw bytes (the K8s client decodes base64 automatically)',
    '\tbaseURL := string(secret.Data["OGX_CLIENT_BASE_URL"])',
    '\tapiKey := string(secret.Data["OGX_CLIENT_API_KEY"])',
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
    '\tresp, err := http.DefaultClient.Do(req)',
    '\tif err != nil {',
    '\t\tpanic(err)',
    '\t}',
    '\tdefer resp.Body.Close()',
    '',
    '\tbody, _ := io.ReadAll(resp.Body)',
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

export const generatePythonSnippet = ({
  template,
  secretName,
  namespace,
}: SnippetParams): string => {
  const params = jsonToPython(template, 0);
  return `# Prerequisites: pip install openai kubernetes
import base64
from kubernetes import client, config
from openai import OpenAI

# Loads kubeconfig from the default location (~/.kube/config or KUBECONFIG env var).
# Ensure you are logged in to the cluster (e.g. via "oc login") before running this script.
config.load_config()
v1 = client.CoreV1Api()

# Fetch the OGX credentials from the Kubernetes secret
secret = v1.read_namespaced_secret("${secretName}", "${namespace}")

# Secret values are base64-encoded; decode them to get the raw strings
base_url = base64.b64decode(secret.data["OGX_CLIENT_BASE_URL"]).decode()
api_key = base64.b64decode(secret.data["OGX_CLIENT_API_KEY"]).decode()

# Initialize the OpenAI client pointing to the OGX endpoint
openai_client = OpenAI(
    base_url=f"{base_url}/v1",
    api_key=api_key,
)

# Send a request to the Responses API
params = ${params}

response = openai_client.responses.create(**params)

print(response.output)`;
};
