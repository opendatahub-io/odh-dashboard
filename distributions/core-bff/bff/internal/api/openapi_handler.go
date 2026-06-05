package api

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/julienschmidt/httprouter"
	openapispec "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/openapi"
)

// OpenAPIHandler serves the OpenAPI specification and Swagger UI.
type OpenAPIHandler struct {
	logger   *slog.Logger
	spec     *openapi3.T
	specYAML []byte
}

// NewOpenAPIHandler creates a new OpenAPI handler instance.
func NewOpenAPIHandler(logger *slog.Logger) (*OpenAPIHandler, error) {
	specData := openapispec.SpecYAML

	loader := openapi3.NewLoader()
	spec, err := loader.LoadFromData(specData)
	if err != nil {
		return nil, err
	}

	if spec.Servers == nil {
		spec.Servers = make([]*openapi3.Server, 0)
	}

	if len(spec.Servers) == 0 {
		spec.Servers = append(spec.Servers, &openapi3.Server{
			URL:         "http://localhost:4000",
			Description: "Local development server",
		})
	}

	return &OpenAPIHandler{
		logger:   logger,
		spec:     spec,
		specYAML: specData,
	}, nil
}

// OpenAPI endpoints use permissive CORS (Allow-Origin: *) intentionally - they serve
// public developer documentation and must be accessible from Swagger UI on any origin.
func (h *OpenAPIHandler) HandleOpenAPIJSON(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	specCopy := *h.spec

	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	currentServer := &openapi3.Server{
		Description: "Current server",
		URL:         fmt.Sprintf("%s://%s", scheme, r.Host),
	}
	specCopy.Servers = []*openapi3.Server{h.spec.Servers[0], currentServer}

	jsonData, err := json.MarshalIndent(&specCopy, "", "  ")
	if err != nil {
		h.logger.Error("Failed to marshal OpenAPI spec to JSON", "error", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(jsonData); err != nil {
		h.logger.Error("Failed to write JSON response", "error", err)
	}
}

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
	if _, err := w.Write(h.specYAML); err != nil {
		h.logger.Error("Failed to write YAML response", "error", err)
	}
}

func (h *OpenAPIHandler) HandleSwaggerUI(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	w.Header().Set("Content-Type", "text/html")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	html := `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Core BFF API Documentation</title>
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
            SwaggerUIBundle({
                url: '` + OpenAPIJSONPath + `',
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
	}
}

func (h *OpenAPIHandler) HandleOpenAPIRedirect(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	http.Redirect(w, r, SwaggerUIPath, http.StatusMovedPermanently)
}

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
