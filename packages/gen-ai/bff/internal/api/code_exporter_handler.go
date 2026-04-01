package api

import (
	"errors"
	"fmt"
	"net/http"

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
	Namespace         string
}

// generatePythonCode creates Python code based on the code export request
func (app *App) generatePythonCode(config models.CodeExportRequest, namespace string, templateRepo *repositories.TemplateRepository) (string, error) {
	// Parse the Python template if not already parsed
	if err := templateRepo.ParseTemplate("python", constants.PythonCodeTemplate); err != nil {
		return "", fmt.Errorf("failed to initialize Python template: %w", err)
	}

	// Execute the template with config data, injecting server-side fields
	result, err := templateRepo.ExecuteTemplate("python", codeExportTemplateData{
		CodeExportRequest: config,
		MLflowExternalURL: app.mlflowExternalURL,
		Namespace:         namespace,
	})
	if err != nil {
		return "", fmt.Errorf("failed to generate Python code: %w", err)
	}

	return result, nil
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
