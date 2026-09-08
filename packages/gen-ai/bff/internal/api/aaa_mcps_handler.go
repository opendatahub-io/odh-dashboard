package api

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type MCPListEnvelope = Envelope[models.MCPListData, None]

type configmapListResult struct {
	servers       []models.MCPServerSummary
	configMapInfo *models.ConfigMapInfo
	err           error
}

type registryListResult struct {
	servers       []models.MCPServerSummary
	available     bool
	registryError string
}

// MCPListHandler handles GET /genai/v1/aa/mcps?namespace=<>
func (app *App) MCPListHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	identity, k8sClient, err := app.setupMCPEndpoint(ctx)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	namespace, _, _, err := app.parseMCPEndpointParams(r, false)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	cmCh := make(chan configmapListResult, 1)
	regCh := make(chan registryListResult, 1)

	go func() {
		result, cmErr := app.repositories.MCPClient.GetMCPServersFromConfigWithMetadata(
			k8sClient,
			ctx,
			identity,
			app.dashboardNamespace,
			constants.MCPServerName,
		)
		if cmErr != nil {
			cmCh <- configmapListResult{err: cmErr}
			return
		}

		servers := make([]models.MCPServerSummary, 0, len(result.Servers))
		for _, serverInfo := range result.Servers {
			status := app.determineServerStatusFromConfig(serverInfo.Config)
			var logo *string
			if serverInfo.Config.Logo != "" {
				logo = &serverInfo.Config.Logo
			}

			servers = append(servers, models.MCPServerSummary{
				Name:        serverInfo.Name,
				URL:         serverInfo.Config.URL,
				Transport:   app.normalizeTransportType(serverInfo.Config.Transport),
				Description: serverInfo.Config.Description,
				Logo:        logo,
				Status:      status,
				Source:      models.MCPServerSourceConfigMap,
				Tools:       []models.MCPServerToolSummary{},
				ToolCount:   0,
			})
		}

		cmCh <- configmapListResult{servers: servers, configMapInfo: &result.ConfigMapInfo}
	}()

	go func() {
		mlflowClient := app.mlflowBFFClient(ctx)
		if mlflowClient == nil {
			regCh <- registryListResult{
				available:     false,
				registryError: "MLflow BFF is not configured",
			}
			return
		}

		registryServers, regErr := app.fetchRegistryMCPServerSummaries(ctx, namespace, mlflowClient)
		if regErr != nil {
			regCh <- registryListResult{
				available:     false,
				registryError: friendlyRegistryError(regErr),
			}
			return
		}

		regCh <- registryListResult{servers: registryServers, available: true}
	}()

	cmRes := <-cmCh
	regRes := <-regCh

	configmapAvailable := cmRes.err == nil
	var configmapError string
	if cmRes.err != nil {
		app.logger.Error("failed to read MCP servers ConfigMap",
			"namespace", app.dashboardNamespace,
			"error", cmRes.err,
		)
		configmapError = friendlyConfigMapError(cmRes.err, app.dashboardNamespace)
	}

	var configMapInfo *models.ConfigMapInfo
	if configmapAvailable {
		configMapInfo = cmRes.configMapInfo
	}

	merged := mergeMCPServerSummaries(regRes.servers, cmRes.servers)

	responseData := models.MCPListData{
		Servers:            merged,
		TotalCount:         len(merged),
		ConfigMapInfo:      configMapInfo,
		RegistryAvailable:  regRes.available,
		RegistryError:      regRes.registryError,
		ConfigmapAvailable: configmapAvailable,
		ConfigmapError:     configmapError,
	}

	response := MCPListEnvelope{
		Data: responseData,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}

// friendlyRegistryError returns a human-readable message for a registry fetch error.
// Internal error details are intentionally not exposed to the caller to avoid leaking
// infrastructure details (hostnames, TLS errors, internal addresses).
func friendlyRegistryError(err error) string {
	if errors.Is(err, ErrRegistryMCPClientUnavailable) {
		return "MLflow BFF is not configured"
	}
	return "MCP registry temporarily unavailable"
}

// mergeMCPServerSummaries combines registry and ConfigMap servers, preferring registry entries
// when both sources expose the same endpoint URL.
func mergeMCPServerSummaries(registryServers, configmapServers []models.MCPServerSummary) []models.MCPServerSummary {
	seenURLs := make(map[string]struct{}, len(registryServers))
	merged := make([]models.MCPServerSummary, 0, len(registryServers)+len(configmapServers))
	merged = append(merged, registryServers...)
	for _, server := range registryServers {
		seenURLs[server.URL] = struct{}{}
	}

	for _, server := range configmapServers {
		if _, exists := seenURLs[server.URL]; exists {
			continue
		}
		merged = append(merged, server)
	}

	return merged
}

// friendlyConfigMapError returns a human-readable message for a ConfigMap fetch error.
// It does not write to an http.ResponseWriter — callers surface this as a response field.
func friendlyConfigMapError(err error, namespace string) string {
	errMsg := err.Error()
	if containsAny(errMsg, []string{"not found", "NotFound", "404"}) {
		return fmt.Sprintf("ConfigMap '%s' not found in namespace '%s'", constants.MCPServerName, namespace)
	}
	if containsAny(errMsg, []string{"forbidden", "Forbidden", "403", "permission denied"}) {
		return fmt.Sprintf("Access denied to ConfigMap '%s' in namespace '%s'", constants.MCPServerName, namespace)
	}
	return fmt.Sprintf("Failed to read ConfigMap '%s'", constants.MCPServerName)
}

// handleConfigMapError writes an appropriate HTTP error response for ConfigMap fetch failures.
// Used by endpoints where the ConfigMap is the sole data source (e.g., vector stores).
// For multi-source list endpoints, prefer friendlyConfigMapError + graceful degradation instead.
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
func (app *App) determineServerStatusFromConfig(config models.MCPServerConfig) string {
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
