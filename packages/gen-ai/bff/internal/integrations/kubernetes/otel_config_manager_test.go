package kubernetes

import (
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
      processors: [batch]
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
	assert.Equal(t, []interface{}{"batch"}, traces["processors"])
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
	assert.Equal(t, []interface{}{routingConnectorKey}, traces["exporters"])
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
