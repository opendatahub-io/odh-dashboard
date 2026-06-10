package mlflow

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
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

const crDiscoveryTimeout = 10 * time.Second

// fetchMLflowCR retrieves the single cluster-scoped MLflow CR using the in-cluster
// Kubernetes client, falling back to the local kubeconfig for local development.
// Returns an error if zero or multiple CRs are found.
func fetchMLflowCR() (*unstructured.Unstructured, error) {
	restCfg, err := rest.InClusterConfig()
	if err != nil {
		// Not running in-cluster (local dev) — fall back to local kubeconfig
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
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), crDiscoveryTimeout)
	defer cancel()

	list, err := dynClient.Resource(MLflowGVR).List(ctx, metav1.ListOptions{Limit: 2})
	if err != nil {
		return nil, fmt.Errorf("failed to list MLflow CRs: %w", err)
	}

	if len(list.Items) == 0 {
		return nil, fmt.Errorf("no MLflow CR found in the cluster")
	}

	if len(list.Items) > 1 || list.GetContinue() != "" {
		return nil, fmt.Errorf("multiple MLflow CRs found; set MLFLOW_URL explicitly or narrow discovery criteria")
	}

	return &list.Items[0], nil
}

// DiscoverMLflowURL attempts to find the MLflow tracking URL by listing
// cluster-scoped MLflow CRs and reading status.address.url. Returns the
// in-cluster service URL when exactly one MLflow CR exists, or an error if
// zero or multiple CRs are found. This is a best-effort startup discovery.
//
// The MLflow CRD (mlflows.mlflow.opendatahub.io) is cluster-scoped, so the
// list is performed without a namespace filter.
//
// The pod's service account must have RBAC permission to list
// mlflows.mlflow.opendatahub.io at the cluster scope for auto-discovery
// to succeed.
func DiscoverMLflowURL() (string, error) {
	cr, err := fetchMLflowCR()
	if err != nil {
		return "", err
	}
	return parseAddressURL(cr)
}

// DiscoverMLflowExternalURL attempts to find the external MLflow URL by reading
// status.url from the cluster-scoped MLflow CR. This is the public-facing URL
// suitable for use in generated client code.
func DiscoverMLflowExternalURL() (string, error) {
	cr, err := fetchMLflowCR()
	if err != nil {
		return "", err
	}
	return parseExternalURL(cr)
}

// parseExternalURL extracts status.url from an unstructured MLflow CR.
func parseExternalURL(item *unstructured.Unstructured) (string, error) {
	status, ok := item.Object["status"].(map[string]any)
	if !ok {
		return "", fmt.Errorf("MLflow CR %q has no status field", item.GetName())
	}

	externalURL, ok := status["url"].(string)
	if !ok {
		return "", fmt.Errorf("MLflow CR %q has no status.url field", item.GetName())
	}
	externalURL = strings.TrimSpace(externalURL)
	if externalURL == "" {
		return "", fmt.Errorf("MLflow CR %q has empty status.url", item.GetName())
	}

	parsed, err := url.ParseRequestURI(externalURL)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return "", fmt.Errorf("MLflow CR %q has invalid status.url", item.GetName())
	}
	if parsed.User != nil {
		return "", fmt.Errorf("MLflow CR %q status.url must not include credentials", item.GetName())
	}

	return externalURL, nil
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
	if !ok {
		return "", fmt.Errorf("MLflow CR %q has no status.address.url", item.GetName())
	}
	serviceURL = strings.TrimSpace(serviceURL)
	if serviceURL == "" {
		return "", fmt.Errorf("MLflow CR %q has empty status.address.url", item.GetName())
	}

	parsed, err := url.ParseRequestURI(serviceURL)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return "", fmt.Errorf("MLflow CR %q has invalid status.address.url", item.GetName())
	}
	if parsed.User != nil {
		return "", fmt.Errorf("MLflow CR %q status.address.url must not include credentials", item.GetName())
	}

	return serviceURL, nil
}
