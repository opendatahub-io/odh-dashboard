package kubernetes

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"gopkg.in/yaml.v2"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mlflow"
)

const (
	otelCollectorGroup    = "opentelemetry.io"
	otelCollectorVersion  = "v1beta1"
	otelCollectorResource = "opentelemetrycollectors"

	routingConnectorKey = "routing/traces"
	defaultPipelineKey  = "traces/default"
	ingressPipelineKey  = "traces/ingress"

	collectorPatchTimeout = 15 * time.Second
	crDiscoveryTimeout    = 10 * time.Second
)

var otelCollectorGVR = schema.GroupVersionResource{
	Group:    otelCollectorGroup,
	Version:  otelCollectorVersion,
	Resource: otelCollectorResource,
}

const defaultCollectorName = "data-science-collector"

// otelConfigManager handles idempotent patching of the platform OpenTelemetryCollector CR
// to add/remove per-namespace routing connector configuration.
type otelConfigManager struct {
	dynClient          dynamic.Interface
	logger             *slog.Logger
	collectorNamespace string
	collectorName      string
	mlflowOTLPBaseURL  string // e.g. "https://mlflow.opendatahub.svc:8443" (OTLP HTTP exporter appends /v1/traces)
	mlflowTrackingURL  string // e.g. "https://mlflow.opendatahub.svc:8443/mlflow" (REST API base for experiment management)
	httpClient         *http.Client
	bearerToken        string // from kubeconfig (local dev) or SA token (in-cluster)
}

// newOTelConfigManager creates a manager using the in-cluster service account
// (or local kubeconfig for dev), following the mlflow_cr.go pattern.
//
// Discovery order for the collector CR:
//  1. If OTEL_COLLECTOR_NAMESPACE is set, use it with OTEL_COLLECTOR_NAME (or default).
//  2. Otherwise, list OpenTelemetryCollector CRs across all namespaces and use the
//     first one named "data-science-collector" (the operator-provisioned default).
//  3. If nothing is found, return nil (route management is disabled).
func newOTelConfigManager(logger *slog.Logger, cfg config.EnvConfig) (*otelConfigManager, error) {
	restCfg, err := rest.InClusterConfig()
	if err != nil {
		loadedCfg, loadErr := clientcmd.NewDefaultClientConfigLoadingRules().Load()
		if loadErr != nil {
			return nil, fmt.Errorf("failed to get cluster config (in-cluster and kubeconfig both failed): %w", loadErr)
		}
		restCfg, err = clientcmd.NewDefaultClientConfig(*loadedCfg, &clientcmd.ConfigOverrides{}).ClientConfig()
		if err != nil {
			return nil, fmt.Errorf("failed to build kubeconfig client config: %w", err)
		}
	}

	dynClient, err := dynamic.NewForConfig(restCfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client for collector patching: %w", err)
	}

	collectorNS := cfg.OTelCollectorNamespace
	collectorName := cfg.OTelCollectorName
	if collectorName == "" {
		collectorName = defaultCollectorName
	}

	if collectorNS == "" {
		collectorNS, collectorName, err = discoverCollectorCR(dynClient, logger, collectorName)
		if err != nil {
			logger.Info("OpenTelemetryCollector CR not found, trace route management disabled", "error", err)
			return nil, nil
		}
	}

	mlflowURL, err := mlflow.DiscoverMLflowURL()
	if err != nil {
		logger.Warn("MLflow CR not found, trace route management disabled", "error", err)
		return nil, nil
	}
	// The OTLP HTTP exporter appends /v1/traces automatically.
	// MLflow's OTLP ingestion endpoint is at the server root (/v1/traces),
	// not under the /mlflow path prefix, so we use the service base URL.
	// status.address.url is like "https://mlflow.opendatahub.svc:8443/mlflow"
	// but OTLP lives at "https://mlflow.opendatahub.svc:8443".
	mlflowOTLP := strings.TrimSuffix(mlflowURL, "/mlflow")
	mlflowOTLP = strings.TrimSuffix(mlflowOTLP, "/")

	// For MLflow API calls (experiment management), prefer the configured MLflowURL
	// (reachable from wherever the BFF runs, e.g. localhost via port-forward) over
	// the in-cluster service URL (only reachable from within the cluster).
	// Ensure the tracking URL includes the /mlflow path prefix.
	mlflowTracking := strings.TrimSuffix(cfg.MLflowURL, "/")
	if mlflowTracking == "" {
		mlflowTracking = strings.TrimSuffix(mlflowURL, "/")
	} else if !strings.HasSuffix(mlflowTracking, "/mlflow") {
		mlflowTracking += "/mlflow"
	}

	logger.Info("OTel config manager initialized",
		"collectorNamespace", collectorNS,
		"collectorName", collectorName,
		"mlflowOTLPBaseURL", mlflowOTLP,
		"mlflowTrackingURL", mlflowTracking,
	)

	return &otelConfigManager{
		dynClient:          dynClient,
		logger:             logger,
		collectorNamespace: collectorNS,
		collectorName:      collectorName,
		mlflowOTLPBaseURL:  mlflowOTLP,
		mlflowTrackingURL:  mlflowTracking,
		bearerToken:        restCfg.BearerToken,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, //nolint:gosec // in-cluster service-CA
			},
		},
	}, nil
}

