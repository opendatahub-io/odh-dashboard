package constants

const PythonCodeTemplate = `# Llama Stack Quickstart Script
#
# README:
# This example shows how to configure an assistant using the Llama Stack client.
# Before using this code, make sure of the following:
#
# Required Packages:
#    - Install the required dependencies using pip:
{{- if and .GuardrailConfig (or .GuardrailConfig.InputPrompt .GuardrailConfig.OutputPrompt) }}
#      pip install llama-stack-client requests
{{- else }}
#      pip install llama-stack-client
{{- end }}
#    - NOTE: Verify the correct llama-stack-client version for your Llama Stack server instance,
#      then install that version as needed.
#
# Llama Stack Server:
#    - Your Llama Stack instance must be running and accessible
#    - Set the LLAMA_STACK_URL variable to the base URL of your Llama Stack server
#
# Model Configuration:
#    - The selected model (e.g., "llama3.2:3b") must be available in your Llama Stack deployment with the correct API key.
#
# Tools (MCP Integration):
#    - Any tools used must be properly pre-configured in your Llama Stack setup.
{{- if and .GuardrailConfig (or .GuardrailConfig.InputPrompt .GuardrailConfig.OutputPrompt) }}
#
# NeMo Guardrails:
#    - Set NEMO_GUARDRAILS_URL to your NeMo Guardrails service URL
#    - Set NEMO_GUARDRAILS_OC_TOKEN to your OpenShift user token (run: oc whoami -t)
#    - Set GUARDRAIL_MODEL_ENDPOINT to your guardrail model's inference endpoint URL
#    - Set GUARDRAIL_API_KEY if your guardrail model endpoint requires authentication
{{- end }}
{{- if and .VectorStore .VectorStore.ID }}
#
# External Vector Store:
#    - This script uses an existing vector store (ID: {{.VectorStore.ID}}), which must be registered in your Llama Stack instance.
#    - The vector store provider "{{.VectorStore.ProviderID}}" must be installed in your Llama Stack instance.
{{- if .VectorStore.EmbeddingModel }}
#    - The embedding model "{{.VectorStore.EmbeddingModel}}" must be registered in your Llama Stack instance.
{{- else }}
#    - The embedding model used by this vector store must be registered in your Llama Stack instance.
{{- end }}
{{- end }}
{{- if .Prompt }}
#
# Prompt Management (MLflow):
#    - Set the MLFLOW_TRACKING_URI variable to your MLflow server URL
#    - Set the MLFLOW_TRACKING_TOKEN variable to your OpenShift user token
#    - Set the MLFLOW_WORKSPACE variable to the namespace containing your prompt
#    - The prompt "{{.Prompt.Name}}" (version {{.Prompt.Version}}) must exist in that workspace
{{- end }}

# Configuration adjust as needed:
LLAMA_STACK_URL = ""
{{- if and .GuardrailConfig (or .GuardrailConfig.InputPrompt .GuardrailConfig.OutputPrompt) }}
NEMO_GUARDRAILS_URL = "{{if .NemoGuardrailsURL}}{{.NemoGuardrailsURL}}{{end}}"
NEMO_GUARDRAILS_OC_TOKEN = ""  # Set to your OpenShift user token (oc whoami -t)
GUARDRAIL_MODEL_ENDPOINT = ""  # Set to your guardrail model's inference endpoint URL
GUARDRAIL_API_KEY = ""  # Set if your guardrail model endpoint requires authentication
# Strip provider prefix from model ID (e.g. "endpoint-1/mistral-7b" → "mistral-7b")
_guardrail_raw_model = "{{.GuardrailConfig.GuardrailModel}}"
GUARDRAIL_MODEL_NAME = _guardrail_raw_model.split("/", 1)[1] if "/" in _guardrail_raw_model else _guardrail_raw_model
{{- end }}
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
{{- if and .GuardrailConfig (or .GuardrailConfig.InputPrompt .GuardrailConfig.OutputPrompt) }}
import requests
{{- end }}

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

{{- if and .GuardrailConfig (or .GuardrailConfig.InputPrompt .GuardrailConfig.OutputPrompt) }}

def _guardrail_check(messages, rails, task, prompt_content):
    """Send a guardrail check to the NeMo Guardrails service and return the result."""
    payload = {
        "model": GUARDRAIL_MODEL_NAME,
        "messages": messages,
        "guardrails": {
            "config": {
                "models": [{
                    "type": "main",
                    "engine": "openai",
                    "parameters": {
                        "openai_api_base": GUARDRAIL_MODEL_ENDPOINT,
                        "model_name": GUARDRAIL_MODEL_NAME,
                        "api_key": GUARDRAIL_API_KEY or "fake",
                    },
                }],
                "rails": rails,
                "prompts": [{"task": task, "content": prompt_content}],
            },
        },
    }
    headers = {"Content-Type": "application/json"}
    if NEMO_GUARDRAILS_OC_TOKEN:
        headers["Authorization"] = f"Bearer {NEMO_GUARDRAILS_OC_TOKEN}"
    resp = requests.post(
        f"{NEMO_GUARDRAILS_URL}/v1/guardrail/checks",
        json=payload,
        headers=headers,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()

{{- end }}
{{- if and .GuardrailConfig .GuardrailConfig.InputPrompt }}

_input_result = _guardrail_check(
    messages=[{"role": "user", "content": input_text}],
    rails={"input": {"flows": ["self check input"]}},
    task="self_check_input",
    prompt_content={{printf "%q" .GuardrailConfig.InputPrompt}},
)
if _input_result.get("status") == "blocked":
    print("Input blocked by safety guardrails:", _input_result.get("guardrails_data", {}).get("error", ""))
    exit(1)

{{- end }}

response = client.responses.create(**config)
{{- if and .GuardrailConfig .GuardrailConfig.OutputPrompt }}

_output_result = _guardrail_check(
    messages=[{"role": "assistant", "content": response.output_text}],
    rails={"output": {"flows": ["self check output"]}},
    task="self_check_output",
    prompt_content={{printf "%q" .GuardrailConfig.OutputPrompt}},
)
if _output_result.get("status") == "blocked":
    print("Output blocked by safety guardrails:", _output_result.get("guardrails_data", {}).get("error", ""))
    exit(1)

{{- end }}

print("agent>", response.output_text)
`
