package kubernetes

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Base config matching what buildBaseCollectorCR produces (as YAML string,
// since extractConfig may encounter string configs from the API).
const baseGenAICollectorConfigYAML = `
receivers:
  otlp:
    protocols:
      http: {}
processors:
  batch: {}
  filter/drop-asgi-events:
    error_mode: ignore
    traces:
      span:
      - IsMatch(name, ".* http (send|receive)$")
exporters:
  debug:
    verbosity: basic
extensions:
  bearertokenauth:
    filename: /var/run/secrets/kubernetes.io/serviceaccount/token
service:
  extensions: [bearertokenauth]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter/drop-asgi-events, batch]
      exporters: [debug]
`

func TestEnsureRoutingConnector_FirstCall(t *testing.T) {
	cfg, err := parseCollectorConfig(baseGenAICollectorConfigYAML)
	require.NoError(t, err)

	changed := ensureRoutingConnector(cfg)
	assert.True(t, changed, "first call should modify config")

	connectors, ok := cfg["connectors"].(map[string]interface{})
	require.True(t, ok)
	routing, ok := connectors[routingConnectorKey].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, []interface{}{}, routing["default_pipelines"])
	assert.Equal(t, []interface{}{}, routing["table"])

	svc := cfg["service"].(map[string]interface{})
	pipelines := svc["pipelines"].(map[string]interface{})

	// Base traces pipeline should be rewired to export via the routing connector.
	traces, ok := pipelines["traces"].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, []interface{}{"otlp"}, traces["receivers"])
	assert.Equal(t, []interface{}{asgiSpanFilterProcessor, "batch"}, traces["processors"])
	assert.Equal(t, []interface{}{routingConnectorKey}, traces["exporters"])
}

func TestEnsureRoutingConnector_Idempotent(t *testing.T) {
	cfg, err := parseCollectorConfig(baseGenAICollectorConfigYAML)
	require.NoError(t, err)

	ensureRoutingConnector(cfg)
	changed := ensureRoutingConnector(cfg)
	assert.False(t, changed, "second call should be a no-op")
}

func TestEnsureRoutingConnector_StructuredConfig(t *testing.T) {
	cfg := map[string]interface{}{
		"exporters": map[string]interface{}{
			"debug": map[string]interface{}{"verbosity": "basic"},
		},
		"service": map[string]interface{}{
			"pipelines": map[string]interface{}{
				"traces": map[string]interface{}{
					"receivers":  []interface{}{"otlp"},
					"processors": []interface{}{"batch"},
					"exporters":  []interface{}{"debug"},
				},
			},
		},
	}

	changed := ensureRoutingConnector(cfg)
	require.True(t, changed)

	svc := cfg["service"].(map[string]interface{})
	pipelines := svc["pipelines"].(map[string]interface{})

	traces := pipelines["traces"].(map[string]interface{})
	assert.Equal(t, []interface{}{asgiSpanFilterProcessor, "batch"}, traces["processors"])
	assert.Equal(t, []interface{}{routingConnectorKey}, traces["exporters"])
}

func TestMLflowCollectorExporterEndpoint(t *testing.T) {
	tests := []struct {
		name             string
		mlflowServiceURL string
		want             string
	}{
		{
			name:             "service URL with static prefix is kept as-is",
			mlflowServiceURL: "https://mlflow.redhat-ods-applications.svc:8443/mlflow",
			want:             "https://mlflow.redhat-ods-applications.svc:8443/mlflow",
		},
		{
			name:             "pathless service URL gets the static prefix appended",
			mlflowServiceURL: "https://mlflow.redhat-ods-applications.svc:8443",
			want:             "https://mlflow.redhat-ods-applications.svc:8443/mlflow",
		},
		{
			name:             "trailing slash is normalized",
			mlflowServiceURL: "https://mlflow.redhat-ods-applications.svc:8443/",
			want:             "https://mlflow.redhat-ods-applications.svc:8443/mlflow",
		},
		{
			name:             "static prefix with trailing slash is normalized",
			mlflowServiceURL: "https://mlflow.redhat-ods-applications.svc:8443/mlflow/",
			want:             "https://mlflow.redhat-ods-applications.svc:8443/mlflow",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, mlflowCollectorExporterEndpoint(tt.mlflowServiceURL))
		})
	}
}

// --- MLflow experiment management ---

