package api

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mlflow/bff/internal/models"
)

const mcpRegisterMetadataError = "Failed to save display name and icons"

// MLflowRegisterMCPServerHandler handles POST /api/v1/mcp-registry/register.
// It creates a server version, then best-effort updates display_name/icons and
// sets tags.
func (app *App) MLflowRegisterMCPServerHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	var req models.RegisterMCPServerRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if err := validateRegisterMCPServerRequest(req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	workspace, ok := app.extractAndValidateWorkspace(ctx, w, r)
	if !ok {
		return
	}
	if !app.enforceMCPWritePermission(ctx, w, r, workspace, "create") {
		return
	}

	app.logger.Debug("registering MCP server",
		slog.String("workspace", workspace),
		slog.String("name", req.Name))

	version, err := app.repositories.MCPRegistry.CreateServerVersion(ctx, req.Name, toCreateMCPServerVersionRequest(req))
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}
	if version == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("CreateServerVersion returned nil for %q", req.Name))
		return
	}

	result := models.RegisterMCPServerResult{Version: *version}
	result.MetadataError = app.applyRegisterMetadata(ctx, req)
	result.FailedTagKeys = app.applyRegisterTags(ctx, req)

	headers := http.Header{"Location": {mcpServerVersionLocation(req.Name, version.Version, workspace)}}
	if err := app.WriteJSON(w, http.StatusCreated, MCPRegisterEnvelope{Data: result}, headers); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func validateRegisterMCPServerRequest(req models.RegisterMCPServerRequest) error {
	if err := validateMCPServerName(req.Name); err != nil {
		return err
	}
	return validateMCPServerJSON(req.ServerJSON, req.Name)
}

func validateMCPServerJSON(serverJSON models.MCPServerJSON, expectedName string) error {
	if serverJSON.IsEmpty() {
		return errors.New("server_json is required")
	}
	if serverJSON.Name == "" {
		return errors.New(`server_json "name" is required`)
	}
	if serverJSON.Name != expectedName {
		return fmt.Errorf("server_json name %q must match server name %q", serverJSON.Name, expectedName)
	}
	if serverJSON.Version == "" {
		return errors.New(`server_json "version" is required`)
	}
	return nil
}

func toCreateMCPServerVersionRequest(req models.RegisterMCPServerRequest) models.CreateMCPServerVersionRequest {
	return models.CreateMCPServerVersionRequest{
		ServerJSON: req.ServerJSON,
		Status:     req.Status,
		Source:     req.Source,
		Tools:      models.CatalogToolsToRegistryTools(req.Tools),
	}
}

func mcpServerVersionLocation(name, version, workspace string) string {
	return fmt.Sprintf("%s/%s/versions/%s?workspace=%s",
		MCPServersPath,
		mcpServerNamePathSegment(name),
		url.PathEscape(version),
		url.QueryEscape(workspace),
	)
}

// applyRegisterMetadata best-effort updates display_name and icons after
// version creation. Failures are returned as a client-facing error string
// rather than failing the request.
func (app *App) applyRegisterMetadata(ctx context.Context, req models.RegisterMCPServerRequest) string {
	updateReq, ok := buildMCPServerMetadataUpdate(req.DisplayName, req.Icons)
	if !ok {
		return ""
	}
	if _, err := app.repositories.MCPRegistry.UpdateServer(ctx, req.Name, updateReq); err != nil {
		app.logger.Error("register MCP server: metadata update failed",
			slog.String("name", req.Name),
			slog.String("error", err.Error()))
		return mcpRegisterMetadataError
	}
	return ""
}

func buildMCPServerMetadataUpdate(displayName string, icons []models.MCPIcon) (models.UpdateMCPServerRequest, bool) {
	displayName = strings.TrimSpace(displayName)
	icons = sanitizeMCPIcons(icons)
	if displayName == "" && len(icons) == 0 {
		return models.UpdateMCPServerRequest{}, false
	}

	updateReq := models.UpdateMCPServerRequest{}
	if displayName != "" {
		updateReq.DisplayName = &displayName
	}
	if len(icons) > 0 {
		iconMaps := mcpIconsToMaps(icons)
		updateReq.Icons = &iconMaps
	}
	return updateReq, true
}

func mcpIconsToMaps(icons []models.MCPIcon) []map[string]any {
	out := make([]map[string]any, 0, len(icons))
	for _, icon := range icons {
		entry := map[string]any{"src": icon.Src}
		if icon.Theme != "" {
			entry["theme"] = icon.Theme
		}
		out = append(out, entry)
	}
	return out
}

// applyRegisterTags best-effort sets tags after version creation. Keys that
// fail to set are returned so they can be reported on the 201 response.
func (app *App) applyRegisterTags(ctx context.Context, req models.RegisterMCPServerRequest) []string {
	var failed []string
	for _, tag := range dedupeMCPTags(req.Tags) {
		if err := app.repositories.MCPRegistry.SetServerTag(ctx, req.Name, tag); err != nil {
			app.logger.Error("register MCP server: tag set failed",
				slog.String("name", req.Name),
				slog.String("key", tag.Key),
				slog.String("error", err.Error()))
			failed = append(failed, tag.Key)
		}
	}
	return failed
}

func sanitizeMCPIcons(icons []models.MCPIcon) []models.MCPIcon {
	if len(icons) == 0 {
		return nil
	}
	out := make([]models.MCPIcon, 0, len(icons))
	for _, icon := range icons {
		if cleaned, ok := sanitizeMCPIcon(icon); ok {
			out = append(out, cleaned)
		}
	}
	return out
}

func sanitizeMCPIcon(icon models.MCPIcon) (models.MCPIcon, bool) {
	src := strings.TrimSpace(icon.Src)
	if !isAllowedIconURL(src) {
		return models.MCPIcon{}, false
	}
	cleaned := models.MCPIcon{Src: src}
	if isAllowedIconTheme(icon.Theme) {
		cleaned.Theme = icon.Theme
	}
	return cleaned, true
}

func isAllowedIconURL(raw string) bool {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Host == "" {
		return false
	}
	return parsed.Scheme == "https" || parsed.Scheme == "http"
}

func isAllowedIconTheme(theme string) bool {
	return theme == "light" || theme == "dark"
}

func dedupeMCPTags(tags []models.SetMCPTagRequest) []models.SetMCPTagRequest {
	if len(tags) == 0 {
		return nil
	}
	byKey := make(map[string]string, len(tags))
	order := make([]string, 0, len(tags))
	for _, tag := range tags {
		key := strings.TrimSpace(tag.Key)
		if key == "" {
			continue
		}
		if _, exists := byKey[key]; !exists {
			order = append(order, key)
		}
		byKey[key] = strings.TrimSpace(tag.Value)
	}
	out := make([]models.SetMCPTagRequest, 0, len(order))
	for _, key := range order {
		out = append(out, models.SetMCPTagRequest{Key: key, Value: byKey[key]})
	}
	return out
}
