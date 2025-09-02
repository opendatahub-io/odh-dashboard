package constants

const PythonCodeTemplate = `# Llama Stack Quickstart Script
#
# README:
# This example shows how to configure a assistant using the Llama Stack client.
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
input_text = "{{.Input}}"
model_name = "{{.Model}}"{{if .Temperature}}
temperature = {{.Temperature}}{{end}}{{if .Stream}}
stream_enabled = True{{end}}{{if .Instructions}}
system_instructions = "{{.Instructions}}"{{end}}{{if .Tools}}

# Tool configuration
tools = [
{{range .Tools}}    {
        "type": "{{.Type}}",
        "vector_store_ids": [{{range .VectorStoreIDs}}"{{.}}",{{end}}]
    },{{end}}
]{{end}}

from llama_stack_client import LlamaStackClient

client = LlamaStackClient(base_url=LLAMA_STACK_URL)

config = {
    "input": input_text,
    "model": model_name{{if .Temperature}},
    "temperature": temperature{{end}}{{if .Stream}},
    "stream": stream_enabled{{end}}{{if .Instructions}},
    "instructions": system_instructions{{end}}{{if .Tools}},
    "tools": tools{{end}}
}

response = client.responses.create(**config)

print("agent>", response.output_text)
`
