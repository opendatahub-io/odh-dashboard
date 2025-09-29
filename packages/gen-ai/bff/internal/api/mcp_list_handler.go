package api

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/models/genaiassets"
)

// MCPServerSummary represents a single MCP server for frontend table display
type MCPServerSummary struct {
	Name        string  `json:"name"`
	URL         string  `json:"url"`
	Transport   string  `json:"transport"`
	Description string  `json:"description"`
	Logo        *string `json:"logo"`   // nullable
	Status      string  `json:"status"` // "healthy", "error", "unknown" - from ConfigMap only
}

// ConfigMapInfo provides metadata about the source ConfigMap
type ConfigMapInfo struct {
	Name        string `json:"name"`
	Namespace   string `json:"namespace"`
	LastUpdated string `json:"last_updated"` // ISO 8601 format
}

// MCPListData represents the enhanced response data structure
type MCPListData struct {
	Servers       []MCPServerSummary `json:"servers"`
	TotalCount    int                `json:"total_count"`
	ConfigMapInfo ConfigMapInfo      `json:"config_map_info"`
}

type MCPListEnvelope = Envelope[MCPListData, None]

// MCPListHandler handles GET /genai/v1/aa/mcps?namespace=<>
func (app *App) MCPListHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	identity, k8sClient, err := app.setupMCPEndpoint(ctx)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	_, _, _, err = app.parseMCPEndpointParams(r, false)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	result, err := app.repositories.MCPClient.GetMCPServersFromConfigWithMetadata(
		k8sClient,
		ctx,
		identity,
		app.dashboardNamespace,
		constants.MCPServerName,
	)
	if err != nil {
		app.handleConfigMapError(w, r, err, constants.MCPServerName, app.dashboardNamespace)
		return
	}

	servers := make([]MCPServerSummary, 0, len(result.Servers))
	for _, serverInfo := range result.Servers {
		status := app.determineServerStatusFromConfig(serverInfo.Config)
		var logo *string
		if serverInfo.Config.Logo != "" {
			logo = &serverInfo.Config.Logo
		}

		servers = append(servers, MCPServerSummary{
			Name:        serverInfo.Name,
			URL:         serverInfo.Config.URL,
			Transport:   app.normalizeTransportType(serverInfo.Config.Transport),
			Description: serverInfo.Config.Description,
			Logo:        logo,
			Status:      status,
		})
	}

	responseData := MCPListData{
		Servers:    servers,
		TotalCount: len(servers),
		ConfigMapInfo: ConfigMapInfo{
			Name:        result.ConfigMapInfo.Name,
			Namespace:   result.ConfigMapInfo.Namespace,
			LastUpdated: result.ConfigMapInfo.LastUpdated,
		},
	}

	response := MCPListEnvelope{
		Data: responseData,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}

// handleConfigMapError handles specific ConfigMap-related errors with appropriate HTTP status codes
func (app *App) handleConfigMapError(w http.ResponseWriter, r *http.Request, err error, configMapName, namespace string) {
	errMsg := err.Error()

	if containsAny(errMsg, []string{"not found", "NotFound", "404"}) {
		if err := app.WriteJSON(w, http.StatusNotFound, map[string]interface{}{
			"error": map[string]interface{}{
				"code":    "404",
				"message": fmt.Sprintf("ConfigMap '%s' not found in namespace '%s'", configMapName, namespace),
				"details": map[string]interface{}{
					"config_map_name": configMapName,
					"namespace":       namespace,
					"reason":          "ConfigMap does not exist",
				},
			},
		}, nil); err != nil {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if containsAny(errMsg, []string{"forbidden", "Forbidden", "403", "permission denied"}) {
		if err := app.WriteJSON(w, http.StatusForbidden, map[string]interface{}{
			"error": map[string]interface{}{
				"code":    "403",
				"message": fmt.Sprintf("Access denied to ConfigMap '%s' in namespace '%s'", configMapName, namespace),
				"details": map[string]interface{}{
					"config_map_name": configMapName,
					"namespace":       namespace,
					"reason":          "Insufficient permissions",
				},
			},
		}, nil); err != nil {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	app.serverErrorResponse(w, r, err)
}

// determineServerStatusFromConfig determines server status based on ConfigMap data only (no MCP calls)
func (app *App) determineServerStatusFromConfig(config genaiassets.MCPServerConfig) string {
	if config.URL == "" {
		return "error"
	}

	// ConfigMap data is valid, assume server is healthy
	return "healthy"
}

// normalizeTransportType ensures transport type has a default value
func (app *App) normalizeTransportType(transport string) string {
	if transport == "" {
		return "streamable-http"
	}
	return transport
}

// containsAny checks if the string contains any of the given substrings (case-insensitive)
func containsAny(str string, substrings []string) bool {
	lowerStr := strings.ToLower(str)
	for _, substr := range substrings {
		if strings.Contains(lowerStr, strings.ToLower(substr)) {
			return true
		}
	}
	return false
}
