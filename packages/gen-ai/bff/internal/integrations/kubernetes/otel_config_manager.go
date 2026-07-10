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
	"sync"
	"time"

	"gopkg.in/yaml.v2"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	k8stypes "k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mlflow"
)

const (
	routingConnectorKey = "routing/traces"

	collectorPatchTimeout = 15 * time.Second
	crDiscoveryTimeout    = 10 * time.Second

	// Reuse the platform collector's SA so the gen-ai collector inherits its
	// MLflow integration ClusterRoleBinding without needing additional RBAC.
	platformCollectorSAName = constants.PlatformCollectorName + "-collector"
)

// otelConfigManager creates and manages a dedicated "gen-ai-trace-collector"
// OpenTelemetryCollector CR for playground trace routing. This avoids patching
// the platform "data-science-collector" CR, whose spec.config is fully rendered
// from a Go template by an operator on reconciliation, so this avoids our changes being overwritten.
type otelConfigManager struct {
	mu                  sync.Mutex // serializes read-modify-write on the collector CR
	dynClient           dynamic.Interface
	logger              *slog.Logger
	collectorNamespace  string
	mlflowK8sServiceURL string // in-cluster K8s service URL for collector exporter, e.g. "https://mlflow.opendatahub.svc:8443"
	mlflowURL           string // URL reachable from BFF for API calls, e.g. "https://localhost:5001" or same as K8s service URL
	httpClient          *http.Client
	bearerToken         string // from kubeconfig (local dev) or SA token (in-cluster)
}

// newOTelConfigManager creates a manager that owns a dedicated gen-ai
// collector CR for playground trace routing.
//
// Namespace is auto-discovered from the platform "data-science-collector" CR.
// If not found, return nil (trace route management disabled).
//
// The manager creates/patches its own "gen-ai-trace-collector" CR in that
// namespace, avoiding conflicts with the operator-managed platform collector.
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
		return nil, fmt.Errorf("failed to create dynamic client for collector management: %w", err)
	}

	// Discover the namespace where the platform collector runs.
	// We create our own collector CR in the same namespace.
	collectorNS, _, discoverErr := discoverCollectorCR(dynClient, logger, constants.PlatformCollectorName)
	if discoverErr != nil {
		logger.Info("platform OpenTelemetryCollector CR not found, trace route management disabled", "error", discoverErr)
		return nil, nil
	}

	mlflowURL, err := mlflow.DiscoverMLflowURL()
	if err != nil {
		logger.Warn("MLflow CR not found, trace route management disabled", "error", err)
		return nil, nil
	}

	// The collector exporter always uses the in-cluster service URL.
	mlflowK8sSvc := strings.TrimSuffix(strings.TrimSuffix(mlflowURL, "/mlflow"), "/")

	mlflowBFFURL := strings.TrimSuffix(cfg.MLflowURL, "/")
	if mlflowBFFURL == "" {
		mlflowBFFURL = mlflowK8sSvc
	}

	logger.Info("OTel config manager initialized",
		"collectorNamespace", collectorNS,
		"collectorCR", constants.GenAICollectorName,
		"mlflowK8sServiceURL", mlflowK8sSvc,
		"mlflowURL", mlflowBFFURL,
	)

	return &otelConfigManager{
		dynClient:           dynClient,
		logger:              logger,
		collectorNamespace:  collectorNS,
		mlflowK8sServiceURL: mlflowK8sSvc,
		mlflowURL:           mlflowBFFURL,
		bearerToken:         restCfg.BearerToken,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{InsecureSkipVerify: cfg.InsecureSkipVerify}, //nolint:gosec // controlled by --insecure-skip-verify flag
			},
		},
	}, nil
}

