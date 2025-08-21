package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/constants"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/models"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/repositories"
)

func (app *App) CodeExporterHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	// Check if mock mode is enabled
	if app.isMockModeEnabled() {
		// Return prefilled template in mock mode
		mockTemplate := app.getMockTemplate()
		if err := app.WritePlain(w, http.StatusOK, mockTemplate, nil); err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
		return
	}

	// Parse the request body using models.CodeExportRequest directly
	var configRequest models.CodeExportRequest
	if err := app.ReadJSON(w, r, &configRequest); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Validate required fields
	if configRequest.Input == "" {
		app.badRequestResponse(w, r, errors.New("input is required"))
		return
	}
	if configRequest.Model == "" {
		app.badRequestResponse(w, r, errors.New("model is required"))
		return
	}

	// Generate Python code based on the config
	pythonCode, err := app.generatePythonCode(configRequest, app.repositories.Template)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return Python code directly as plain text
	if err := app.WritePlain(w, http.StatusOK, pythonCode, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}

// generatePythonCode creates Python code based on the code export request
func (app *App) generatePythonCode(config models.CodeExportRequest, templateRepo *repositories.TemplateRepository) (string, error) {
	// Parse the Python template if not already parsed
	if err := templateRepo.ParseTemplate("python", constants.PythonCodeTemplate); err != nil {
		return "", fmt.Errorf("failed to initialize Python template: %w", err)
	}

	// Execute the template with config data
	result, err := templateRepo.ExecuteTemplate("python", config)
	if err != nil {
		return "", fmt.Errorf("failed to generate Python code: %w", err)
	}

	return result, nil
}

// isMockModeEnabled checks if MOCK_LS_CLIENT environment variable is set to "true"
func (app *App) isMockModeEnabled() bool {
	return app.config.MockLSClient
}

// getMockTemplate returns a prefilled Python template for mock mode
func (app *App) getMockTemplate() string {
	// Create mock config data
	mockConfig := models.CodeExportRequest{
		Input:        "Hello, this is a mock response",
		Model:        "llama3.2:3b",
		Instructions: "You are a helpful AI assistant. This is a mock response",
		Stream:       true,
		Temperature:  0.7,
		Tools: []models.Tool{
			{
				Type:           "file_search",
				VectorStoreIDs: []string{"mock_store_1", "mock_store_2"},
			},
		},
	}

	// Use the existing template system to generate the mock response
	pythonCode, err := app.generatePythonCode(mockConfig, app.repositories.Template)
	if err != nil {
		// Fallback to a simple mock response if template generation fails
		return "# Mock Llama Stack Client Template"
	}

	return pythonCode
}
