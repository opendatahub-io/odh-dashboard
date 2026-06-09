import type { ResponsesTemplate } from '~/app/types/autoragPattern';

export const generateCurlSnippet = (template: ResponsesTemplate): string => {
  const body = JSON.stringify(template, null, 2);
  return `curl -X POST https://<HOSTNAME>/v1/responses \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -d '${body}'`;
};

export const generateNodeSnippet = (template: ResponsesTemplate): string => {
  const body = JSON.stringify(template, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join('\n');
  return `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://<HOSTNAME>/v1",
  apiKey: "<API_KEY>",
});

const response = await client.responses.create(${body});

console.log(response.output);`;
};

export const generateGoSnippet = (template: ResponsesTemplate): string => {
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
    ')',
    '',
    'func main() {',
    `${body})`,
    '',
    '\treq, err := http.NewRequest("POST", "https://<HOSTNAME>/v1/responses", bytes.NewBuffer(payload))',
    '\tif err != nil {',
    '\t\tpanic(err)',
    '\t}',
    '',
    '\treq.Header.Set("Content-Type", "application/json")',
    '\treq.Header.Set("Authorization", "Bearer <API_KEY>")',
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

export const generatePythonSnippet = (template: ResponsesTemplate): string => {
  const params = jsonToPython(template, 0);
  return `from openai import OpenAI

client = OpenAI(
    base_url="https://<HOSTNAME>/v1",
    api_key="<API_KEY>",
)

params = ${params}

response = client.responses.create(**params)

print(response.output)`;
};
