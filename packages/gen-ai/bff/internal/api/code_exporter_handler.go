package api

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
)

type CodeExportEnvelope = Envelope[models.CodeExportResponse, None]

func (app *App) CodeExporterHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	// Parse the request body using models.CodeExportRequest directly
	var configRequest models.CodeExportRequest
	if err := app.ReadJSON(w, r, &configRequest); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Validate all parameters
	if err := app.validateCodeExportRequest(configRequest); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	namespace, _ := r.Context().Value(constants.NamespaceQueryParameterKey).(string)

	// Generate Python code based on the config
	pythonCode, err := app.generatePythonCode(configRequest, namespace, app.repositories.Template)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Create response with envelope
	response := CodeExportEnvelope{
		Data: models.CodeExportResponse{
			Code: pythonCode,
		},
	}

	// Return JSON response with envelope structure
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}

// codeExportTemplateData wraps CodeExportRequest with server-injected fields
// that are not provided by the client (e.g. discovered URLs).
type codeExportTemplateData struct {
	models.CodeExportRequest
	MLflowExternalURL string
	NemoGuardrailsURL string
	Namespace         string
}

// generatePythonCode creates Python code based on the code export request
func (app *App) generatePythonCode(config models.CodeExportRequest, namespace string, templateRepo *repositories.TemplateRepository) (string, error) {
	// Parse the Python template if not already parsed
	if err := templateRepo.ParseTemplate("python", constants.PythonCodeTemplate); err != nil {
		return "", fmt.Errorf("failed to initialize Python template: %w", err)
	}

	// View Code talks to the model API directly. Drop a vLLM provider prefix
	// (vllm-inference-1/model -> model). Keep genai-bff-proxy/... for OGX routing.
	config.Model = modelNameForCodeExport(config.Model)

	// Execute the template with config data, injecting server-side fields
	result, err := templateRepo.ExecuteTemplate("python", codeExportTemplateData{
		CodeExportRequest: config,
		MLflowExternalURL: app.mlflowExternalURL,
		NemoGuardrailsURL: app.nemoGuardrailsURL,
		Namespace:         namespace,
	})
	if err != nil {
		return "", fmt.Errorf("failed to generate Python code: %w", err)
	}

	return result, nil
}


// modelNameForCodeExport returns the model id the exported script must send.
// "vllm-inference-1/deepseek-r1" -> "deepseek-r1"
// "vllm-inference-1/facebook/opt-125m" -> "facebook/opt-125m"
// "genai-bff-proxy/llama-32-1b-instruct" is left unchanged.
func modelNameForCodeExport(model string) string {
	if strings.HasPrefix(model, constants.PassthroughProviderID+"/") {
		return model
	}
	for _, prefix := range []string{"maas-vllm-inference-", "vllm-inference-"} {
		if !strings.HasPrefix(model, prefix) {
			continue
		}
		rest := model[len(prefix):]
		slash := strings.Index(rest, "/")
		if slash > 0 && isAllDigits(rest[:slash]) {
			return rest[slash+1:]
		}
	}
	return model
}

func isAllDigits(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

// validateCodeExportRequest validates all parameters in the code export request
func (app *App) validateCodeExportRequest(config models.CodeExportRequest) error {
	// Validate required fields
	if config.Input == "" {
		return errors.New("input is required")
	}
	if config.Model == "" {
		return errors.New("model is required")
	}

	// Validate temperature range (0.0-2.0)
	if config.Temperature != nil && (*config.Temperature < 0.0 || *config.Temperature > 2.0) {
		return errors.New("temperature must be between 0.0 and 2.0")
	}

	// Validate MCP servers
	for i, server := range config.MCPServers {
		if server.ServerLabel == "" {
			return fmt.Errorf("MCP server %d: server_label is required", i)
		}
		if server.ServerURL == "" {
			return fmt.Errorf("MCP server %d: server_url is required", i)
		}
	}

	// Validate prompt config
	if config.Prompt != nil {
		if config.Prompt.Name == "" {
			return errors.New("prompt: name is required")
		}
		if config.Prompt.Version < 1 {
			return errors.New("prompt: version must be >= 1")
		}
	}

	return nil
}
