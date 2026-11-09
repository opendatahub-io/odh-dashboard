package kubernetes

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewOTelConfigManagerDiscovery(t *testing.T) {
	for _, tt := range []struct {
		name           string
		platform       bool
		genAI          bool
		mlflow         bool
		wantManager    bool
		wantMLflowList bool
	}{
		{name: "no collectors"},
		{name: "gen-ai alone cannot provision routes", genAI: true},
		{name: "platform alone waits for MLflow", platform: true, wantMLflowList: true},
		{name: "ready before gen-ai collector exists", platform: true, mlflow: true, wantManager: true, wantMLflowList: true},
		{name: "platform namespace wins for provisioning", platform: true, genAI: true, mlflow: true, wantManager: true, wantMLflowList: true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			var mlflowListed atomic.Bool
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				items := []any{}
				kind := "OpenTelemetryCollectorList"
				switch r.URL.Path {
				case "/apis/opentelemetry.io/v1beta1/opentelemetrycollectors":
					if tt.platform {
						items = append(items, map[string]any{"metadata": map[string]any{
							"name": constants.PlatformCollectorName, "namespace": "platform-ns",
						}})
					}
					if tt.genAI {
						items = append(items, map[string]any{"metadata": map[string]any{
							"name": constants.GenAICollectorName, "namespace": "gen-ai-ns",
						}})
					}
				case "/apis/mlflow.opendatahub.io/v1/mlflows":
					mlflowListed.Store(true)
					kind = "MLflowList"
					if tt.mlflow {
						items = append(items, map[string]any{
							"metadata": map[string]any{"name": "mlflow"},
							"status":   map[string]any{"address": map[string]any{"url": "https://mlflow.svc:8443/mlflow"}},
						})
					}
				default:
					t.Errorf("unexpected discovery request: %s", r.URL.Path)
					w.WriteHeader(http.StatusNotFound)
					return
				}
				assert.NoError(t, json.NewEncoder(w).Encode(map[string]any{
					"apiVersion": "v1", "kind": kind, "items": items,
				}))
			}))
			defer server.Close()

			// Exercise production config loading and both HTTP discovery calls,
			// while remaining independent of the developer's kubeconfig.
			t.Setenv("KUBERNETES_SERVICE_HOST", "")
			t.Setenv("KUBERNETES_SERVICE_PORT", "")
			path := filepath.Join(t.TempDir(), "kubeconfig")
			t.Setenv("KUBECONFIG", path)
			kubeconfig := fmt.Sprintf(`apiVersion: v1
kind: Config
current-context: test
contexts:
- name: test
  context:
    cluster: test
clusters:
- name: test
  cluster:
    server: %s
`, server.URL)
			require.NoError(t, os.WriteFile(path, []byte(kubeconfig), 0600))

			manager, err := newOTelConfigManager(context.Background(), slog.Default(), config.EnvConfig{
				MLflowURL: "https://localhost:5001",
			}, nil)
			require.NoError(t, err)
			assert.Equal(t, tt.wantMLflowList, mlflowListed.Load())
			if !tt.wantManager {
				assert.Nil(t, manager)
				return
			}
			require.NotNil(t, manager)
			assert.Equal(t, "platform-ns", manager.collectorNamespace)
			assert.Equal(t, "https://mlflow.svc:8443/mlflow", manager.mlflowCollectorEndpoint)
			assert.Equal(t, "https://localhost:5001", manager.mlflowURL, "BFF override must not change collector export URL")
		})
	}
}
