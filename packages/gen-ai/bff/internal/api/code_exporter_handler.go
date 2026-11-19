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

	// View Code calls OGX directly, so use the same qualified id the Playground
	// sends (genai-bff-proxy/...). A namespace vLLM prefix is removed first.
	// A MaaS id keeps the maas- discriminator the proxy uses to pick MaaS.
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

// modelNameForCodeExport returns the model id the exported script must send to OGX.
// This matches qualifyPassthroughModelID, which the Playground uses before calling OGX.
// "vllm-inference-1/deepseek-r1" -> "genai-bff-proxy/deepseek-r1"
// "vllm-inference-1/facebook/opt-125m" -> "genai-bff-proxy/facebook/opt-125m"
// "maas-vllm-inference-2/llama-2-7b-chat" -> "genai-bff-proxy/maas-llama-2-7b-chat"
// "genai-bff-proxy/llama-32-1b-instruct" is left unchanged.
func modelNameForCodeExport(model string) string {
	if strings.HasPrefix(model, constants.PassthroughProviderID+"/") {
		return model
	}

	// maas-vllm-inference-N/<model> -> maas-<model>. The proxy selects MaaS
	// when the id still starts with maas-, then looks up the catalog id.
	if rest, ok := modelAfterNumberedProvider(model, "maas-vllm-inference-"); ok {
		model = constants.MaaSProviderPrefix + rest
	} else if rest, ok := modelAfterNumberedProvider(model, "vllm-inference-"); ok {
		model = rest
	}

	return qualifyPassthroughModelID(model)
}

func modelAfterNumberedProvider(model, prefix string) (string, bool) {
	if !strings.HasPrefix(model, prefix) {
		return "", false
	}
	rest := model[len(prefix):]
	slash := strings.Index(rest, "/")
	if slash > 0 && isAllDigits(rest[:slash]) {
		return rest[slash+1:], true
	}
	return "", false
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