// discoverCollectorCR lists OpenTelemetryCollector CRs across all namespaces
// and returns the namespace and name of the first one matching targetName.
// Used to locate the platform "data-science-collector" CR so we know which
// namespace to create our gen-ai collector CR in.
func discoverCollectorCR(dynClient dynamic.Interface, logger *slog.Logger, targetName string) (string, string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), crDiscoveryTimeout)
	defer cancel()

	list, err := dynClient.Resource(constants.OTelCollectorGVR).Namespace("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return "", "", fmt.Errorf("failed to list OpenTelemetryCollector CRs for platform collector discovery: %w", err)
	}

	for _, item := range list.Items {
		if item.GetName() == targetName {
			logger.Info("auto-discovered platform collector CR", "name", item.GetName(), "namespace", item.GetNamespace())
			return item.GetNamespace(), item.GetName(), nil
		}
	}

	return "", "", fmt.Errorf("no platform collector CR named %q found in any namespace", targetName)
}

// EnsureRoute idempotently adds a routing connector entry, per-namespace
// exporter, and pipeline for the given namespace to the gen-ai collector CR.
// Creates the CR if it doesn't exist yet.
//
// This is a best-effort operation — errors are logged but not propagated so
// that the parent install flow is not blocked.
func (m *otelConfigManager) EnsureRoute(ctx context.Context, namespace string, userToken string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	ctx, cancel := context.WithTimeout(ctx, collectorPatchTimeout)
	defer cancel()

	cr, err := m.getCollectorCR(ctx)
	if err != nil {
		m.logger.Warn("failed to get gen-ai collector CR, skipping route setup", "error", err, "namespace", namespace)
		return
	}

	collectorCfg, ok := m.extractConfig(cr)
	if !ok {
		return
	}

	// Use the user's token for MLflow experiment creation (namespace-scoped,
	// project admins have access) rather than the SA token.
	token := userToken
	if token == "" {
		token = m.getAuthToken()
	}
	experimentID := m.ensureMLflowExperimentWithToken(ctx, namespace, token)
	if experimentID == "" {
		m.logger.Warn("skipping collector route setup — MLflow experiment could not be created", "namespace", namespace)
		return
	}

	changed := ensureRoutingConnector(collectorCfg)
	changed = addNamespaceRoute(collectorCfg, namespace, m.mlflowK8sServiceURL, experimentID) || changed

	if !changed {
		m.logger.Info("collector config already has route for namespace, no patch needed", "namespace", namespace)
		return
	}

	if err := m.writeBackConfig(ctx, cr, collectorCfg); err != nil {
		m.logger.Warn("failed to patch gen-ai collector CR", "error", err, "namespace", namespace)
		return
	}

	m.logger.Info("collector route added for namespace", "namespace", namespace)
}

// RemoveRoute removes the routing connector entry, exporter, and pipeline
// for the given namespace. If no namespace routes remain, the entire gen-ai
// collector CR is deleted (it was created by EnsureRoute).
func (m *otelConfigManager) RemoveRoute(ctx context.Context, namespace string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	ctx, cancel := context.WithTimeout(ctx, collectorPatchTimeout)
	defer cancel()

	cr, err := m.fetchCollectorCR(ctx)
	if err != nil {
		if apierrors.IsNotFound(err) {
			m.logger.Info("gen-ai collector CR does not exist, nothing to remove", "namespace", namespace)
			return
		}
		m.logger.Warn("failed to get gen-ai collector CR, skipping route removal", "error", err, "namespace", namespace)
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
		if err := m.deleteCollectorCR(ctx); err != nil {
			m.logger.Warn("failed to delete gen-ai collector CR after last route removed", "error", err)
		} else {
			m.logger.Info("deleted gen-ai collector CR (no routes remain)")
		}
		return
	}

	if err := m.writeBackConfig(ctx, cr, collectorCfg); err != nil {
		m.logger.Warn("failed to patch gen-ai collector CR after route removal", "error", err, "namespace", namespace)
		return
	}

	m.logger.Info("collector route removed for namespace", "namespace", namespace)
}

// --- K8s helpers ---