// mlflowExperiment is a minimal MLflow experiment record used by the mock server.
type mlflowExperiment struct {
	ExperimentID string `json:"experiment_id"`
	Name         string `json:"name"`
}

// mockMLflow emulates the subset of the MLflow REST API used by
// ensureMLflowExperimentWithToken. The search handler is faithful to MLflow's
// parameter handling: results are filtered by name only when the request
// carries the "filter" query parameter — any other parameter name (e.g. the
// Python SDK's "filter_string") is ignored and the workspace's experiments
// are returned unfiltered.
type mockMLflow struct {
	*httptest.Server

	mu            sync.Mutex
	experiments   []mlflowExperiment
	nextID        int
	createCalls   int
	lastQuery     url.Values
	lastAuth      string
	lastWorkspace string
}

func newMockMLflow(t *testing.T, experiments ...mlflowExperiment) *mockMLflow {
	t.Helper()
	m := &mockMLflow{experiments: experiments, nextID: len(experiments)}
	m.Server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodGet && r.URL.Path == "/mlflow/api/2.0/mlflow/experiments/search":
			m.mu.Lock()
			m.lastQuery = r.URL.Query()
			m.lastAuth = r.Header.Get("Authorization")
			m.lastWorkspace = r.Header.Get("X-MLFLOW-WORKSPACE")
			filter := m.lastQuery.Get("filter")
			matched := make([]mlflowExperiment, 0)
			if filter == "" {
				// Like MLflow, an unknown filter parameter is ignored and the
				// workspace's experiments are returned unfiltered.
				matched = append(matched, m.experiments...)
			} else {
				name := strings.Trim(strings.TrimPrefix(filter, "name="), "'")
				for _, exp := range m.experiments {
					if exp.Name == name {
						matched = append(matched, exp)
					}
				}
			}
			m.mu.Unlock()
			writeTestJSON(t, w, map[string][]mlflowExperiment{"experiments": matched})

		case r.Method == http.MethodPost && r.URL.Path == "/mlflow/api/2.0/mlflow/experiments/create":
			var body struct {
				Name string `json:"name"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Errorf("invalid create experiment body: %v", err)
				http.Error(w, "invalid body", http.StatusBadRequest)
				return
			}
			m.mu.Lock()
			m.createCalls++
			m.nextID++
			id := fmt.Sprintf("%d", m.nextID)
			m.experiments = append(m.experiments, mlflowExperiment{ExperimentID: id, Name: body.Name})
			m.mu.Unlock()
			writeTestJSON(t, w, map[string]string{"experiment_id": id})

		default:
			t.Errorf("unexpected MLflow request: %s %s", r.Method, r.URL.Path)
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(m.Close)
	return m
}

func (m *mockMLflow) lastSearchQuery() url.Values {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.lastQuery
}

func (m *mockMLflow) lastRequestHeaders() (auth, workspace string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.lastAuth, m.lastWorkspace
}

func (m *mockMLflow) createCallCount() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.createCalls
}

func (m *mockMLflow) experimentNames() []string {
	m.mu.Lock()
	defer m.mu.Unlock()
	names := make([]string, 0, len(m.experiments))
	for _, exp := range m.experiments {
		names = append(names, exp.Name)
	}
	return names
}

func writeTestJSON(t *testing.T, w http.ResponseWriter, payload interface{}) {
	t.Helper()
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		t.Errorf("failed to write mock MLflow response: %v", err)
	}
}

// newTestOTelConfigManager returns a manager wired to the given MLflow base
// URL (an httptest server). The experiment helpers only need the logger,
// HTTP client, and MLflow URL.
func newTestOTelConfigManager(mlflowURL string) *otelConfigManager {
	return &otelConfigManager{
		logger:     slog.New(slog.NewTextHandler(io.Discard, nil)),
		mlflowURL:  mlflowURL,
		httpClient: http.DefaultClient,
	}
}

func TestSearchExperiment_SendsFilterParameter(t *testing.T) {
	// Regression test for RHOAIENG-101622: the search used to send the name
	// filter as "filter_string" (the Python SDK kwarg name), which the MLflow
	// REST API ignores — its field is "filter" — so the search returned the
	// first experiment in the workspace instead of filtering by name.
	srv := newMockMLflow(t,
		mlflowExperiment{ExperimentID: "2", Name: "MLflow Demo"},
		mlflowExperiment{ExperimentID: "1", Name: "pr412-split"},
	)

	m := newTestOTelConfigManager(srv.URL)
	id, err := m.searchExperiment(context.Background(), "test-project", "test-token")
	require.Error(t, err, "no experiment named %q exists, the search must not match", mlflowExperimentName)
	assert.Empty(t, id)

	query := srv.lastSearchQuery()
	require.NotNil(t, query, "the mock should have recorded a search request")
	assert.NotContains(t, query, "filter_string", "the Python SDK kwarg must not be sent — MLflow ignores it")
	assert.Equal(t, fmt.Sprintf("name='%s'", mlflowExperimentName), query.Get("filter"))
	assert.Equal(t, "1", query.Get("max_results"))

	auth, workspace := srv.lastRequestHeaders()
	assert.Equal(t, "Bearer test-token", auth)
	assert.Equal(t, "test-project", workspace)
}

func TestSearchExperiment_ReturnsMatchingExperimentID(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeTestJSON(t, w, map[string][]mlflowExperiment{"experiments": {
			{ExperimentID: "2", Name: "MLflow Demo"},
			{ExperimentID: "7", Name: mlflowExperimentName},
		}})
	}))
	t.Cleanup(srv.Close)

	m := newTestOTelConfigManager(srv.URL)
	id, err := m.searchExperiment(context.Background(), "test-project", "test-token")
	require.NoError(t, err)
	assert.Equal(t, "7", id)
}

func TestSearchExperiment_RejectsNonMatchingExperiment(t *testing.T) {
	// Defense in depth for RHOAIENG-101622: if the filter parameter were ever
	// ignored again, MLflow would return the workspace's first experiment —
	// the name check must reject it so the create path runs instead of
	// reusing an unrelated experiment's ID.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeTestJSON(t, w, map[string][]mlflowExperiment{"experiments": {
			{ExperimentID: "2", Name: "MLflow Demo"},
		}})
	}))
	t.Cleanup(srv.Close)

	m := newTestOTelConfigManager(srv.URL)
	id, err := m.searchExperiment(context.Background(), "test-project", "test-token")
	require.Error(t, err)
	assert.Empty(t, id)
	assert.Contains(t, err.Error(), mlflowExperimentName)
}

func TestEnsureMLflowExperiment_CreatesMissingExperiment(t *testing.T) {
	// Regression test for RHOAIENG-101622: a workspace that already has
	// unrelated experiments must still get a dedicated playground experiment.
	// With the old "filter_string" parameter the search behaved as
	// unfiltered, matched the first existing experiment, and the create path
	// never ran — playground traces were routed into that unrelated
	// experiment instead.
	srv := newMockMLflow(t,
		mlflowExperiment{ExperimentID: "2", Name: "MLflow Demo"},
		mlflowExperiment{ExperimentID: "1", Name: "pr412-split"},
	)

	m := newTestOTelConfigManager(srv.URL)
	id := m.ensureMLflowExperimentWithToken(context.Background(), "test-project", "test-token")
	assert.Equal(t, "3", id, "a new experiment should be created")
	assert.Equal(t, 1, srv.createCallCount())
	assert.Contains(t, srv.experimentNames(), mlflowExperimentName)
}

func TestEnsureMLflowExperiment_ReusesExistingExperiment(t *testing.T) {
	srv := newMockMLflow(t,
		mlflowExperiment{ExperimentID: "2", Name: "MLflow Demo"},
		mlflowExperiment{ExperimentID: "7", Name: mlflowExperimentName},
	)

	m := newTestOTelConfigManager(srv.URL)
	id := m.ensureMLflowExperimentWithToken(context.Background(), "test-project", "test-token")
	assert.Equal(t, "7", id)
	assert.Equal(t, 0, srv.createCallCount(), "the existing experiment must be reused, not recreated")
}

func TestEnsureMLflowExperiment_NoTokenSkips(t *testing.T) {
	m := newTestOTelConfigManager("http://unused.invalid")
	id := m.ensureMLflowExperimentWithToken(context.Background(), "test-project", "")
	assert.Empty(t, id)
}

func TestAddNamespaceRoute(t *testing.T) {
	cfg, err := parseCollectorConfig(baseGenAICollectorConfigYAML)
	require.NoError(t, err)
	ensureRoutingConnector(cfg)

	changed := addNamespaceRoute(cfg, "chrjones", "https://mlflow.test.svc:8443/mlflow/api/v1/traces", "1")
	assert.True(t, changed)

	exporters := cfg["exporters"].(map[string]interface{})
	exp, ok := exporters["otlphttp/mlflow-chrjones"].(map[string]interface{})
	require.True(t, ok, "per-namespace exporter should be created")
	assert.Equal(t, "https://mlflow.test.svc:8443/mlflow/api/v1/traces", exp["endpoint"])

	connectors := cfg["connectors"].(map[string]interface{})
	routing := connectors[routingConnectorKey].(map[string]interface{})
	table := routing["table"].([]interface{})
	require.Len(t, table, 2, "should have resource + span routing rules")
	resourceEntry := table[0].(map[string]interface{})
	assert.Equal(t, "resource", resourceEntry["context"])
	assert.Contains(t, resourceEntry["condition"], "chrjones")
	spanEntry := table[1].(map[string]interface{})
	assert.Equal(t, "span", spanEntry["context"])
	assert.Contains(t, spanEntry["condition"], "chrjones")

	svc := cfg["service"].(map[string]interface{})
	pipelines := svc["pipelines"].(map[string]interface{})
	nsPipeline, ok := pipelines["traces/chrjones"].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, []interface{}{routingConnectorKey}, nsPipeline["receivers"])
	assert.Equal(t, []interface{}{"otlphttp/mlflow-chrjones"}, nsPipeline["exporters"])
}

func TestAddNamespaceRoute_Idempotent(t *testing.T) {
	cfg, err := parseCollectorConfig(baseGenAICollectorConfigYAML)
	require.NoError(t, err)
	ensureRoutingConnector(cfg)
	addNamespaceRoute(cfg, "chrjones", "https://mlflow.svc/traces", "1")

	changed := addNamespaceRoute(cfg, "chrjones", "https://mlflow.svc/traces", "1")
	assert.False(t, changed, "re-adding same namespace should be a no-op")
}

func TestAddMultipleNamespaceRoutes(t *testing.T) {
	cfg, err := parseCollectorConfig(baseGenAICollectorConfigYAML)
	require.NoError(t, err)
	ensureRoutingConnector(cfg)
	addNamespaceRoute(cfg, "ns-alpha", "https://mlflow.svc/traces", "1")
	addNamespaceRoute(cfg, "ns-beta", "https://mlflow.svc/traces", "1")

	exporters := cfg["exporters"].(map[string]interface{})
	_, hasAlpha := exporters["otlphttp/mlflow-ns-alpha"]
	_, hasBeta := exporters["otlphttp/mlflow-ns-beta"]
	assert.True(t, hasAlpha)
	assert.True(t, hasBeta)

	connectors := cfg["connectors"].(map[string]interface{})
	routing := connectors[routingConnectorKey].(map[string]interface{})
	table := routing["table"].([]interface{})
	assert.Len(t, table, 4, "2 namespaces × 2 rules each (resource + span)")
}

func TestRemoveNamespaceRoute(t *testing.T) {
	cfg, err := parseCollectorConfig(baseGenAICollectorConfigYAML)
	require.NoError(t, err)
	ensureRoutingConnector(cfg)
	addNamespaceRoute(cfg, "chrjones", "https://mlflow.svc/traces", "1")

	removed := removeNamespaceRoute(cfg, "chrjones")
	assert.True(t, removed)

	exporters := cfg["exporters"].(map[string]interface{})
	_, exists := exporters["otlphttp/mlflow-chrjones"]
	assert.False(t, exists)

	connectors := cfg["connectors"].(map[string]interface{})
	routing := connectors[routingConnectorKey].(map[string]interface{})
	table := routing["table"].([]interface{})
	assert.Empty(t, table)

	svc := cfg["service"].(map[string]interface{})
	pipelines := svc["pipelines"].(map[string]interface{})
	_, exists = pipelines["traces/chrjones"]
	assert.False(t, exists)
}

func TestRemoveNamespaceRoute_NotPresent(t *testing.T) {
	cfg, err := parseCollectorConfig(baseGenAICollectorConfigYAML)
	require.NoError(t, err)
	ensureRoutingConnector(cfg)

	removed := removeNamespaceRoute(cfg, "nonexistent")
	assert.False(t, removed)
}

func TestRemoveOneOfMultipleRoutes(t *testing.T) {
	cfg, err := parseCollectorConfig(baseGenAICollectorConfigYAML)
	require.NoError(t, err)
	ensureRoutingConnector(cfg)
	addNamespaceRoute(cfg, "ns-alpha", "https://mlflow.svc/traces", "1")
	addNamespaceRoute(cfg, "ns-beta", "https://mlflow.svc/traces", "1")

	removeNamespaceRoute(cfg, "ns-alpha")

	exporters := cfg["exporters"].(map[string]interface{})
	_, hasAlpha := exporters["otlphttp/mlflow-ns-alpha"]
	_, hasBeta := exporters["otlphttp/mlflow-ns-beta"]
	assert.False(t, hasAlpha, "removed namespace exporter should be gone")
	assert.True(t, hasBeta, "other namespace exporter should remain")

	connectors := cfg["connectors"].(map[string]interface{})
	routing := connectors[routingConnectorKey].(map[string]interface{})
	table := routing["table"].([]interface{})
	assert.Len(t, table, 2, "only one namespace's routing rules (resource + span) should remain")
}

func TestRemoveLastRoute_CleansUpRouting(t *testing.T) {
	cfg, err := parseCollectorConfig(baseGenAICollectorConfigYAML)
	require.NoError(t, err)
	ensureRoutingConnector(cfg)
	addNamespaceRoute(cfg, "chrjones", "https://mlflow.svc/traces", "1")

	removeNamespaceRoute(cfg, "chrjones")
	assert.True(t, routingTableEmpty(cfg))
}

func TestRoutingTableEmpty(t *testing.T) {
	cfg, err := parseCollectorConfig(baseGenAICollectorConfigYAML)
	require.NoError(t, err)

	assert.True(t, routingTableEmpty(cfg), "no connectors = empty")

	ensureRoutingConnector(cfg)
	assert.True(t, routingTableEmpty(cfg), "empty table = empty")

	addNamespaceRoute(cfg, "ns1", "https://mlflow.svc/traces", "1")
	assert.False(t, routingTableEmpty(cfg), "one route = not empty")

	removeNamespaceRoute(cfg, "ns1")
	assert.True(t, routingTableEmpty(cfg), "removed all = empty again")
}

func TestParseCollectorConfig_Empty(t *testing.T) {
	cfg, err := parseCollectorConfig("")
	require.NoError(t, err)
	assert.NotNil(t, cfg)
}

func TestParseCollectorConfig_Invalid(t *testing.T) {
	_, err := parseCollectorConfig("{{invalid yaml")
	assert.Error(t, err)
}

func TestSerializeRoundTrip(t *testing.T) {
	cfg, err := parseCollectorConfig(baseGenAICollectorConfigYAML)
	require.NoError(t, err)

	serialized, err := serializeCollectorConfig(cfg)
	require.NoError(t, err)
	assert.NotEmpty(t, serialized)

	cfg2, err := parseCollectorConfig(serialized)
	require.NoError(t, err)
	assert.Equal(t, cfg, cfg2)
}

func TestCollectorNamingConventions(t *testing.T) {
	assert.Equal(t, "otlphttp/mlflow-my-ns", collectorExporterName("my-ns"))
	assert.Equal(t, "traces/my-ns", collectorPipelineName("my-ns"))
}

func TestFullLifecycle(t *testing.T) {
	cfg, err := parseCollectorConfig(baseGenAICollectorConfigYAML)
	require.NoError(t, err)

	// Add two namespaces.
	ensureRoutingConnector(cfg)
	addNamespaceRoute(cfg, "alpha", "https://mlflow.svc/traces", "1")
	addNamespaceRoute(cfg, "beta", "https://mlflow.svc/traces", "1")

	// Verify both exist.
	exporters := cfg["exporters"].(map[string]interface{})
	assert.Contains(t, exporters, "otlphttp/mlflow-alpha")
	assert.Contains(t, exporters, "otlphttp/mlflow-beta")

	// Remove alpha.
	removeNamespaceRoute(cfg, "alpha")
	assert.False(t, routingTableEmpty(cfg))
	_, hasAlpha := exporters["otlphttp/mlflow-alpha"]
	assert.False(t, hasAlpha)

	// Remove beta — routing table now empty.
	removeNamespaceRoute(cfg, "beta")
	assert.True(t, routingTableEmpty(cfg))

	// Base traces pipeline should still exist.
	svc := cfg["service"].(map[string]interface{})
	pipelines := svc["pipelines"].(map[string]interface{})
	_, ok := pipelines["traces"].(map[string]interface{})
	assert.True(t, ok, "base traces pipeline must survive full lifecycle")

	_, err = serializeCollectorConfig(cfg)
	assert.NoError(t, err)
}
