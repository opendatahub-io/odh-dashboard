package kubernetes

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const baseCollectorConfigYAML = `
receivers:
  otlp:
    protocols:
      grpc: {}
      http: {}
processors:
  memory_limiter:
    check_interval: 1s
  batch: {}
  k8sattributes: {}
  resourcedetection:
    detectors: [openshift]
exporters:
  otlp/tempo:
    endpoint: tempo-simplest-distributor.redhat-ods-monitoring.svc:4317
    tls:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/service-ca.crt
    auth:
      authenticator: bearertokenauth
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, k8sattributes, resourcedetection, batch]
      exporters: [otlp/tempo]
`

func TestEnsureRoutingConnector_FirstCall(t *testing.T) {
	cfg, err := parseCollectorConfig(baseCollectorConfigYAML)
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

	// Operator-managed traces pipeline should remain untouched.
	_, hasTraces := pipelines["traces"]
	assert.True(t, hasTraces, "operator-managed traces pipeline should remain")

	// Our ingress pipeline should exist alongside it.
	ingress, ok := pipelines[ingressPipelineKey].(map[string]interface{})
	require.True(t, ok, "traces/ingress pipeline should exist")
	assert.Equal(t, []interface{}{"otlp"}, ingress["receivers"])
	assert.Equal(t, []interface{}{routingConnectorKey}, ingress["exporters"])
	assert.Equal(t, []interface{}{"memory_limiter", "k8sattributes", "resourcedetection", "batch"}, ingress["processors"])
}

func TestEnsureRoutingConnector_Idempotent(t *testing.T) {
	cfg, err := parseCollectorConfig(baseCollectorConfigYAML)
	require.NoError(t, err)

	ensureRoutingConnector(cfg)
	changed := ensureRoutingConnector(cfg)
	assert.False(t, changed, "second call should be a no-op")
}

func TestEnsureRoutingConnector_StructuredConfig(t *testing.T) {
	cfg := map[string]interface{}{
		"exporters": map[string]interface{}{
			"otlp/tempo": map[string]interface{}{"endpoint": "tempo.svc:4317"},
		},
		"service": map[string]interface{}{
			"pipelines": map[string]interface{}{
				"traces": map[string]interface{}{
					"receivers":  []interface{}{"otlp"},
					"processors": []interface{}{"batch", "k8sattributes"},
					"exporters":  []interface{}{"otlp/tempo"},
				},
			},
		},
	}

	changed := ensureRoutingConnector(cfg)
	require.True(t, changed)

	svc := cfg["service"].(map[string]interface{})
	pipelines := svc["pipelines"].(map[string]interface{})

	// Operator-managed traces pipeline must remain.
	_, hasTraces := pipelines["traces"]
	assert.True(t, hasTraces, "operator-managed traces pipeline must remain")

	// Ingress pipeline should copy processors from traces.
	ingress := pipelines[ingressPipelineKey].(map[string]interface{})
	assert.Equal(t, []interface{}{"batch", "k8sattributes"}, ingress["processors"])
}

func TestAddNamespaceRoute(t *testing.T) {
	cfg, err := parseCollectorConfig(baseCollectorConfigYAML)
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
	require.Len(t, table, 1)
	entry := table[0].(map[string]interface{})
	assert.Equal(t, "resource", entry["context"])
	assert.Contains(t, entry["condition"], "chrjones")

	svc := cfg["service"].(map[string]interface{})
	pipelines := svc["pipelines"].(map[string]interface{})
	nsPipeline, ok := pipelines["traces/chrjones"].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, []interface{}{routingConnectorKey}, nsPipeline["receivers"])
	assert.Equal(t, []interface{}{"otlphttp/mlflow-chrjones"}, nsPipeline["exporters"])
}

func TestAddNamespaceRoute_Idempotent(t *testing.T) {
	cfg, err := parseCollectorConfig(baseCollectorConfigYAML)
	require.NoError(t, err)
	ensureRoutingConnector(cfg)
	addNamespaceRoute(cfg, "chrjones", "https://mlflow.svc/traces", "1")

	changed := addNamespaceRoute(cfg, "chrjones", "https://mlflow.svc/traces", "1")
	assert.False(t, changed, "re-adding same namespace should be a no-op")
}

func TestAddMultipleNamespaceRoutes(t *testing.T) {
	cfg, err := parseCollectorConfig(baseCollectorConfigYAML)
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
	assert.Len(t, table, 2)
}

func TestRemoveNamespaceRoute(t *testing.T) {
	cfg, err := parseCollectorConfig(baseCollectorConfigYAML)
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
	cfg, err := parseCollectorConfig(baseCollectorConfigYAML)
	require.NoError(t, err)
	ensureRoutingConnector(cfg)

	removed := removeNamespaceRoute(cfg, "nonexistent")
	assert.False(t, removed)
}

func TestRemoveOneOfMultipleRoutes(t *testing.T) {
	cfg, err := parseCollectorConfig(baseCollectorConfigYAML)
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
	assert.Len(t, table, 1, "only one routing table entry should remain")
}

func TestRemoveLastRoute_CleansUpRouting(t *testing.T) {
	cfg, err := parseCollectorConfig(baseCollectorConfigYAML)
	require.NoError(t, err)
	ensureRoutingConnector(cfg)
	addNamespaceRoute(cfg, "chrjones", "https://mlflow.svc/traces", "1")

	removeNamespaceRoute(cfg, "chrjones")
	assert.True(t, routingTableEmpty(cfg))
	removeRoutingConnector(cfg)

	// Routing connector should be gone.
	_, hasConnectors := cfg["connectors"]
	assert.False(t, hasConnectors, "connectors section should be removed when empty")

	svc := cfg["service"].(map[string]interface{})
	pipelines := svc["pipelines"].(map[string]interface{})

	// Ingress pipeline should be gone.
	_, hasIngress := pipelines[ingressPipelineKey]
	assert.False(t, hasIngress, "ingress pipeline should be removed")

	// Operator-managed traces pipeline should still be there.
	traces, ok := pipelines["traces"].(map[string]interface{})
	require.True(t, ok, "operator-managed traces pipeline must remain")
	assert.Equal(t, []interface{}{"otlp"}, traces["receivers"])
	assert.Equal(t, []interface{}{"otlp/tempo"}, traces["exporters"])
}

func TestRoutingTableEmpty(t *testing.T) {
	cfg, err := parseCollectorConfig(baseCollectorConfigYAML)
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
	cfg, err := parseCollectorConfig(baseCollectorConfigYAML)
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
	cfg, err := parseCollectorConfig(baseCollectorConfigYAML)
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

	// Clean up routing.
	removeRoutingConnector(cfg)

	// Operator-managed pipeline should remain.
	svc := cfg["service"].(map[string]interface{})
	pipelines := svc["pipelines"].(map[string]interface{})
	_, ok := pipelines["traces"].(map[string]interface{})
	assert.True(t, ok, "operator-managed traces pipeline must survive full lifecycle")

	// No routing artifacts should remain.
	_, hasConnectors := cfg["connectors"]
	assert.False(t, hasConnectors)
	_, hasIngress := pipelines[ingressPipelineKey]
	assert.False(t, hasIngress)

	_, err = serializeCollectorConfig(cfg)
	assert.NoError(t, err)
}
