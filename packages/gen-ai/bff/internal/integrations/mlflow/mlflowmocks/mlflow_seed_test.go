package mlflowmocks

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/opendatahub-io/mlflow-go/mlflow"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDevMLflowWorkspaces(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name                string
		playgroundNamespace string
		want                []string
	}{
		{
			name:                "default only when playground unset",
			playgroundNamespace: "",
			want:                []string{"default"},
		},
		{
			name:                "includes playground namespace",
			playgroundNamespace: "crimson-dev",
			want:                []string{"default", "crimson-dev"},
		},
		{
			name:                "deduplicates when playground is default",
			playgroundNamespace: "default",
			want:                []string{"default"},
		},
		{
			name:                "trims whitespace",
			playgroundNamespace: "  crimson-dev  ",
			want:                []string{"default", "crimson-dev"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := devMLflowWorkspaces(tt.playgroundNamespace)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestMCPSeedReconciliation(t *testing.T) {
	t.Parallel()

	const (
		basePath    = "/ajax-api/3.0/mlflow/mcp-servers"
		serverName  = "com.example/reconcile-test"
		version     = "1.0.0"
		endpointURL = "https://example.com/mcp"
		description = "reconcile test server"
		displayName = "Reconcile Test"
	)

	type registryState struct {
		servers   map[string]bool
		versions  map[string]map[string]bool
		endpoints map[string][]map[string]string
	}

	state := &registryState{
		servers:   map[string]bool{serverName: true},
		versions:  map[string]map[string]bool{serverName: {}},
		endpoints: map[string][]map[string]string{serverName: {}},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		writeJSON := func(v any) { _ = json.NewEncoder(w).Encode(v) }

		switch {
		case r.Method == http.MethodGet && r.URL.Path == basePath+"/"+serverName:
			endpoints := make([]map[string]string, 0, len(state.endpoints[serverName]))
			endpoints = append(endpoints, state.endpoints[serverName]...)
			writeJSON(map[string]any{
				"name":             serverName,
				"description":      description,
				"access_endpoints": endpoints,
			})
		case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, basePath+"/"+serverName+"/versions/"):
			versionName := strings.TrimPrefix(r.URL.Path, basePath+"/"+serverName+"/versions/")
			if state.versions[serverName][versionName] {
				writeJSON(map[string]any{
					"name":    serverName,
					"version": versionName,
					"status":  "active",
					"server_json": map[string]any{
						"name":    serverName,
						"version": versionName,
					},
				})
				return
			}
			w.WriteHeader(http.StatusNotFound)
			writeJSON(map[string]string{
				"error_code": "RESOURCE_DOES_NOT_EXIST",
				"message":    "version not found",
			})
		case r.Method == http.MethodPost && r.URL.Path == basePath+"/"+serverName+"/versions":
			body, _ := io.ReadAll(r.Body)
			var req struct {
				ServerJSON map[string]any `json:"server_json"`
			}
			_ = json.Unmarshal(body, &req)
			versionValue, _ := req.ServerJSON["version"].(string)
			state.versions[serverName][versionValue] = true
			writeJSON(map[string]any{
				"name":    serverName,
				"version": versionValue,
				"status":  "active",
				"server_json": map[string]any{
					"name":    serverName,
					"version": versionValue,
				},
			})
		case r.Method == http.MethodPost && r.URL.Path == basePath+"/"+serverName+"/endpoints":
			body, _ := io.ReadAll(r.Body)
			var req map[string]string
			_ = json.Unmarshal(body, &req)
			state.endpoints[serverName] = append(state.endpoints[serverName], map[string]string{
				"id":          "endpoint-1",
				"server_name": serverName,
				"url":         req["url"],
			})
			writeJSON(map[string]any{
				"id":             "endpoint-1",
				"server_name":    serverName,
				"url":            req["url"],
				"transport_type": "streamable-http",
			})
		default:
			t.Errorf("unexpected request: %s %s", r.Method, r.URL.Path)
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	t.Cleanup(server.Close)

	mlflowClient, err := mlflow.NewClient(
		mlflow.WithTrackingURI(server.URL),
		mlflow.WithInsecure(),
	)
	require.NoError(t, err)

	reg := mlflowClient.MCPRegistry()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	ctx := context.Background()

	require.False(t, mcpServerVersionExists(ctx, reg, serverName, version))
	require.False(t, mcpServerEndpointExists(ctx, reg, serverName, endpointURL))

	err = ensureMCPServerWithActiveVersion(
		ctx, reg, logger,
		serverName, displayName, description, version, endpointURL, nil,
	)
	require.NoError(t, err)

	assert.True(t, mcpServerVersionExists(ctx, reg, serverName, version))
	assert.True(t, mcpServerEndpointExists(ctx, reg, serverName, endpointURL))

	// Second run must be idempotent and not duplicate sub-resources.
	err = ensureMCPServerWithActiveVersion(
		ctx, reg, logger,
		serverName, displayName, description, version, endpointURL, nil,
	)
	require.NoError(t, err)
	assert.Len(t, state.endpoints[serverName], 1)
}

func TestSeedMCPRegistry(t *testing.T) {
	trackingURI := os.Getenv("MLFLOW_TRACKING_URI")
	if trackingURI == "" {
		t.Skip("MLFLOW_TRACKING_URI not set")
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	if err := SeedMCPRegistry(trackingURI, logger); err != nil {
		t.Fatalf("SeedMCPRegistry failed: %v", err)
	}

	// Re-run to verify partial-heal reconciliation is idempotent.
	if err := SeedMCPRegistry(trackingURI, logger); err != nil {
		t.Fatalf("SeedMCPRegistry second run failed: %v", err)
	}
}

func TestSeedPrompts(t *testing.T) {
	trackingURI := os.Getenv("MLFLOW_TRACKING_URI")
	if trackingURI == "" {
		t.Skip("MLFLOW_TRACKING_URI not set")
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	if err := SeedPrompts(trackingURI, logger); err != nil {
		t.Fatalf("SeedPrompts failed: %v", err)
	}

	if err := SeedPrompts(trackingURI, logger); err != nil {
		t.Fatalf("SeedPrompts second run failed: %v", err)
	}
}