// discoverCollectorCR lists OpenTelemetryCollector CRs across all namespaces
// and returns the namespace and name of the first one matching targetName.
func discoverCollectorCR(dynClient dynamic.Interface, logger *slog.Logger, targetName string) (string, string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), crDiscoveryTimeout)
	defer cancel()

	list, err := dynClient.Resource(otelCollectorGVR).Namespace("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return "", "", fmt.Errorf("failed to list OpenTelemetryCollector CRs: %w", err)
	}

	for _, item := range list.Items {
		if item.GetName() == targetName {
			logger.Info("auto-discovered OpenTelemetryCollector CR", "name", item.GetName(), "namespace", item.GetNamespace())
			return item.GetNamespace(), item.GetName(), nil
		}
	}

	return "", "", fmt.Errorf("no OpenTelemetryCollector CR named %q found in any namespace", targetName)
}

// EnsureRoute idempotently adds a routing connector entry, per-namespace
// exporter, and pipeline for the given namespace. If the collector CR does not
// yet have a routing connector, the base traces pipeline is restructured.
//
// This is a best-effort operation — errors are logged but not propagated so
// that the parent install flow is not blocked.
func (m *otelConfigManager) EnsureRoute(ctx context.Context, namespace string) {
	ctx, cancel := context.WithTimeout(ctx, collectorPatchTimeout)
	defer cancel()

	cr, err := m.getCollectorCR(ctx)
	if err != nil {
		m.logger.Warn("failed to get OpenTelemetryCollector CR, skipping route setup", "error", err, "namespace", namespace)
		return
	}

	collectorCfg, ok := m.extractConfig(cr)
	if !ok {
		return
	}

	experimentID := m.ensureMLflowExperiment(ctx, namespace)
	if experimentID == "" {
		m.logger.Warn("skipping collector route setup — MLflow experiment could not be created", "namespace", namespace)
		return
	}

	changed := ensureRoutingConnector(collectorCfg)
	changed = addNamespaceRoute(collectorCfg, namespace, m.mlflowOTLPBaseURL, experimentID) || changed

	if !changed {
		m.logger.Info("collector config already has route for namespace, no update needed", "namespace", namespace)
		return
	}

	if err := m.writeBackConfig(ctx, cr, collectorCfg); err != nil {
		m.logger.Warn("failed to update OpenTelemetryCollector CR", "error", err, "namespace", namespace)
		return
	}

	m.logger.Info("collector route added for namespace", "namespace", namespace)
}

// RemoveRoute removes the routing connector entry, exporter, and pipeline
// for the given namespace. If no namespace routes remain, the routing connector
// is removed and the original pipeline structure is restored.
func (m *otelConfigManager) RemoveRoute(ctx context.Context, namespace string) {
	ctx, cancel := context.WithTimeout(ctx, collectorPatchTimeout)
	defer cancel()

	cr, err := m.getCollectorCR(ctx)
	if err != nil {
		m.logger.Warn("failed to get OpenTelemetryCollector CR, skipping route removal", "error", err, "namespace", namespace)
		return
	}

	collectorCfg, ok := m.extractConfig(cr)
	if !ok {
		return
	}

	if !removeNamespaceRoute(collectorCfg, namespace) {
		m.logger.Info("no collector route found for namespace, nothing to remove", "namespace", namespace)
		return
	}

	if routingTableEmpty(collectorCfg) {
		removeRoutingConnector(collectorCfg)
	}

	if err := m.writeBackConfig(ctx, cr, collectorCfg); err != nil {
		m.logger.Warn("failed to update OpenTelemetryCollector CR after route removal", "error", err, "namespace", namespace)
		return
	}

	m.logger.Info("collector route removed for namespace", "namespace", namespace)
}