// fetchCollectorCR returns the gen-ai collector CR. Returns a NotFound error
// if the CR doesn't exist (caller decides whether to create or skip).
func (m *otelConfigManager) fetchCollectorCR(ctx context.Context) (*unstructured.Unstructured, error) {
	return m.dynClient.Resource(constants.OTelCollectorGVR).
		Namespace(m.collectorNamespace).
		Get(ctx, constants.GenAICollectorName, metav1.GetOptions{})
}

// getCollectorCR returns the gen-ai collector CR, creating it if it
// doesn't exist. Used by EnsureRoute to bootstrap the collector on first use.
func (m *otelConfigManager) getCollectorCR(ctx context.Context) (*unstructured.Unstructured, error) {
	cr, err := m.fetchCollectorCR(ctx)
	if err == nil {
		return cr, nil
	}
	if !apierrors.IsNotFound(err) {
		return nil, err
	}

	m.logger.Info("creating dedicated gen-ai trace collector CR", "namespace", m.collectorNamespace, "name", constants.GenAICollectorName)
	cr = m.buildBaseCollectorCR()
	created, createErr := m.dynClient.Resource(constants.OTelCollectorGVR).
		Namespace(m.collectorNamespace).
		Create(ctx, cr, metav1.CreateOptions{})
	if createErr == nil {
		m.logger.Info("created gen-ai trace collector CR", "namespace", m.collectorNamespace)
		return created, nil
	}
	if apierrors.IsAlreadyExists(createErr) {
		m.logger.Info("gen-ai collector CR was created concurrently, re-fetching", "namespace", m.collectorNamespace)
		return m.fetchCollectorCR(ctx)
	}
	return nil, fmt.Errorf("failed to create gen-ai collector CR: %w", createErr)
}

// deleteCollectorCR removes the gen-ai collector CR entirely.
func (m *otelConfigManager) deleteCollectorCR(ctx context.Context) error {
	return m.dynClient.Resource(constants.OTelCollectorGVR).
		Namespace(m.collectorNamespace).
		Delete(ctx, constants.GenAICollectorName, metav1.DeleteOptions{})
}

// buildBaseCollectorCR returns a minimal gen-ai collector CR with an OTLP
// receiver and bearer token auth. Routes/exporters are added dynamically by
// EnsureRoute when playgrounds enable tracing.
func (m *otelConfigManager) buildBaseCollectorCR() *unstructured.Unstructured {
	return &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": constants.OTelCollectorGroup + "/" + constants.OTelCollectorVersion,
			"kind":       "OpenTelemetryCollector",
			"metadata": map[string]interface{}{
				"name":      constants.GenAICollectorName,
				"namespace": m.collectorNamespace,
			},
			"spec": map[string]interface{}{
				"mode":           "deployment",
				"replicas":       int64(1),
				"serviceAccount": platformCollectorSAName,
				"config": map[string]interface{}{
					"extensions": map[string]interface{}{
						"bearertokenauth": map[string]interface{}{
							"filename": "/var/run/secrets/kubernetes.io/serviceaccount/token",
						},
					},
					"receivers": map[string]interface{}{
						"otlp": map[string]interface{}{
							"protocols": map[string]interface{}{
								"http": map[string]interface{}{},
							},
						},
					},
					"processors": map[string]interface{}{
						"batch": map[string]interface{}{},
					},
					"service": map[string]interface{}{
						"extensions": []interface{}{"bearertokenauth"},
						"pipelines": map[string]interface{}{
							"traces": map[string]interface{}{
								"receivers":  []interface{}{"otlp"},
								"processors": []interface{}{"batch"},
								"exporters":  []interface{}{"debug"},
							},
						},
					},
					"exporters": map[string]interface{}{
						"debug": map[string]interface{}{
							"verbosity": "basic",
						},
					},
				},
			},
		},
	}
}

// extractConfig returns the collector config as a mutable map, handling both
// v1beta1 structured config (map) and legacy string config (YAML).
func (m *otelConfigManager) extractConfig(cr *unstructured.Unstructured) (map[string]interface{}, bool) {
	spec, ok := cr.Object["spec"].(map[string]interface{})
	if !ok {
		m.logger.Warn("gen-ai collector CR has no spec field")
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
		m.logger.Warn("gen-ai collector CR spec.config has unexpected type", "type", fmt.Sprintf("%T", spec["config"]))
		return nil, false
	}
}

