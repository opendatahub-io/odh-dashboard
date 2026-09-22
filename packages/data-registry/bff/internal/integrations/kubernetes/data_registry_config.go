package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"

	helper "github.com/opendatahub-io/data-registry/bff/internal/helpers"
)

// PodNamespaceEnvVar is populated via the Deployment's downward API (metadata.namespace) and
// is used to scope the ConfigMap lookup to the pod's own namespace.
const PodNamespaceEnvVar = "POD_NAMESPACE"

// ResolveDataRegistryAPIURL reads the upstream Data Registry API base URL from a ConfigMap in
// the pod's own namespace. This is a best-effort, startup-only lookup: callers should treat a
// non-nil error as "not configured yet" (e.g. because the Data Registry backend, RHAISTRAT-2381,
// has not been deployed) rather than a fatal error, and fall back to a flag/env override.
func ResolveDataRegistryAPIURL(ctx context.Context, configMapName, configMapKey string, logger *slog.Logger) (string, error) {
	namespace := os.Getenv(PodNamespaceEnvVar)
	if namespace == "" {
		return "", fmt.Errorf("%s is not set; cannot resolve namespace for ConfigMap lookup", PodNamespaceEnvVar)
	}

	kubeconfig, err := helper.GetKubeconfig()
	if err != nil {
		return "", fmt.Errorf("failed to get kubeconfig: %w", err)
	}

	clientset, err := kubernetes.NewForConfig(kubeconfig)
	if err != nil {
		return "", fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	cm, err := clientset.CoreV1().ConfigMaps(namespace).Get(ctx, configMapName, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get ConfigMap %s/%s: %w", namespace, configMapName, err)
	}

	rawURL, ok := cm.Data[configMapKey]
	if !ok || rawURL == "" {
		return "", fmt.Errorf("ConfigMap %s/%s is missing key %q", namespace, configMapName, configMapKey)
	}

	if _, err := helper.ValidateUpstreamURL(rawURL); err != nil {
		return "", fmt.Errorf("ConfigMap %s/%s key %q: %w", namespace, configMapName, configMapKey, err)
	}

	logger.Info("resolved Data Registry API URL from ConfigMap",
		slog.String("configMap", configMapName), slog.String("namespace", namespace))
	return rawURL, nil
}