// --- K8s helpers ---

func (m *otelConfigManager) getCollectorCR(ctx context.Context) (*unstructured.Unstructured, error) {
	return m.dynClient.Resource(otelCollectorGVR).
		Namespace(m.collectorNamespace).
		Get(ctx, m.collectorName, metav1.GetOptions{})
}

// extractConfig returns the collector config as a mutable map, handling both
// v1beta1 structured config (map) and legacy string config (YAML).
func (m *otelConfigManager) extractConfig(cr *unstructured.Unstructured) (map[string]interface{}, bool) {
	spec, ok := cr.Object["spec"].(map[string]interface{})
	if !ok {
		m.logger.Warn("OpenTelemetryCollector CR has no spec field")
		return nil, false
	}

	switch cfg := spec["config"].(type) {
	case map[string]interface{}:
		return cfg, true
	case string:
		parsed, err := parseCollectorConfig(cfg)
		if err != nil {
			m.logger.Warn("failed to parse collector config YAML string", "error", err)
			return nil, false
		}
		return parsed, true
	default:
		m.logger.Warn("OpenTelemetryCollector CR spec.config has unexpected type", "type", fmt.Sprintf("%T", spec["config"]))
		return nil, false
	}
}

// writeBackConfig writes the modified config back to the CR, preserving the
// original format (structured map for v1beta1, YAML string for legacy).
func (m *otelConfigManager) writeBackConfig(ctx context.Context, cr *unstructured.Unstructured, collectorCfg map[string]interface{}) error {
	spec := cr.Object["spec"].(map[string]interface{})

	switch spec["config"].(type) {
	case string:
		serialized, err := serializeCollectorConfig(collectorCfg)
		if err != nil {
			return fmt.Errorf("failed to serialize collector config: %w", err)
		}
		spec["config"] = serialized
	default:
		spec["config"] = collectorCfg
	}

	_, err := m.dynClient.Resource(otelCollectorGVR).
		Namespace(m.collectorNamespace).
		Update(ctx, cr, metav1.UpdateOptions{})
	return err
}

// --- MLflow experiment management ---

const (
	saTokenPath          = "/var/run/secrets/kubernetes.io/serviceaccount/token"
	mlflowExperimentsAPI = "/api/2.0/mlflow/experiments"
)

// ensureMLflowExperiment creates a "Default" experiment in the given workspace
// if one doesn't exist, and returns its experiment ID. Returns "" on error,
// signalling the caller to skip route creation for this namespace.
func (m *otelConfigManager) ensureMLflowExperiment(ctx context.Context, workspace string) string {
	token := m.getAuthToken()
	if token == "" {
		m.logger.Warn("no auth token available for MLflow experiment setup")
		return ""
	}

	expID, err := m.searchExperiment(ctx, workspace, token)
	if err == nil && expID != "" {
		return expID
	}

	expID, err = m.createExperiment(ctx, workspace, token)
	if err != nil {
		m.logger.Warn("failed to create MLflow experiment", "error", err, "workspace", workspace)
		return ""
	}

	m.logger.Info("created MLflow experiment for workspace", "workspace", workspace, "experimentId", expID)
	return expID
}

// getAuthToken returns a bearer token for MLflow API calls.
// In-cluster: reads the SA token from the mounted secret (refreshed by kubelet).
// Local dev: uses the kubeconfig bearer token stored at init time.
func (m *otelConfigManager) getAuthToken() string {
	if data, err := os.ReadFile(saTokenPath); err == nil {
		return strings.TrimSpace(string(data))
	}
	return m.bearerToken
}

