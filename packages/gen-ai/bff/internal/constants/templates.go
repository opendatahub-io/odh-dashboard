package constants

const PythonCodeTemplate = `# Llama Stack Quickstart Script
#
# README:
# This example shows how to configure an assistant using the Llama Stack client.
# Before using this code, make sure of the following:
#
# 1. Required Packages:
#    - Install the required dependencies using pip:
#      pip install llama-stack-client
#    - NOTE: Verify the correct llama-stack-client version for your Llama Stack server instance,
#      then install that version as needed.
#
# 2. Llama Stack Server:
#    - Your Llama Stack instance must be running and accessible
#    - Set the LLAMA_STACK_URL variable to the base URL of your Llama Stack server
#
# 3. Model Configuration:
#    - The selected model (e.g., "llama3.2:3b") must be available in your Llama Stack deployment with the correct API key.
#
# 4. Tools (MCP Integration):
#    - Any tools used must be properly pre-configured in your Llama Stack setup.
{{- if and .VectorStore .VectorStore.ID }}
#
# 5. External Vector Store:
#    - This script uses an existing vector store (ID: {{.VectorStore.ID}}), which must be registered in your Llama Stack instance.
#    - The vector store provider "{{.VectorStore.ProviderID}}" must be installed in your Llama Stack instance.
{{- if .VectorStore.EmbeddingModel }}
#    - The embedding model "{{.VectorStore.EmbeddingModel}}" must be registered in your Llama Stack instance.
{{- else }}
#    - The embedding model used by this vector store must be registered in your Llama Stack instance.
{{- end }}
{{- if .Prompt }}
#
# 6. Prompt Management (MLflow):
#    - Set the MLFLOW_TRACKING_URI variable to your MLflow server URL
#    - Set the MLFLOW_TRACKING_TOKEN variable to your OpenShift user token
#    - Set the MLFLOW_WORKSPACE variable to the namespace containing your prompt
#    - The prompt "{{.Prompt.Name}}" (version {{.Prompt.Version}}) must exist in that workspace
{{- end }}
{{- else }}
{{- if .Prompt }}
#
# 5. Prompt Management (MLflow):
#    - Set the MLFLOW_TRACKING_URI variable to your MLflow server URL
#    - Set the MLFLOW_TRACKING_TOKEN variable to your OpenShift user token
#    - Set the MLFLOW_WORKSPACE variable to the namespace containing your prompt
#    - The prompt "{{.Prompt.Name}}" (version {{.Prompt.Version}}) must exist in that workspace
{{- end }}
{{- end }}

# Configuration adjust as needed:
LLAMA_STACK_URL = ""
{{- if .Prompt }}
MLFLOW_TRACKING_URI = "{{if .MLflowExternalURL}}{{.MLflowExternalURL}}{{end}}"
MLFLOW_WORKSPACE = "{{if .Namespace}}{{.Namespace}}{{end}}"
MLFLOW_TRACKING_TOKEN = ""  # Your OpenShift user token
prompt_name = "{{.Prompt.Name}}"
prompt_version = {{.Prompt.Version}}
{{- end }}
FILES_BASE_PATH = ""
input_text = "{{.Input}}"
model_name = "{{.Model}}"
{{- if and .VectorStore .VectorStore.ID }}
vector_store_id = "{{.VectorStore.ID}}"
{{- else if .VectorStore }}
vector_store_name = "{{.VectorStore.Name}}"
{{- end }}
{{- if .Temperature }}
temperature = {{.Temperature}}
{{- end }}
{{- if .Stream }}
stream_enabled = True
{{- end }}
{{- if .Instructions }}
system_instructions = """{{.Instructions}}"""
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
{{- if .Prompt }}

import mlflow
from mlflow.tracking.request_header.registry import _request_header_provider_registry
from mlflow.tracking.request_header.abstract_request_header_provider import RequestHeaderProvider

def _make_workspace_header_provider(namespace):
    class _WorkspaceHeaderProvider(RequestHeaderProvider):
        def in_context(self):
            return True
        def request_headers(self):
            return {"X-MLFLOW-WORKSPACE": namespace}
    return _WorkspaceHeaderProvider

os.environ["MLFLOW_TRACKING_TOKEN"] = MLFLOW_TRACKING_TOKEN
mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
_request_header_provider_registry.register(_make_workspace_header_provider(MLFLOW_WORKSPACE))

prompt = mlflow.genai.load_prompt(f"prompts:/{prompt_name}/{prompt_version}")
system_instructions = next(m["content"] for m in prompt.format() if m["role"] == "system")
{{- end }}
{{- if and .VectorStore .VectorStore.ID }}

# Reference the existing external vector store by ID
vector_store = client.vector_stores.retrieve(vector_store_id=vector_store_id)
{{- else if .VectorStore }}

# Create vector store
vector_store = client.vector_stores.create(
    name=vector_store_name{{- if or .VectorStore.EmbeddingModel .VectorStore.EmbeddingDimension .VectorStore.ProviderID }},{{- end }}
    {{- if or .VectorStore.EmbeddingModel .VectorStore.EmbeddingDimension .VectorStore.ProviderID }}
    extra_body={
        {{- if .VectorStore.ProviderID }}
        "provider_id": "{{.VectorStore.ProviderID}}"{{- if or .VectorStore.EmbeddingModel .VectorStore.EmbeddingDimension }},
        {{- end }}
        {{- end }}
        {{- if .VectorStore.EmbeddingModel }}
        "embedding_model": "{{.VectorStore.EmbeddingModel}}"{{- if .VectorStore.EmbeddingDimension }},
        {{- end }}
        {{- end }}
        {{- if .VectorStore.EmbeddingDimension }}
        "embedding_dimension": {{.VectorStore.EmbeddingDimension}}
        {{- end }}
    }{{- end }}
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
      "server_url": "{{.ServerURL}}"{{- if .Authorization }},
      "authorization": "{{.Authorization}}"{{- end }}{{- if ne .AllowedTools nil }},
      "allowed_tools": [
        {{- range $i, $tool := .AllowedTools }}
        {{- if $i }},{{ end }}
        "{{$tool}}"{{- end }}
      ]{{- end }}
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
    "temperature": temperature{{- end }}{{- if or .Instructions .Prompt }},
    "instructions": system_instructions{{- end }}{{- if .Stream }},
    "stream": stream_enabled{{- end }}{{- if or .Tools .MCPServers }},
    "tools": tools{{- end }}
}

response = client.responses.create(**config)

print("agent>", response.output_text)
`
