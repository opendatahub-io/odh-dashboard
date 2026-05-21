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

export const generatePythonSnippet = (template: ResponsesTemplate): string => {
  const body = JSON.stringify(template, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : `    ${line}`))
    .join('\n');
  return `from openai import OpenAI

client = OpenAI(
    base_url="https://<HOSTNAME>/v1",
    api_key="<API_KEY>",
)

response = client.responses.create(**${body})

print(response.output)`;
};