func (m *otelConfigManager) searchExperiment(ctx context.Context, workspace string, token string) (string, error) {
	url := fmt.Sprintf("%s%s/search?max_results=1", m.mlflowTrackingURL, mlflowExperimentsAPI)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-MLFLOW-WORKSPACE", workspace)

	resp, err := m.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("MLflow experiments search returned %d", resp.StatusCode)
	}

	var result struct {
		Experiments []struct {
			ExperimentID string `json:"experiment_id"`
		} `json:"experiments"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if len(result.Experiments) > 0 {
		return result.Experiments[0].ExperimentID, nil
	}
	return "", fmt.Errorf("no experiments found")
}

func (m *otelConfigManager) createExperiment(ctx context.Context, workspace string, token string) (string, error) {
	url := fmt.Sprintf("%s%s/create", m.mlflowTrackingURL, mlflowExperimentsAPI)

	body := strings.NewReader(`{"name":"Default"}`)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, body)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-MLFLOW-WORKSPACE", workspace)

	resp, err := m.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("MLflow experiment create returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		ExperimentID string `json:"experiment_id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	return result.ExperimentID, nil
}

// --- config parsing ---

func parseCollectorConfig(cfgYAML string) (map[string]interface{}, error) {
	var cfg map[string]interface{}
	if err := yaml.Unmarshal([]byte(cfgYAML), &cfg); err != nil {
		return nil, fmt.Errorf("invalid collector config YAML: %w", err)
	}
	if cfg == nil {
		cfg = make(map[string]interface{})
	}
	return normalizeMap(cfg), nil
}

func serializeCollectorConfig(cfg map[string]interface{}) (string, error) {
	out, err := yaml.Marshal(cfg)
	if err != nil {
		return "", err
	}
	return string(out), nil
}

// normalizeMap recursively converts map[interface{}]interface{} (from yaml.v2)
// to map[string]interface{} so that all config manipulation uses a single type.
func normalizeMap(m map[string]interface{}) map[string]interface{} {
	for k, v := range m {
		m[k] = normalizeValue(v)
	}
	return m
}

func normalizeValue(v interface{}) interface{} {
	switch val := v.(type) {
	case map[interface{}]interface{}:
		out := make(map[string]interface{}, len(val))
		for k, v2 := range val {
			out[fmt.Sprint(k)] = normalizeValue(v2)
		}
		return out
	case map[string]interface{}:
		return normalizeMap(val)
	case []interface{}:
		for i, item := range val {
			val[i] = normalizeValue(item)
		}
		return val
	default:
		return v
	}
}

// --- config manipulation (all maps are map[string]interface{}) ---

// ensureRoutingConnector creates the routing/traces connector alongside the
// operator-managed traces pipeline. The operator owns the base `traces` pipeline
// and will reconcile it back if we modify it, so we leave it untouched and add
// a parallel routing structure:
//
//   - traces/ingress receives from otlp (same receiver as `traces`) and exports
//     to routing/traces — this gives us a copy of all traces for routing.
//   - routing/traces dispatches to per-namespace pipelines (or drops if no match).
//
// The operator's `traces` pipeline continues to send all traces to Tempo as
// before — our routing adds MLflow export alongside it.
//
// Returns true if the config was modified.
func ensureRoutingConnector(cfg map[string]interface{}) bool {
	connectors := ensureMap(cfg, "connectors")
	if _, exists := connectors[routingConnectorKey]; exists {
		return false
	}

	connectors[routingConnectorKey] = map[string]interface{}{
		"default_pipelines": []interface{}{},
		"table":             []interface{}{},
	}

	// Read processors from the operator's traces pipeline so our ingress
	// pipeline applies the same enrichment (k8sattributes, etc.).
	pipelines := ensureMap(ensureMap(cfg, "service"), "pipelines")
	var originalProcessors []interface{}
	if tracesPipeline, ok := pipelines["traces"]; ok {
		if tp, ok := tracesPipeline.(map[string]interface{}); ok {
			if proc, ok := tp["processors"]; ok {
				originalProcessors = toSlice(proc)
			}
		}
	}

	ingress := map[string]interface{}{
		"receivers": []interface{}{"otlp"},
		"exporters": []interface{}{routingConnectorKey},
	}
	if len(originalProcessors) > 0 {
		ingress["processors"] = originalProcessors
	}
	pipelines[ingressPipelineKey] = ingress

	return true
}

