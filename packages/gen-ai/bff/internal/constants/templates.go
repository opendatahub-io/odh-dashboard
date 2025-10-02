package constants

const PythonCodeTemplate = `# Llama Stack Quickstart Script
#
# README:
# This example shows how to configure an assistant using the Llama Stack client.
# Before using this code, make sure of the following:
#
# 1. Llama Stack Server:
#    - Your Llama Stack instance must be running and accessible
#    - Set the LLAMA_STACK_URL variable to the base URL of your Llama Stack server
#
# 2. Model Configuration:
#    - The selected model (e.g., "llama3.2:3b") must be available in your Llama Stack deployment.
#
# 3. Tools (MCP Integration):
#    - Any tools used must be properly pre-configured in your Llama Stack setup.

# Configuration adjust as needed:
LLAMA_STACK_URL = ""
FILES_BASE_PATH = ""
input_text = "{{.Input}}"
model_name = "{{.Model}}"
{{- if .VectorStore }}
vector_store_name = "{{.VectorStore.Name}}"
{{- end }}
{{- if .Temperature }}
temperature = {{.Temperature}}
{{- end }}
{{- if .Stream }}
stream_enabled = True
{{- end }}
{{- if .Instructions }}
system_instructions = "{{.Instructions}}"
{{- end }}
{{- if .Files }}
files_to_upload = [
  {{- range .Files }}
    { "file": "{{.File}}", "purpose": "{{.Purpose}}" },
  {{- end }}
]
{{- end }}

import os

from llama_stack_client import LlamaStackClient

client = LlamaStackClient(base_url=LLAMA_STACK_URL)
{{- if .VectorStore }}

# Create vector store
vector_store = client.vector_stores.create(
    name=vector_store_name{{- if .VectorStore.EmbeddingModel }},
    embedding_model="{{.VectorStore.EmbeddingModel}}"{{- end }}{{- if .VectorStore.EmbeddingDimension }},
    embedding_dimension={{.VectorStore.EmbeddingDimension}}{{- end }}{{- if .VectorStore.ProviderID }},
    provider_id="{{.VectorStore.ProviderID}}"{{- end }}
)
{{- end }}{{- if or .Tools .MCPServers }}
tools = [
  {{- if .Tools }}
  {{- range .Tools }}
    {
      "type": "{{.Type}}",
      "vector_store_ids": [
        {{- if and $.VectorStore $.VectorStore.Name }}
        vector_store.id
        {{- else }}
        {{- range $i, $e := .VectorStoreIDs }}{{ if $i }}, {{ end }}"{{$e}}"{{- end }}
        {{- end }}
      ]
    },
  {{- end }}
  {{- end }}
  {{- if .MCPServers }}
  {{- range .MCPServers }}
    {
      "type": "mcp",
      "server_label": "{{.ServerLabel}}",
      "server_url": "{{.ServerURL}}"{{- if .Headers }},
      "headers": {
        {{- range $key, $value := .Headers }}
        "{{$key}}": "{{$value}}",
        {{- end }}
      }{{- end }}
    },
  {{- end }}
  {{- end }}
]
{{- end }}

{{- if .Files }}

for file_info in files_to_upload:
    with open(os.path.join(FILES_BASE_PATH, file_info["file"]), 'rb') as file:
        uploaded_file = client.files.create(file=file, purpose=file_info["purpose"])
        client.vector_stores.files.create(
            vector_store_id=vector_store.id, 
            file_id=uploaded_file.id
        )
{{- end }}

config = {
    "input": input_text,
    "model": model_name{{- if .Temperature }},
    "temperature": temperature{{- end }}{{- if .Instructions }},
    "instructions": system_instructions{{- end }}{{- if .Stream }},
    "stream": stream_enabled{{- end }}{{- if or .Tools .MCPServers }},
    "tools": tools{{- end }}
}

response = client.responses.create(**config)

print("agent>", response.output_text)
`
