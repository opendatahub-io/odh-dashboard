package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
)

var dashboardConfigGVR = schema.GroupVersionResource{
	Group:    "opendatahub.io",
	Version:  "v1alpha",
	Resource: "odhdashboardconfigs",
}

const (
	dashboardConfigName         = "odh-dashboard-config"
	dashboardConfigTimeout      = 10 * time.Second
	serviceAccountNamespaceFile = "/var/run/secrets/kubernetes.io/serviceaccount/namespace"
	defaultDashboardNamespace   = "opendatahub"
)

// DashboardConfigReader reads fields from the OdhDashboardConfig CR using the
// odh-dashboard ServiceAccount.
type DashboardConfigReader struct {
	client    dynamic.Interface
	namespace string
	logger    *slog.Logger
}

// NewDashboardConfigReader creates a reader using in-cluster credentials.
// Returns an error if not running in a Kubernetes cluster.
func NewDashboardConfigReader(logger *slog.Logger) (*DashboardConfigReader, error) {
	restCfg, err := rest.InClusterConfig()
	if err != nil {
		return nil, fmt.Errorf("not running in-cluster, cannot read dashboard config: %w", err)
	}

	dynClient, err := dynamic.NewForConfig(restCfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	return &DashboardConfigReader{
		client:    dynClient,
		namespace: detectDashboardNamespace(),
		logger:    logger,
	}, nil
}

// FetchGlobalMLflowNamespaces reads the globalMLflowNamespaces field from the
// OdhDashboardConfig CR. Returns an empty slice if the field doesn't exist.
func (r *DashboardConfigReader) FetchGlobalMLflowNamespaces(ctx context.Context) ([]string, error) {
	ctx, cancel := context.WithTimeout(ctx, dashboardConfigTimeout)
	defer cancel()

	cr, err := r.client.Resource(dashboardConfigGVR).Namespace(r.namespace).Get(ctx, dashboardConfigName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get OdhDashboardConfig %s/%s: %w", r.namespace, dashboardConfigName, err)
	}

	return parseGlobalNamespaces(cr, r.logger), nil
}

// parseGlobalNamespaces extracts the globalMLflowNamespaces string array from
// an unstructured OdhDashboardConfig CR. Returns nil if absent or unexpected type.
func parseGlobalNamespaces(cr *unstructured.Unstructured, logger *slog.Logger) []string {
	spec, ok := cr.Object["spec"].(map[string]any)
	if !ok {
		logger.Debug("OdhDashboardConfig has no spec field or unexpected type")
		return nil
	}

	raw, ok := spec["globalMLflowNamespaces"]
	if !ok {
		return nil
	}

	arr, ok := raw.([]any)
	if !ok {
		logger.Warn("OdhDashboardConfig spec.globalMLflowNamespaces has unexpected type",
			slog.String("type", fmt.Sprintf("%T", raw)))
		return nil
	}

	seen := make(map[string]struct{}, len(arr))
	namespaces := make([]string, 0, len(arr))
	for _, item := range arr {
		if s, ok := item.(string); ok && strings.TrimSpace(s) != "" {
			ns := strings.TrimSpace(s)
			if _, dup := seen[ns]; !dup {
				seen[ns] = struct{}{}
				namespaces = append(namespaces, ns)
			}
		}
	}

	return namespaces
}

func detectDashboardNamespace() string {
	if data, err := os.ReadFile(serviceAccountNamespaceFile); err == nil {
		if ns := strings.TrimSpace(string(data)); ns != "" {
			return ns
		}
	}
	if ns := os.Getenv("OC_PROJECT"); ns != "" {
		return ns
	}
	return defaultDashboardNamespace
}