// addNamespaceRoute adds a routing table entry, exporter, and pipeline for the
// given namespace. Returns true if entries were added (false if already present).
func addNamespaceRoute(cfg map[string]interface{}, namespace string, mlflowEndpoint string, experimentID string) bool {
	exporterName := collectorExporterName(namespace)
	pipelineName := collectorPipelineName(namespace)

	exporters := ensureMap(cfg, "exporters")
	if _, exists := exporters[exporterName]; exists {
		return false
	}

	exporters[exporterName] = map[string]interface{}{
		"endpoint": mlflowEndpoint,
		"tls": map[string]interface{}{
			"ca_file": "/var/run/secrets/kubernetes.io/serviceaccount/service-ca.crt",
		},
		"auth": map[string]interface{}{
			"authenticator": "bearertokenauth",
		},
		"headers": map[string]interface{}{
			"X-MLFLOW-WORKSPACE":     namespace,
			"x-mlflow-experiment-id": experimentID,
		},
	}

	connectors := ensureMap(cfg, "connectors")
	if routing, ok := connectors[routingConnectorKey].(map[string]interface{}); ok {
		table := toSlice(routing["table"])
		table = append(table, map[string]interface{}{
			"context":   "resource",
			"condition": fmt.Sprintf(`attributes["k8s.namespace.name"] == "%s"`, namespace),
			"pipelines": []interface{}{pipelineName},
		})
		routing["table"] = table
	}

	pipelines := ensureMap(ensureMap(cfg, "service"), "pipelines")
	pipelines[pipelineName] = map[string]interface{}{
		"receivers": []interface{}{routingConnectorKey},
		"exporters": []interface{}{exporterName},
	}

	return true
}

// removeNamespaceRoute removes the routing table entry, exporter, and pipeline
// for the given namespace. Returns true if entries were removed.
func removeNamespaceRoute(cfg map[string]interface{}, namespace string) bool {
	exporterName := collectorExporterName(namespace)
	pipelineName := collectorPipelineName(namespace)

	removed := false

	if exporters, ok := cfg["exporters"].(map[string]interface{}); ok {
		if _, exists := exporters[exporterName]; exists {
			delete(exporters, exporterName)
			removed = true
		}
	}

	if connectors, ok := cfg["connectors"].(map[string]interface{}); ok {
		if routing, ok := connectors[routingConnectorKey].(map[string]interface{}); ok {
			table := toSlice(routing["table"])
			filtered := make([]interface{}, 0, len(table))
			for _, entry := range table {
				if entryMap, ok := entry.(map[string]interface{}); ok {
					if pipelines, ok := entryMap["pipelines"]; ok {
						pSlice := toSlice(pipelines)
						if len(pSlice) == 1 && fmt.Sprint(pSlice[0]) == pipelineName {
							removed = true
							continue
						}
					}
				}
				filtered = append(filtered, entry)
			}
			routing["table"] = filtered
		}
	}

	if svc, ok := cfg["service"].(map[string]interface{}); ok {
		if pipelines, ok := svc["pipelines"].(map[string]interface{}); ok {
			if _, exists := pipelines[pipelineName]; exists {
				delete(pipelines, pipelineName)
				removed = true
			}
		}
	}

	return removed
}

// routingTableEmpty returns true if the routing connector's table has no entries.
func routingTableEmpty(cfg map[string]interface{}) bool {
	connectors, ok := cfg["connectors"].(map[string]interface{})
	if !ok {
		return true
	}
	routing, ok := connectors[routingConnectorKey].(map[string]interface{})
	if !ok {
		return true
	}
	table := toSlice(routing["table"])
	return len(table) == 0
}

// removeRoutingConnector removes the routing connector and the ingress pipeline.
// The operator-managed `traces` pipeline is left untouched.
func removeRoutingConnector(cfg map[string]interface{}) {
	if svc, ok := cfg["service"].(map[string]interface{}); ok {
		if pipelines, ok := svc["pipelines"].(map[string]interface{}); ok {
			delete(pipelines, ingressPipelineKey)
		}
	}

	if connectors, ok := cfg["connectors"].(map[string]interface{}); ok {
		delete(connectors, routingConnectorKey)
		if len(connectors) == 0 {
			delete(cfg, "connectors")
		}
	}
}

// --- naming conventions ---

func collectorExporterName(namespace string) string {
	return "otlphttp/mlflow-" + namespace
}

func collectorPipelineName(namespace string) string {
	return "traces/" + namespace
}

// --- map/slice helpers ---

func ensureMap(parent map[string]interface{}, key string) map[string]interface{} {
	if v, ok := parent[key]; ok {
		if m, ok := v.(map[string]interface{}); ok {
			return m
		}
	}
	m := make(map[string]interface{})
	parent[key] = m
	return m
}

func toSlice(v interface{}) []interface{} {
	if s, ok := v.([]interface{}); ok {
		return s
	}
	return nil
}
