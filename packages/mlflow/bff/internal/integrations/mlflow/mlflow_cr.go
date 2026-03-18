package mlflow

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
	"k8s.io/client-go/tools/clientcmd"
)

// MLflow CRD constants for Kubernetes CR auto-discovery.
// When MLFLOW_URL is not provided, the BFF discovers the MLflow service URL
// by listing MLflow CRs in the pod namespace and reading status.address.url.
const (
	MLflowCRDGroup    = "mlflow.opendatahub.io"
	MLflowCRDVersion  = "v1"
	MLflowCRDResource = "mlflows"
)

// MLflowGVR is the GroupVersionResource for MLflow custom resources, used with the dynamic client.
var MLflowGVR = schema.GroupVersionResource{
	Group:    MLflowCRDGroup,
	Version:  MLflowCRDVersion,
	Resource: MLflowCRDResource,
}

const (
	crDiscoveryTimeout          = 10 * time.Second
	serviceAccountNamespaceFile = "/var/run/secrets/kubernetes.io/serviceaccount/namespace"
)

// DiscoverMLflowURL attempts to find the MLflow tracking URL by reading the
// MLflow CR status in the pod's own namespace. Returns the in-cluster service
// URL (status.address.url) from the first CR found, or an error if discovery
// fails. This is a best-effort operation intended for startup.
//
// The pod's service account must have RBAC permission to list mlflows.mlflow.opendatahub.io
// in its own namespace for auto-discovery to succeed.
func DiscoverMLflowURL(logger *slog.Logger) (string, error) {
	namespace, err := getPodNamespace()
	if err != nil {
		return "", fmt.Errorf("cannot determine pod namespace: %w", err)
	}

	loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
	kubeconfig, err := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, &clientcmd.ConfigOverrides{}).ClientConfig()
	if err != nil {
		return "", fmt.Errorf("failed to get kubeconfig: %w", err)
	}

	dynClient, err := dynamic.NewForConfig(kubeconfig)
	if err != nil {
		return "", fmt.Errorf("failed to create dynamic client: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), crDiscoveryTimeout)
	defer cancel()

	list, err := dynClient.Resource(MLflowGVR).Namespace(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to list MLflow CRs in namespace %q: %w", namespace, err)
	}

	if len(list.Items) == 0 {
		return "", fmt.Errorf("no MLflow CR found in namespace %q", namespace)
	}

	if len(list.Items) > 1 {
		logger.Warn("Multiple MLflow CRs found, using first",
			slog.String("namespace", namespace), slog.Int("count", len(list.Items)))
	}

	return parseAddressURL(&list.Items[0])
}

// parseAddressURL extracts status.address.url from an unstructured MLflow CR.
func parseAddressURL(item *unstructured.Unstructured) (string, error) {
	status, ok := item.Object["status"].(map[string]any)
	if !ok {
		return "", fmt.Errorf("MLflow CR %q has no status field", item.GetName())
	}

	address, ok := status["address"].(map[string]any)
	if !ok {
		return "", fmt.Errorf("MLflow CR %q has no status.address field", item.GetName())
	}

	serviceURL, ok := address["url"].(string)
	if !ok || serviceURL == "" {
		return "", fmt.Errorf("MLflow CR %q has no status.address.url", item.GetName())
	}

	return serviceURL, nil
}

func getPodNamespace() (string, error) {
	data, err := os.ReadFile(serviceAccountNamespaceFile)
	if err != nil {
		return "", err
	}
	ns := strings.TrimSpace(string(data))
	if ns == "" {
		return "", fmt.Errorf("service account namespace file is empty")
	}
	return ns, nil
}
