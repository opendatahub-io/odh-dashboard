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

type CodeExportEnvelope = Envelope[models.CodeExportResponse, None]

func (app *App) CodeExporterHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
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