// writeBackConfig writes the modified config back to the CR using a merge patch,
// preserving the original format (structured map for v1beta1, YAML string for legacy).
func (m *otelConfigManager) writeBackConfig(ctx context.Context, cr *unstructured.Unstructured, collectorCfg map[string]interface{}) error {
	spec, ok := cr.Object["spec"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("collector CR %q has no spec field", cr.GetName())
	}

	var configValue interface{}
	switch spec["config"].(type) {
	case string:
		serialized, err := serializeCollectorConfig(collectorCfg)
		if err != nil {
			return fmt.Errorf("failed to serialize collector config: %w", err)
		}
		configValue = serialized
	default:
		configValue = collectorCfg
	}

	// Use JSON Patch (RFC 6902) to replace spec.config entirely.
	// Merge patch cannot remove map keys (e.g., deleted exporters/pipelines),
	// so we use a "replace" operation on the whole config field instead.
	configJSON, err := json.Marshal(configValue)
	if err != nil {
		return fmt.Errorf("failed to marshal collector config: %w", err)
	}
	patchOps := []map[string]interface{}{
		{"op": "replace", "path": "/spec/config", "value": json.RawMessage(configJSON)},
	}
	patchBytes, err := json.Marshal(patchOps)
	if err != nil {
		return fmt.Errorf("failed to marshal collector patch: %w", err)
	}

	_, err = m.dynClient.Resource(constants.OTelCollectorGVR).
		Namespace(m.collectorNamespace).
		Patch(ctx, cr.GetName(), k8stypes.JSONPatchType, patchBytes, metav1.PatchOptions{})
	return err
}

// --- MLflow experiment management ---

const (
	saTokenPath          = "/var/run/secrets/kubernetes.io/serviceaccount/token"
	mlflowExperimentsAPI = "/api/2.0/mlflow/experiments"
)

// ensureMLflowExperimentWithToken creates a "Default" experiment in the given
// workspace if one doesn't exist, and returns its experiment ID. Uses the
// provided token (typically the user's token, since experiment creation is
// namespace-scoped and project admins have access). Returns "" on error,
// signalling the caller to skip route creation for this namespace.
func (m *otelConfigManager) ensureMLflowExperimentWithToken(ctx context.Context, workspace string, token string) string {
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
	url := fmt.Sprintf("%s/mlflow%s/search?max_results=1", m.mlflowURL, mlflowExperimentsAPI)

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
	url := fmt.Sprintf("%s/mlflow%s/create", m.mlflowURL, mlflowExperimentsAPI)

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
// ensureRoutingConnector adds the routing connector and rewires the base
// traces pipeline to export through it. Since this is our own dedicated
// collector CR, we own the full config and can restructure the pipeline:
//
//	traces: otlp → batch → routing/traces
//	traces/<ns>: routing/traces → otlp/http/<ns>  (added per namespace)
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

	// Rewire the base traces pipeline to export through the routing connector
	pipelines := ensureMap(ensureMap(cfg, "service"), "pipelines")
	pipelines["traces"] = map[string]interface{}{
		"receivers":  []interface{}{"otlp"},
		"processors": []interface{}{"batch"},
		"exporters":  []interface{}{routingConnectorKey},
	}

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
		// Two routing rules per namespace: "resource" matches OGX spans (namespace
		// set via OTEL_RESOURCE_ATTRIBUTES on the pod), "span" matches BFF spans
		// (namespace set as a span attribute per-request, since the BFF is a shared
		// service that can't use a static resource attribute).
		table = append(table, map[string]interface{}{
			"context":   "resource",
			"condition": fmt.Sprintf(`attributes["k8s.namespace.name"] == "%s"`, namespace),
			"pipelines": []interface{}{pipelineName},
		})
		table = append(table, map[string]interface{}{
			"context":   "span",
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
