package api

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/config"
)

const (
	OpenAPIPath     = "/openapi"
	OpenAPIJSONPath = "/openapi.json"
	OpenAPIYAMLPath = "/openapi.yaml"
	SwaggerUIPath   = "/swagger-ui"
)

// OpenAPIHandler handles serving OpenAPI specifications
type OpenAPIHandler struct {
	logger   *slog.Logger
	spec     *openapi3.T
	specYAML []byte
	config   config.EnvConfig
}

// NewOpenAPIHandler creates a new OpenAPI handler
func NewOpenAPIHandler(logger *slog.Logger, cfg config.EnvConfig) (*OpenAPIHandler, error) {
	// Load the OpenAPI specification from file
	specPath := "openapi/src/llama-stack-modular-ui.yaml"
	specData, err := os.ReadFile(specPath)
	if err != nil {
		return nil, err
	}

	// Parse the OpenAPI specification
	loader := openapi3.NewLoader()
	loader.IsExternalRefsAllowed = true // Allow external references

	// Set the working directory for resolving relative references
	loader.ReadFromURIFunc = func(loader *openapi3.Loader, url *url.URL) ([]byte, error) {
		if url.Scheme == "" && url.Host == "" {
			// Handle relative file paths
			filePath := filepath.Join("openapi/src", url.Path)
			return os.ReadFile(filePath)
		}
		return nil, fmt.Errorf("unsupported URL scheme: %s", url.Scheme)
	}

	spec, err := loader.LoadFromData(specData)
	if err != nil {
		return nil, err
	}

	return &OpenAPIHandler{
		logger:   logger,
		spec:     spec,
		specYAML: specData,
		config:   cfg,
	}, nil
}

// NewOpenAPIHandlerWithSpecPath creates a new OpenAPI handler with a custom spec file path
// This is primarily used for testing to avoid changing the global working directory
func NewOpenAPIHandlerWithSpecPath(logger *slog.Logger, cfg config.EnvConfig, specPath string) (*OpenAPIHandler, error) {
	// Load the OpenAPI specification from the provided file path
	specData, err := os.ReadFile(specPath)
	if err != nil {
		return nil, err
	}

	// Parse the OpenAPI specification
	loader := openapi3.NewLoader()
	loader.IsExternalRefsAllowed = true // Allow external references

	// Set the working directory for resolving relative references
	specDir := filepath.Dir(specPath)
	loader.ReadFromURIFunc = func(loader *openapi3.Loader, url *url.URL) ([]byte, error) {
		if url.Scheme == "" && url.Host == "" {
			// Handle relative file paths relative to the spec file directory
			filePath := filepath.Join(specDir, url.Path)
			return os.ReadFile(filePath)
		}
		return nil, fmt.Errorf("unsupported URL scheme: %s", url.Scheme)
	}

	spec, err := loader.LoadFromData(specData)
	if err != nil {
		return nil, err
	}

	return &OpenAPIHandler{
		logger:   logger,
		spec:     spec,
		specYAML: specData,
		config:   cfg,
	}, nil
}

// getDynamicSpec returns the OpenAPI spec with dynamic path prefixes
func (h *OpenAPIHandler) getDynamicSpec() *openapi3.T {
	// Create a deep copy of the spec by marshaling and unmarshaling JSON
	specJSON, err := json.Marshal(h.spec)
	if err != nil {
		h.logger.Error("Failed to marshal OpenAPI spec", "error", err)
		return h.spec // Return original spec as fallback
	}

	// Replace generic /api/v1 with the configured API path prefix in JSON
	jsonContent := string(specJSON)
	jsonContent = strings.ReplaceAll(jsonContent, "/api/v1", h.config.APIPathPrefix)

	// Unmarshal back to spec
	dynamicSpec := &openapi3.T{}
	if err := json.Unmarshal([]byte(jsonContent), dynamicSpec); err != nil {
		h.logger.Error("Failed to unmarshal OpenAPI spec", "error", err)
		return h.spec // Return original spec as fallback
	}

	return dynamicSpec
}

// getDynamicSpecYAML returns the OpenAPI spec as YAML with dynamic path prefixes
func (h *OpenAPIHandler) getDynamicSpecYAML() []byte {
	// Replace generic /api/v1 with the configured API path prefix in YAML
	yamlContent := string(h.specYAML)
	yamlContent = strings.ReplaceAll(yamlContent, "/api/v1", h.config.APIPathPrefix)
	return []byte(yamlContent)
}

// HandleOpenAPIJSON serves the OpenAPI specification as JSON
func (h *OpenAPIHandler) HandleOpenAPIJSON(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Convert dynamic spec to JSON
	dynamicSpec := h.getDynamicSpec()
	jsonData, err := json.MarshalIndent(dynamicSpec, "", "  ")
	if err != nil {
		h.logger.Error("Failed to marshal OpenAPI spec to JSON", "error", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(jsonData); err != nil {
		h.logger.Error("Failed to write JSON response", "error", err)
		return
	}
}

// HandleOpenAPIYAML serves the OpenAPI specification as YAML
func (h *OpenAPIHandler) HandleOpenAPIYAML(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	w.Header().Set("Content-Type", "text/yaml")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	w.WriteHeader(http.StatusOK)
	dynamicYAML := h.getDynamicSpecYAML()
	if _, err := w.Write(dynamicYAML); err != nil {
		h.logger.Error("Failed to write YAML response", "error", err)
		return
	}
}

// HandleSwaggerUI serves a simple Swagger UI interface
func (h *OpenAPIHandler) HandleSwaggerUI(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	w.Header().Set("Content-Type", "text/html")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	html := `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Llama Stack Modular UI API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
    <style>
        html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }
        *, *:before, *:after {
            box-sizing: inherit;
        }
        body {
            margin:0;
            background: #fafafa;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '/openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout"
            });
        };
    </script>
</body>
</html>`

	w.WriteHeader(http.StatusOK)
	if _, err := w.Write([]byte(html)); err != nil {
		h.logger.Error("Failed to write HTML response", "error", err)
		return
	}
}

// HandleOpenAPIRedirect redirects /openapi to /swagger-ui
func (h *OpenAPIHandler) HandleOpenAPIRedirect(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	http.Redirect(w, r, SwaggerUIPath, http.StatusMovedPermanently)
}

// Wrapper methods for standard http.HandlerFunc compatibility
func (h *OpenAPIHandler) HandleOpenAPIRedirectWrapper(w http.ResponseWriter, r *http.Request) {
	h.HandleOpenAPIRedirect(w, r, nil)
}

func (h *OpenAPIHandler) HandleOpenAPIJSONWrapper(w http.ResponseWriter, r *http.Request) {
	h.HandleOpenAPIJSON(w, r, nil)
}

func (h *OpenAPIHandler) HandleOpenAPIYAMLWrapper(w http.ResponseWriter, r *http.Request) {
	h.HandleOpenAPIYAML(w, r, nil)
}

func (h *OpenAPIHandler) HandleSwaggerUIWrapper(w http.ResponseWriter, r *http.Request) {
	h.HandleSwaggerUI(w, r, nil)
}
